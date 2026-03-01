# WhatsApp Select Pickup Place

## Como funciona
Após listar locais de pickup (1..8), `handleSelectPickupPlace` (`src/whatsapp/handlers/selectPickupPlace.ts`) interpreta o índice enviado pelo usuário e resolve o `pickupPlaceId` correspondente via `lastPickupOptionMap`.

## Mapeamento determinístico
- O usuário responde com um número (ex.: `2`).
- O handler valida expiração temporal do `lastPickupOptionMap` usando `lastPickupOptionMapUpdatedAt` (TTL de 15 minutos).
- Se expirado, faz cleanup best-effort (`clearConversationPickupOptionMap`) antes de pedir nova listagem.
- O handler encontra `index=2` em `lastPickupOptionMap`.
- O valor resolvido (`pickupPlaceId`) é persistido no `booking_draft`.

## Por que limpamos o pickupOptionMap
Após sucesso, `clearConversationPickupOptionMap` remove o mapa para evitar replay e ambiguidade com listas antigas.
