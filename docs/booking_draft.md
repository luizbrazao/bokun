# Booking Draft (WhatsApp)

## Por que existe booking_draft
`booking_drafts` persiste a seleção determinística do usuário (atividade, data e `startTimeId`) após escolha do índice de horário. Isso separa estado transitório de UI/conversa da intenção de reserva em progresso.

## Separação de responsabilidades
- `conversations`: guarda apenas contexto da última lista exibida (`optionMap`) para interpretar a próxima mensagem.
- `booking_drafts`: guarda o draft de reserva em andamento para os próximos passos do funil.

## Regra operacional
Após seleção válida de horário:
1. salvar/atualizar `booking_draft` com `status="draft"`;
2. limpar `optionMap` da conversa para evitar replay.
