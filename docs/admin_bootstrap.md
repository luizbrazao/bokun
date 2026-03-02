# Bootstrap de Produção (Tenant, User e WhatsApp)

Este projeto expõe endpoints administrativos protegidos para destravar onboarding sem UI no backend API.

## Pré-requisitos

Defina no Render (serviço `bokun-bot-api`):

- `ADMIN_API_KEY` (obrigatório para endpoints `/admin/*`)
- `CONVEX_URL`
- `WHATSAPP_APP_SECRET`
- `WHATSAPP_VERIFY_TOKEN`
- `WHATSAPP_ACCESS_TOKEN` ou `META_ACCESS_TOKEN` (opcional, mas recomendado para não enviar token no body)
- `DEFAULT_WHATSAPP_PHONE_NUMBER_ID` (opcional)
- `WHATSAPP_WABA_ID` (opcional)

## 1) Criar/encontrar tenant + usuário admin

`POST /admin/bootstrap` cria (ou encontra) tenant + usuário + vínculo em `user_tenants`.

```bash
curl -sS -X POST "https://bokun-bot-api.onrender.com/admin/bootstrap" \
  -H "content-type: application/json" \
  -H "x-admin-api-key: $ADMIN_API_KEY" \
  -d '{
    "tenantName": "Minha Operadora",
    "adminEmail": "admin@minhaoperadora.com"
  }'
```

Resposta esperada (exemplo):

```json
{
  "ok": true,
  "tenantId": "jh7...",
  "userId": "k91...",
  "tenantName": "Minha Operadora",
  "alreadyExisted": false,
  "whatsappChannel": { "configured": false }
}
```

## 2) Criar/ativar canal WhatsApp

`POST /admin/whatsapp/channel` cria/atualiza `whatsapp_channels` e força `status = "active"`.

```bash
curl -sS -X POST "https://bokun-bot-api.onrender.com/admin/whatsapp/channel" \
  -H "content-type: application/json" \
  -H "x-admin-api-key: $ADMIN_API_KEY" \
  -d '{
    "tenantId": "jh7...",
    "phoneNumberId": "1009293745601026"
  }'
```

Observações:

- Se `accessToken` não for enviado no body, o endpoint usa `WHATSAPP_ACCESS_TOKEN` ou `META_ACCESS_TOKEN`.
- `wabaId` é opcional (fallback para `WHATSAPP_WABA_ID` e depois `phoneNumberId`).

Também é possível fazer tudo em uma chamada:

```bash
curl -sS -X POST "https://bokun-bot-api.onrender.com/admin/bootstrap" \
  -H "content-type: application/json" \
  -H "x-admin-api-key: $ADMIN_API_KEY" \
  -d '{
    "tenantName": "Minha Operadora",
    "adminEmail": "admin@minhaoperadora.com",
    "createWhatsappChannel": true,
    "phoneNumberId": "1009293745601026"
  }'
```

### 2.1 Verificar se o canal existe no Convex do ambiente

```bash
curl -sS "https://bokun-bot-api.onrender.com/admin/whatsapp/channel?phoneNumberId=1009293745601026" \
  -H "x-admin-api-key: $ADMIN_API_KEY"
```

Resposta esperada (exemplo):

```json
{
  "ok": true,
  "found": true,
  "channel": {
    "tenantId": "jh7...",
    "phoneNumberId": "1009293745601026",
    "status": "active"
  },
  "convexUrl": "https://...convex.cloud"
}
```

## 3) Teste webhook end-to-end

### 3.1 Verifique saúde da API

```bash
curl -sS "https://bokun-bot-api.onrender.com/health"
```

### 3.2 Envie payload assinado para `/whatsapp/webhook`

```bash
BODY='{"object":"whatsapp_business_account","entry":[{"id":"waba","changes":[{"field":"messages","value":{"messaging_product":"whatsapp","metadata":{"display_phone_number":"+5511999999999","phone_number_id":"1009293745601026"},"contacts":[{"wa_id":"34662423523"}],"messages":[{"from":"34662423523","id":"wamid.TEST123","timestamp":"1730000000","type":"text","text":{"body":"Oi"}}]}}]}]}'
SIG="sha256=$(printf '%s' "$BODY" | openssl dgst -sha256 -hmac "$WHATSAPP_APP_SECRET" -binary | xxd -p -c 256)"

curl -sS -X POST "https://bokun-bot-api.onrender.com/whatsapp/webhook" \
  -H "content-type: application/json" \
  -H "x-hub-signature-256: $SIG" \
  -d "$BODY"
```

Nos logs de produção, o caminho esperado inclui:

- `wa_webhook_incoming_message`
- `wa_channel_lookup_query`
- `wa_channel_lookup_found` (com `tenantId`) ou `wa_webhook_channel_not_found`
- `message_received`

Se `message_received` aparecer e o canal estiver ativo com token válido, a resposta do bot deve ser enviada pelo `sendWhatsAppMessage`.
