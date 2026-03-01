# WhatsApp After Select Time

## Objetivo
`handleAfterSelectTime` é o wiring pós-seleção de horário:
1. interpreta o índice enviado pelo usuário;
2. persiste `startTimeId` no booking draft;
3. decide se deve listar pickup ou seguir adiante.

## Fluxo
- Chama `handleSelectTime` para validar/mapeiar o índice do horário.
- Se inválido, retorna erro de validação ao usuário.
- Se válido, chama `handleRouteAfterSelectTime`:
  - `check_pickup`: chama `handleListPickupPlaces` e decide:
    - `pickupOptionMap.length > 0`: envia texto de seleção + lista de pickup.
    - `pickupOptionMap.length === 0`: segue adiante sem pickup.
  - `skip_pickup`: retorna mensagem de pré-condição.

## Regra de pickup
Pickup é considerado existente quando `handleListPickupPlaces` retorna `pickupOptionMap` não vazio.
