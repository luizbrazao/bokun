# WhatsApp Select Time

## Como funciona
Após o bot listar horários (1..8), `handleSelectTime` (`src/whatsapp/handlers/selectTime.ts`) interpreta a resposta do usuário e resolve o `startTimeId` correspondente.

Fluxo:
- Extrai o primeiro número do texto do usuário.
- Valida faixa `1..8`.
- Carrega conversa por `tenantId + waUserId`.
- Valida expiração temporal do `lastOptionMap` usando `lastOptionMapUpdatedAt` (TTL de 15 minutos).
- Se expirado, faz cleanup best-effort (`clearConversationOptionMap`) antes de pedir nova listagem.
- Usa `lastOptionMap` para resolver `startTimeId`.
- Limpa `lastOptionMap` ao sucesso via `clearConversationOptionMap`.

## Por que limpar optionMap
O clear evita replay/ambiguidade: a seleção vale para a última listagem enviada, não para mensagens antigas.

## Escopo atual
Este passo apenas resolve `startTimeId`. Checkout/reserva ainda não é executado aqui.
