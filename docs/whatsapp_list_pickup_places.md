# WhatsApp List Pickup Places

## Objetivo
`handleListPickupPlaces` lista os locais de pickup para o draft atual e devolve texto + `pickupOptionMap` para o próximo turno.

## Fluxo
1. Lê `booking_draft` atual por `tenantId + waUserId`.
2. Busca detalhes da atividade e pickup places.
3. Formata resposta para WhatsApp.
4. Persiste `pickupOptionMap` em `conversations` para mapear índice -> `pickupPlaceId`.

## Por que existe pickupOptionMap
Quando o usuário responde apenas com "1", "2", etc., o bot precisa resolver de forma determinística qual `pickupPlaceId` foi escolhido.

## Próximo passo
Este passo apenas lista e persiste opções. A seleção de pickup será implementada no próximo handler.
