# PRD - WhatsApp Chatbot + Bókun (Multi-tenant)

## 1) Visão do produto
Produto SaaS multi-tenant para automatizar atendimento e reservas via WhatsApp de empresas que operam no Bókun, cobrindo descoberta de experiências, cotação, pré-reserva, checkout e pós-venda, com fallback para operador humano quando necessário e sincronização por webhooks para manter status, disponibilidade e pagamentos atualizados em tempo quase real.

## 2) Usuários e cenários
- Cliente final (WhatsApp): busca passeios, consulta preço/disponibilidade, responde perguntas obrigatórias, conclui reserva e recebe confirmação/voucher.
- Operador humano (atendimento): assume conversas com baixa confiança, corrige dados de reserva, executa cancelamento/edição quando solicitado.
- Admin do vendor (empresa no Bókun): conecta conta via OAuth, define catálogo ativo no bot, monitora conversões, falhas e SLA de atendimento.

## 3) Endpoints (fonte da verdade) e capacidades do bot (V1)
A) Booking API (REST) — Produtos e disponibilidade
- `POST /activity.json/search`  (listar atividades)
- `GET /activity.json/{id}`     (detalhes da atividade)

B) Demais endpoints
- availability e pricing: (pendente: endpoint não fornecido ainda)
- checkout e confirmação / reserva-para-pagamento-externo: (pendente: endpoint não fornecido ainda)
- cart: (pendente: endpoint não fornecido ainda)
- booking questions e answers (questions schema): (pendente: endpoint não fornecido ainda)
- edit booking: (pendente: endpoint não fornecido ainda)
- cancel booking: (pendente: endpoint não fornecido ainda)
- webhook endpoint + HMAC: (pendente: endpoint não fornecido ainda)
- webhook events (booking/payment/refund/availability): (pendente: endpoint não fornecido ainda)
- OAuth authorize/token: (pendente: endpoint não fornecido ainda)
- error codes: (pendente: endpoint não fornecido ainda)

## 4) Mapa de dados multi-tenant
Entidades mínimas:
- `tenants`
  - `id`, `vendor_id`, `vendor_name`, `domain`, `status`, `created_at`
- `oauth_installations`
  - `tenant_id`, `access_token_encrypted`, `refresh_token_encrypted`, `expires_at`, `scopes[]`, `token_type`, `installed_at`, `revoked_at`
- `whatsapp_channels`
  - `tenant_id`, `provider`, `phone_number_id`, `webhook_secret_ref`, `status`
- `conversations`
  - `tenant_id`, `wa_user_id`, `session_state`, `language`, `last_intent`, `handoff_flag`, `updated_at`
- `booking_sessions`
  - `tenant_id`, `conversation_id`, `activity_id`, `start_date`, `start_time_id`, `pax_payload`, `extras_payload`, `checkout_uuid`, `booking_id`, `status`
- `events_inbox` (idempotência de webhooks)
  - `tenant_id`, `source`, `event_id`, `event_type`, `payload_hash`, `received_at`, `processed_at`, `status`
- `audit_logs`
  - `tenant_id`, `actor`, `action`, `resource_type`, `resource_id`, `metadata`, `created_at`

Relações-chave:
- `tenant_id` obrigatório em todas as tabelas operacionais.
- `vendor_id + domain` identificam a instalação no Bókun.
- Tokens, escopos e estado de conversa são isolados por tenant.

## 5) Arquitetura sugerida (alto nível)
Fluxo principal:
1. WhatsApp Provider envia mensagem para webhook de entrada.
2. Orquestrador identifica `tenant` e estado da conversa.
3. Orquestrador consulta Bókun (produtos/disponibilidade/questions/checkout).
4. Resposta é enviada ao usuário no WhatsApp.
5. Webhooks Bókun atualizam status de booking/pagamento/disponibilidade.

Componentes:
- Camada de entrada: webhook WhatsApp + autenticação + roteamento multi-tenant.
- Orquestrador: regras de diálogo, validação de payload, chamadas Bókun, fallback humano.
- Persistência: estado conversacional, sessões de booking, tokens OAuth, auditoria.
- Saída: WhatsApp send API do provider.

Onde entram Convex / n8n / Python:
- Convex ou Supabase: banco + estado + logs + tokens.
- n8n ou Python: automações e orquestração dos fluxos.
- Python/LangChain (opcional): camada de entendimento de linguagem e policy guardrails.

## 6) Decisões técnicas
### 6.1 Convex vs Supabase (tokens + estado de conversa + logs)
Convex (prós):
- Reatividade nativa e modelo orientado a funções.
- Boa experiência para estado em tempo real.

Convex (contras):
- Menor familiaridade do mercado para operações SQL, BI e compliance tradicional.
- Menos flexível para integrações SQL legadas e auditoria avançada.

Supabase (prós):
- Postgres padrão, RLS, auditoria e consultas analíticas mais diretas.
- Ecossistema maduro para multi-tenant, observabilidade e backup.
- Facilidade para segregar dados por `tenant_id` e integrar com ferramentas externas.

Supabase (contras):
- Reatividade menos opinada que Convex.
- Exige mais desenho manual para alguns fluxos em tempo real.

Recomendação V1:
- **Supabase** para armazenamento de tokens, estado de conversa, sessões de checkout e logs de auditoria.
- Motivo: previsibilidade operacional, segurança e facilidade de governança multi-tenant no MVP.

### 6.2 n8n vs Python/LangChain (orquestração vs cérebro)
n8n (prós):
- Time-to-market rápido para integrações e fluxos declarativos.
- Boa visibilidade de automações por operação.

n8n (contras):
- Fluxos complexos de conversa ficam difíceis de versionar/testar.
- Risco de crescimento de débito técnico em regras condicionais.

Python/LangChain (prós):
- Controle fino de regras, testes automatizados e tratamento de erro.
- Melhor para política de fallback, idempotência e multi-tenant rigoroso.
- Evolução gradual de regras determinísticas para NLU/LLM.

Python/LangChain (contras):
- Implementação inicial mais lenta que n8n.
- Exige engenharia de observabilidade e operações desde o início.

Recomendação V1:
- **Python (orquestrador principal) sem dependência obrigatória de LangChain no início**.
- Usar n8n apenas para tarefas de backoffice não críticas (alertas internos, rotinas operacionais).

## 7) Segurança
- Endpoint allowlist: ver `docs/bokun_endpoints_allowlist.md`. Qualquer endpoint fora da allowlist é proibido.
- Runtime allowlist enforcement no código: `src/bokun/allowlist.ts` via `assertBokunEndpointAllowed(...)`.
- OAuth:
  - Implementar Authorization Code Flow via `authorize` + `token`.
  - Validar `state` por tenant para prevenir CSRF.
  - Validar assinatura/HMAC do callback conforme documentação OAuth da Bókun.
- Webhooks Bókun:
  - Verificar HMAC de cada evento antes de processar payload.
  - Rejeitar assinatura inválida com `401/403`.
- Tokens:
  - Criptografia em repouso (`access_token`, `refresh_token`).
  - Rotação de segredos e política de menor privilégio.
  - Nunca registrar token em logs.
- Isolamento multi-tenant:
  - RLS e filtros obrigatórios por `tenant_id`.
  - Chaves de webhook segregadas por tenant.
- Privacidade (LGPD/GDPR):
  - Minimização de dados pessoais.
  - Política de retenção e descarte.
  - Base legal, trilha de auditoria e suporte a solicitação de exclusão.

### 7.1 Riscos e mitigações
- Risco: uso de token de tenant errado.
  - Mitigação: chaveamento estrito por `tenant_id + vendor_id`, testes de isolamento e auditoria.
- Risco: fraude/replay em webhooks.
  - Mitigação: validação HMAC, idempotência por `event_id`, janela de tolerância temporal.
- Risco: expiração/revogação de token OAuth.
  - Mitigação: refresh proativo, retry com backoff e fila de reautorização do admin.
- Risco: rate limit e indisponibilidade de API.
  - Mitigação: circuit breaker, retry exponencial, cache curto para discovery e fallback humano.
- Risco: vazamento de PII em logs.
  - Mitigação: mascaramento de campos sensíveis e segregação de logs de segurança.
- Risco: resposta incorreta do bot em contexto de reserva.
  - Mitigação: regras determinísticas para passos críticos (preço, checkout, cancelamento) e handoff obrigatório em baixa confiança.

## 8) Escopo V1 (MVP) e critérios de sucesso
Escopo funcional mínimo:
- Onboarding do vendor com OAuth e armazenamento seguro de tokens/scopes.
- Fluxo WhatsApp de ponta a ponta para:
  - descoberta (produto + disponibilidade + preço),
  - coleta de dados essenciais,
  - checkout e confirmação de reserva.
- Pós-venda mínimo:
  - consulta de status,
  - cancelamento de reserva.
- Ingestão de webhooks principais:
  - booking e payment, além de `availability_update`.
- Painel admin mínimo:
  - status de instalação OAuth,
  - últimas conversas e erros operacionais.

Critérios de sucesso (V1):
- >= 70% das conversas resolvidas sem operador humano para intents de discovery/reserva.
- Tempo médio de resposta do bot <= 5s em operações sem fallback.
- Taxa de erro técnico em checkout < 3%.
- 100% dos webhooks válidos processados com idempotência.

## 9) Fora de escopo (por enquanto)
- Suporte completo a OCTO API como canal principal de booking (manter apenas avaliação para roadmap).
- Motor avançado de recomendação com personalização comportamental.
- Billing complexo por usage/tenant com múltiplos planos e invoice automation.
- Marketplace multicanal além de WhatsApp (Instagram, Telegram etc.).
- Remarcação totalmente self-service para todos os produtos sem validação humana.

## 10) Perguntas em aberto
1. Quais provedores de WhatsApp serão suportados no V1 (Meta Cloud API direta, Twilio, Gupshup, etc.)?
2. Qual política exata para fluxo de pagamento externo por tenant (quem confirma pagamento e em que evento)?
3. Quais escopos mínimos obrigatórios para onboarding sem bloquear operações essenciais?
4. Quais tipos de produto/atividade terão suporte no V1 (tours, rentals, combos)?
5. Como será o SLA de handoff humano e qual ferramenta de operador será usada no início?
6. Qual janela de retenção de PII por tenant para LGPD/GDPR e auditoria?
7. O envio de voucher no WhatsApp será link, PDF ou template de mensagem com mídia?
