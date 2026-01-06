# Documentação da API

## Autenticação
A maioria das rotas requer autenticação via Supabase Auth. O token JWT deve ser enviado no header `Authorization: Bearer <token>`.

## Endpoints

### Agendamentos

#### `GET /api/appointments`
Retorna agendamentos do usuário logado.

#### `POST /api/appointments`
Cria um novo agendamento.
- Body: `{ doctor_id, date, time, ... }`

#### `GET /api/appointments/:id`
Detalhes de um agendamento.

### Webhooks

#### `POST /api/webhooks/mercadopago`
Recebe notificações de pagamento do Mercado Pago.
- Não requer auth do usuário, validação via assinatura/busca no MP.

### Cron

#### `GET /api/cron/send-reminders`
Envia lembretes. Requer `Authorization: Bearer <CRON_SECRET>`.

#### `GET /api/cron/cancel-unpaid`
Cancela não pagos. Requer `Authorization: Bearer <CRON_SECRET>`.

## Erros
O padrão de erro segue:
\`\`\`json
{
  "error": "Mensagem de erro",
  "code": "ERROR_CODE"
}
\`\`\`
