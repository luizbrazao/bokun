# WhatsApp List Times Handler

## Objetivo
`handleListTimes` em `src/whatsapp/handlers/listTimes.ts` monta a resposta de "listar horários" para WhatsApp usando gateway multi-tenant + normalização de availabilities.

## Input
- `tenantId`: tenant para resolver `baseUrl`/`headers` via Convex
- `activityId`: atividade Bókun
- `date`: dia solicitado (`YYYY-MM-DD`)
- `endDate` (opcional): intervalo final para consulta de availabilities (default = `date`)
- `currency` (opcional): moeda para consulta

## Output
- `text`: mensagem pronta para WhatsApp com horários numerados
- `optionMap`: mapeamento `{ index, startTimeId }` para o próximo passo da conversa

## Por que existe optionMap
Quando usuário responde "2", o bot precisa traduzir o índice para `startTimeId` de forma determinística. `optionMap` elimina ambiguidade entre texto renderizado e payload de reserva.

## Regra crítica
- Sempre filtrar pelo dia solicitado antes de mostrar horários.

## Referência Bokun
- Availabilities: https://bokun.dev/booking-api-rest/vU6sCfxwYdJWd1QAcLt12i/checking-availability-and-pricing/9x4PcziToX5g8WG4j5KMxt
