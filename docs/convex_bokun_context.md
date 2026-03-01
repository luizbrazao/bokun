# Convex Bokun Context (V1)

## Objetivo
`BokunContext` é a fonte de verdade multi-tenant para integração com Bókun. Ele centraliza `baseUrl` e `headers` por `tenantId`, evitando configuração espalhada no código e reduzindo risco de usar credenciais do tenant errado.

## Fonte de verdade
- Tabela Convex: `bokun_installations`
- Resolver: `getBokunContext({ tenantId })` em `convex/bokunInstallations.ts`
- Retorno:
  - `{ baseUrl, headers }` quando existe instalação
  - `null` quando o tenant ainda não configurou instalação

## Regra de uso para src/bokun/*
Módulos em `src/bokun/*` devem receber `baseUrl` e `headers` somente a partir de `getBokunContext`. Não devem adivinhar domínio, ler fallback implícito ou montar credenciais internamente.

## Exemplo (pseudo-código)
```ts
const ctx = await convex.query(api.bokunInstallations.getBokunContext, { tenantId });
if (!ctx) {
  throw new Error("Tenant sem instalação Bokun");
}

const data = await searchActivities({
  baseUrl: ctx.baseUrl,
  headers: ctx.headers,
  body: { page: 1, pageSize: 20 },
});
```
