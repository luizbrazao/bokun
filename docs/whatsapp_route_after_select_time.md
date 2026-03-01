# WhatsApp Route After Select Time

## Regra de roteamento
Após o usuário selecionar horário, o sistema decide entre:
- `check_pickup`
- `skip_pickup`

Esse handler **não faz fetch da Bókun**. Ele só valida pré-condição do draft.

## Fluxo
1. Lê `booking_draft` por `tenantId + waUserId`.
2. Se faltar `activityId`, `date` ou `startTimeId`, retorna `skip_pickup` com mensagem de pré-condição.
3. Se o draft estiver completo, retorna `check_pickup` com mensagem de transição.
