# Persistência de OptionMap (WhatsApp)

## Por que persistimos optionMap
Após listar horários (1..8), o próximo turno do usuário costuma ser apenas um número. Persistimos `optionMap` para mapear o índice escolhido ao `startTimeId` correto sem ambiguidade.

## Regras
- Sempre sobrescrever `optionMap` a cada nova listagem de horários.
- Considerar expiração por tempo para uso somente no próximo passo da conversa.

## Onde fica
- Convex table: `conversations` (`convex/schema.ts`)
- Upsert/query: `convex/conversations.ts`
- Store client-side/server runtime: `src/whatsapp/conversationStore.ts`

## Referência Convex
- Schema: https://docs.convex.dev/database/schemas
