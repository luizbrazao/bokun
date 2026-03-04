# Rotação de `CONVEX_SERVICE_TOKEN` (sem downtime)

Este projeto suporta rotação com dois tokens em paralelo:

- `CONVEX_SERVICE_TOKEN` (V1)
- `CONVEX_SERVICE_TOKEN_V2` (V2)

Comportamento atual:

- Backend Node usa `V2` se existir; senão usa `V1`.
- Convex aceita `V2` ou `V1` enquanto ambos estiverem configurados.

Isso permite cutover gradual sem quebrar webhooks ou chamadas internas.

## Pré-check

1. Confirme que backend e Convex estão com V1 idêntico.
2. Gere novo segredo forte para V2.
3. Tenha janela curta de observação (logs de webhook/erro).

Exemplo de geração:

```bash
openssl rand -base64 48
```

## Fase 1 — Preparar V2 (compatível)

Configurar **o mesmo valor V2** em:

1. Render (backend): `CONVEX_SERVICE_TOKEN_V2`
2. Convex (deployment): `CONVEX_SERVICE_TOKEN_V2`

Não remova V1 ainda.

Estado esperado após Fase 1:

- Backend: V2 (preferido)
- Convex: aceita V2 e V1
- Sem downtime

## Fase 2 — Observação

Monitore por 24h (ou janela adequada):

1. `401/403` em endpoints internos do backend.
2. Falhas de webhook (`failed_webhooks` crescendo).
3. Logs com `"Invalid service token"` ou `"CONVEX_SERVICE_TOKEN... not configured"`.

Se houver erro:

1. Verifique mismatch entre Render e Convex.
2. Corrija valor de V2.
3. Se necessário, remova V2 temporariamente do backend para voltar a V1.

## Fase 3 — Descomissionar V1

Após estabilidade:

1. Remova `CONVEX_SERVICE_TOKEN` do Render.
2. Remova `CONVEX_SERVICE_TOKEN` do Convex.
3. Mantenha apenas `CONVEX_SERVICE_TOKEN_V2`.

Estado final:

- Operação normal com V2 único.

## Rollback rápido

Se V2 falhar após o corte:

1. Recoloque `CONVEX_SERVICE_TOKEN` (V1) em Render e Convex.
2. Opcional: remova `V2` do backend para forçar uso de V1.
3. Validar recuperação via webhooks + logs.

## Checklist de produção

1. Token forte e único por ambiente.
2. Valores sempre idênticos entre backend e Convex.
3. Nunca expor token em frontend.
4. Nunca logar token em texto claro.
5. Revisar periodicamente (ex.: trimestral).
