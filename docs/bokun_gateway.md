# Bokun Gateway Rules

## Regras
- Ninguém chama `src/bokun/activities.ts` diretamente em código de app.
- Somente o gateway resolve contexto por tenant via Convex:
  - `getBokunContextOrThrow({ tenantId })` em `src/bokun/context.ts`
  - gateway em `src/bokun/gateway.ts`
- Chamadas Bokun no app devem passar por:
  - `bokunSearchActivitiesForTenant(...)`
  - `bokunGetActivityByIdForTenant(...)`
  - `bokunGetAvailabilitiesForTenant(...)`
  - `bokunGetPickupPlacesForTenant(...)`

## Motivo
O gateway evita bypass de `baseUrl`/`headers`, garante resolução multi-tenant centralizada e reduz risco de usar credenciais erradas.

## Availability normalization rule
- Sempre filtrar availabilities pelo dia solicitado antes de mostrar horários.
- Exibir no máximo 8 opções por resposta.
- Usar timezone de exibição `Europe/Madrid` quando aplicável.

## Exemplo
```ts
const activities = await bokunSearchActivitiesForTenant({
  tenantId,
  body: { page: 1, pageSize: 20 },
});

const activity = await bokunGetActivityByIdForTenant({
  tenantId,
  id: 123,
});

const availabilities = await bokunGetAvailabilitiesForTenant({
  tenantId,
  id: 123,
  start: "2026-02-16",
  end: "2026-02-28",
  currency: "USD",
});

const pickupPlaces = await bokunGetPickupPlacesForTenant({
  tenantId,
  id: 123,
});
```
