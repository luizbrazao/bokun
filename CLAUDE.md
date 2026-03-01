# CLAUDE.md - WhatsApp Bokun Bot

## Visao Geral do Projeto

Chatbot WhatsApp multi-tenant integrado ao sistema de reservas Bokun. SaaS para o marketplace Bokun, permitindo que vendors atendam clientes via WhatsApp (busca de atividades, disponibilidade, reservas, cancelamentos).

## Stack Tecnica

- **Runtime**: Node.js 18+, ES Modules, TypeScript 5.4
- **Backend/DB**: Convex (serverless functions + banco reativo)
- **WhatsApp**: Meta Cloud API (envio e recebimento)
- **Package Manager**: npm
- **Execucao de scripts**: `node --experimental-strip-types scripts/<nome>.ts`

## Estrutura do Projeto

```
src/
  bokun/           # Camada de integracao com API Bokun
    client.ts        # Cliente HTTP baixo nivel com allowlist
    bokunClient.ts   # Cliente Bokun alternativo (assinatura HMAC-SHA1)
    allowlist.ts     # Endpoints permitidos (seguranca)
    context.ts       # Resolucao de contexto multi-tenant
    gateway.ts       # Wrapper alto nivel (funcoes por tenant)
    activities.ts    # Busca/detalhes de atividades
    availabilities.ts           # Verificacao de disponibilidade
    availabilityNormalizer.ts   # Normalizacao de dados de disponibilidade
    availabilityToOptionMap.ts  # Converte availabilities em option maps
    pickupPlaces.ts  # Endpoints de pickup
    booking.ts       # Cart, reserve, confirm, cancel (Bokun booking flow)
    webhookHandler.ts # Handler de webhooks recebidos da Bokun
  whatsapp/
    webhook.ts       # Handler principal (validacao HMAC, dedup)
    router.ts        # Roteador: booking state machine -> LLM fallback
    metaClient.ts    # Envio de mensagens via Meta Cloud API
    parseMetaWebhook.ts # Parser do payload webhook da Meta
    conversationStore.ts        # Persistencia de estado de conversa
    formatAvailabilityOptions.ts # Formatacao para WhatsApp
    formatPickupPlaces.ts       # Formatacao de pickups
    handlers/        # Handlers do fluxo de reserva (state machine)
      orchestrateBooking.ts  # Orquestrador principal
      listTimes.ts           # Lista horarios disponiveis
      selectTime.ts          # Selecao de horario
      afterSelectTime.ts     # Pos-selecao
      routeAfterSelectTime.ts # Roteamento (pickup ou participantes)
      selectPickupPlace.ts   # Selecao de pickup
      afterSelectPickup.ts   # Pos-pickup
      listPickupPlaces.ts    # Lista pickups
      afterAskParticipants.ts # Contagem de participantes
      afterConfirm.ts        # Confirmacao final
      cancelBooking.ts       # Cancelamento de reserva
  llm/               # Camada de entendimento de linguagem natural (LLM)
    client.ts          # Inicializacao do cliente OpenAI (singleton)
    systemPrompt.ts    # Builder de system prompt multi-tenant
    tools.ts           # Tool definitions + executors (Bokun gateway)
    memory.ts          # Historico de conversa (Convex-backed)
    agent.ts           # Orquestrador do agente LLM (tool-call loop)
  oauth/
    handler.ts       # OAuth authorize + callback para marketplace Bokun
  convex/
    client.ts        # Inicializacao do cliente HTTP Convex
  server.ts          # Servidor HTTP (webhooks WhatsApp + Bokun, OAuth, API)

convex/              # Backend Convex (schema + mutations + queries)
  schema.ts            # Definicao do schema do banco
  tenants.ts           # CRUD de tenants
  bokunInstallations.ts # Credenciais Bokun por tenant
  whatsappChannels.ts  # Canais WhatsApp por tenant
  oauthStates.ts       # Estados OAuth para CSRF protection
  conversations.ts     # Estado de conversa
  chatMessages.ts      # Historico de mensagens do LLM (memoria)
  bookingDrafts.ts     # Ciclo de vida do booking draft (~18KB)
  bookings.ts          # Action de criacao de reserva (cart -> reserve -> confirm)
  dedup.ts             # Deduplicacao de webhooks
  cleanup.ts           # Limpeza TTL de registros antigos
  crons.ts             # Jobs agendados
  ping.ts              # Health check

docs/                # Documentacao tecnica detalhada por componente
scripts/             # Scripts de teste e demo (smoke tests, demos sem rede)
```

## Comandos Essenciais

```bash
npm run dev              # Inicia Convex dev server
npm run convex:deploy    # Deploy Convex para producao
npm run ping             # Testa conectividade com Convex
npm run demo:ttl         # Demo de TTL do option map (sem rede)

# Executar qualquer script de teste:
node --experimental-strip-types scripts/<nome>.ts
```

## Rotas HTTP do Servidor

| Metodo | Path | Funcao |
|--------|------|--------|
| POST | `/whatsapp/webhook` | Recebe mensagens WhatsApp (Meta Cloud API) |
| GET | `/whatsapp/webhook` | Verificacao de webhook (hub.challenge) |
| POST | `/bokun/webhook` | Recebe eventos da Bokun (bookings/create, update, cancel) |
| GET | `/oauth/authorize` | Inicia fluxo OAuth com Bokun (redireciona vendor) |
| GET | `/oauth/callback` | Callback OAuth - troca code por token permanente |

## Arquitetura e Padroes Criticos

### Multi-Tenant
- **`tenantId` e obrigatorio** em toda query/mutation. Nunca omitir.
- Credenciais Bokun armazenadas por tenant em `bokun_installations`.
- Canais WhatsApp vinculados por tenant em `whatsapp_channels`.
- Resolucao de tenant: `phoneNumberId` do webhook -> lookup em `whatsapp_channels` -> `tenantId`.
- Isolamento total: nenhum tenant acessa dados de outro.

### Fluxo de Mensagem WhatsApp (ponta a ponta)
```
Meta Cloud API -> POST /whatsapp/webhook
  -> Validar HMAC (X-Hub-Signature-256, META_APP_SECRET)
  -> Parsear payload Meta (parseMetaWebhook)
  -> Ignorar status updates (delivery/read receipts)
  -> Resolver tenant via phoneNumberId (whatsapp_channels)
  -> Claim dedup (rejeitar duplicatas)
  -> orchestrateBooking()
    -> Verificar intent de cancelamento
    -> Carregar booking_draft do usuario
    -> Rotear para handler baseado em nextStep
    -> Handler consulta Bokun via gateway
    -> Atualizar booking_draft
  -> Se handled: false -> runLLMAgent()
    -> Carregar historico de conversa (chat_messages)
    -> Construir system prompt + tools
    -> OpenAI Chat Completion (com tool calling)
    -> Executar tools Bokun se solicitado
    -> Salvar mensagens no historico
  -> Enviar resposta via Meta Cloud API (sendWhatsAppMessage)
```

### State Machine de Booking
O fluxo de reserva e uma maquina de estados deterministica via `booking_drafts.nextStep`:
```
(sem draft) -> "select_time" -> "select_pickup" | "ask_participants" 
  -> "ask_booking_questions" -> "collect_booking_answers" -> "confirm" -> (confirmed)
```
- Se `pickupSelectionType == "UNAVAILABLE"`, pula direto para `ask_participants`.
- Após `ask_participants`, busca perguntas da Bokun. Se existirem, vai para `ask_booking_questions`. Senão, pula para `confirm`.
- `ask_booking_questions` apresenta a primeira pergunta e avança para `collect_booking_answers`.
- `collect_booking_answers` valida respostas (TEXT, NUMBER, DATE, BOOLEAN, SELECT), armazena em `bookingAnswers` (JSON), e apresenta próxima pergunta ou avança para `confirm`.
- Intent "cancelar" pode ser acionado a qualquer momento.


### Fluxo de Booking na Bokun (cart -> reserve -> confirm)
```
1. POST /shopping-cart.json/session/{sessionId}/activity  (adiciona ao carrinho)
2. POST /booking.json/guest/{sessionId}/reserve?paymentParameters=RESERVE_FOR_EXTERNAL_PAYMENT  (reserva por ~30min)
3. POST /booking.json/{confirmationCode}/confirm  (confirma a reserva)
```

### Option Maps (padrao critico)
- Traduzem a resposta numerica do usuario (ex: "2") para o payload correto sem re-consultar Bokun.
- Armazenados no `booking_draft` com TTL de 15 minutos.
- Formato: `{ kind: "time_options_v1", options: [{ optionId, availabilityId, startTimeId, ... }] }`
- Pickup option maps seguem padrao similar.

### Deduplicacao de Webhooks
- Chave primaria: `wa:{messageId}` do payload.
- Fallback: `wa:hash:{SHA256(tenantId + waUserId + body)}`.
- TTL: 7 dias (limpeza via cron `cleanupWebhookDedup`).
- Usa mutation "claim" atomica para prevenir processamento duplicado.

### Allowlist de Endpoints Bokun
- `src/bokun/allowlist.ts` define endpoints permitidos.
- `assertBokunEndpointAllowed(method, path)` valida antes de toda requisicao via `client.ts`.
- Qualquer endpoint fora da lista causa throw. Nunca burlar.

### OAuth (Marketplace Bokun)
- Authorization Code Flow: `/oauth/authorize` -> Bokun -> `/oauth/callback`
- Token permanente (sem refresh necessario)
- State nonce para CSRF protection (tabela `oauth_states`, TTL 10min)
- Callback cria tenant + bokun_installation automaticamente

### Autenticacao Bokun
Duas formas:
1. **HMAC-SHA1** (API keys): `date + accessKey + METHOD + pathWithQuery` -> Headers: X-Bokun-Date, X-Bokun-AccessKey, X-Bokun-Signature
2. **OAuth Bearer** (marketplace): Header `Authorization: Bearer {access_token}`

### Webhooks Bokun
- Endpoint: `POST /bokun/webhook`
- Validacao: `Base64(HMAC-SHA256(app_secret, request_body))` vs `x-bokun-hmac`
- Timeout: 5 segundos (responder rapido!)
- Topicos: `bookings/create`, `bookings/update`, `bookings/cancel`, `apps/uninstall`

## Tabelas do Banco (Convex)

| Tabela | Finalidade | Index principal |
|--------|-----------|-----------------|
| `tenants` | Registro de vendors | - |
| `bokun_installations` | Credenciais API por tenant | `by_tenantId` |
| `whatsapp_channels` | Canais WhatsApp por tenant | `by_phoneNumberId`, `by_tenantId` |
| `conversations` | Estado de conversa (option maps transientes) | `by_tenantId_waUserId` |
| `chat_messages` | Historico de mensagens do LLM | `by_tenantId_waUserId`, `by_createdAt` |
| `booking_drafts` | Estado do fluxo de reserva | `by_tenantId_waUserId` |
| `webhook_dedup` | Idempotencia de webhooks | `by_tenantId_key`, `by_createdAt` |
| `oauth_states` | CSRF protection para OAuth | `by_state` |

## Seguranca

- **WhatsApp Webhook HMAC**: Validacao SHA256 com `timingSafeEqual()`. Header: `X-Hub-Signature-256`.
- **Bokun Webhook HMAC**: Validacao SHA256 Base64. Header: `x-bokun-hmac`.
- **Allowlist**: Endpoints Bokun estritamente controlados em `allowlist.ts`.
- **Isolamento multi-tenant**: Toda operacao filtrada por `tenantId`.
- **Dedup**: Previne replay e processamento duplicado.
- **OAuth CSRF**: State nonce validado no callback.

## Convencoes de Codigo

- Usar ES Modules (`import/export`, nao `require`).
- Timezone padrao para disponibilidades: `Europe/Madrid`.
- Funcoes do gateway seguem padrao `bokun<Acao>ForTenant(tenantId, ...params)`.
- Handlers retornam `{ ok?: boolean, text: string, handled?: boolean }`.
- Mutations/queries Convex sempre recebem `tenantId` como argumento.
- Dependency injection via `*WithDeps` pattern (ex: `handleAfterConfirmWithDeps`).
- Scripts de demo/teste ficam em `scripts/` e sao executados com `--experimental-strip-types`.

## Variaveis de Ambiente

```bash
# Convex
CONVEX_URL=              # URL do backend Convex
CONVEX_SITE_URL=         # URL do site Convex
CONVEX_DEPLOYMENT=       # ID do deployment

# Bokun
BOKUN_BASE_URL=          # https://api.bokun.io (prod) ou https://api.bokuntest.com (sandbox)
BOKUN_ACCESS_KEY=        # Chave de acesso (HMAC auth)
BOKUN_SECRET_KEY=        # Chave secreta (HMAC auth)

# OAuth (Marketplace Bokun)
BOKUN_APP_CLIENT_ID=     # API key do app no marketplace
BOKUN_APP_CLIENT_SECRET= # API secret do app
BOKUN_OAUTH_REDIRECT_URI= # URL de callback OAuth
BOKUN_OAUTH_SCOPES=      # Escopos (default: "bookings activities")

# WhatsApp (Meta Cloud API)
META_APP_SECRET=         # Secret para validacao HMAC de webhooks
WHATSAPP_VERIFY_TOKEN=   # Token para verificacao de webhook (GET)

# OpenAI (LLM Agent) — fallback global; cada tenant configura sua propria key
OPENAI_API_KEY=          # Chave fallback (opcional se tenants configuram suas proprias)
OPENAI_MODEL=gpt-4o-mini # Modelo fallback (default: gpt-4o-mini)

# Servidor
PORT=3000                # Porta do servidor HTTP
```

## Endpoints Bokun Integrados (Allowlist)

```
# Discovery
POST /activity.json/search
GET  /activity.json/{id}
GET  /activity.json/{id}/availabilities
GET  /activity.json/{id}/pickup-places

# Shopping cart
POST /shopping-cart.json/session/{sessionId}/activity
GET  /shopping-cart.json/session/{sessionId}

# Booking (reserve & confirm)
POST /booking.json/guest/{sessionId}/reserve
POST /booking.json/{confirmationCode}/confirm
GET  /booking.json/{confirmationCode}/abort-reserved
GET  /booking.json/booking/{confirmationCode}

# Cancel
POST /booking.json/cancel-booking/{confirmationCode}
```

## Documentacao Existente

Cada componente tem doc detalhada em `docs/`:
- `PRD.md` - Requisitos do produto (portugues)
- `booking_draft.md` - Padrao de booking draft
- `conversation_optionmap.md` - Conceito de option maps
- `bokun_endpoints_allowlist.md` - Endpoints permitidos
- `bokun_gateway.md` - Camada de gateway
- Docs por handler: `whatsapp_list_times.md`, `whatsapp_select_time.md`, etc.

## Referencia da API Bokun

Documentacao completa: https://bokun.dev/getting-started/rdxN2oggx1PcdUZtW5gGJ4/introduction/uFNGUWatMLfUGuiLoAU7ez
Swagger: https://api-docs.bokun.dev/rest-v1

## Chatbot Web Existente (n8n - Referencia)

Existe um chatbot web funcional em n8n (`docs/n8n_chatbot_web_reference.json`) que serve como referencia:
- **Stack**: n8n + GPT-4o + Pinecone (RAG) + Bokun tools
- **Persona**: "Sara" da Sondevela (Barcelona, catamaras)
- **Tools Bokun usadas**:
  - `consultar_disponibilidade`: recebe barco, data (YYYY-MM-DD), horas, pessoas -> retorna horarios + precos + link de reserva
  - `consultar_detalhes_reserva`: recebe telefone ou bookingId -> retorna detalhes da reserva
- **Fluxo**: chat trigger -> session management -> AI Agent com tools -> resposta
- **Memoria**: Simple Memory (buffer window por sessionId)
- O chatbot web usa links de reserva pre-preenchidos do site sondevela.com

O bot WhatsApp deste projeto segue a mesma logica de negocio mas com fluxo deterministico (state machine) ao inves de LLM, para maior previsibilidade em reservas.

## OpenAI API Key por Tenant

Cada tenant configura sua propria chave OpenAI nas configuracoes (Settings > IA).
- Campos na tabela `tenants`: `openaiApiKey` (opcional), `openaiModel` (opcional, default: gpt-4o-mini)
- `src/llm/client.ts`: factory `getOpenAIClientForKey(apiKey)` com cache por key
- `src/llm/agent.ts`: busca key do tenant via Convex, fallback para env var `OPENAI_API_KEY`
- Se tenant nao tem key configurada, retorna mensagem pedindo configuracao
- Frontend: aba "IA" em Settings com campo de API key e seletor de modelo

## Itens Pendentes

- ~~Integracao com LLM para entendimento de linguagem natural (como o chatbot web)~~ ✅
- ~~Booking questions schema (perguntas pre-reserva)~~ ✅
- ~~Fluxo de edicao de reserva (edit booking)~~ ✅
- ~~Dashboard/painel admin para vendors~~ ✅ (parcial)
- ~~Handoff para operador humano~~ ✅
- ~~OpenAI API Key por tenant~~ ✅
- Deploy em producao (Railway/Fly.io/Render)
