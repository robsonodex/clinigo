# Troubleshooting

## Problemas Comuns

### Emails não enviados
- **Sintoma**: O sistema diz que enviou, mas nada chega.
- **Causa provável**: Domínio não verificado no Resend ou caiu no SPAM.
- **Solução**: Cheque o dashboard do Resend. Se estiver em modo 'Testing', só pode enviar para o email cadastrado.

### Erro de Permissão (RLS)
- **Sintoma**: Erro 403 ou "new row violates row-level security policy".
- **Solução**: Verifique se o usuário está logado e se existe uma policy no `security.sql` permitindo a ação.

### Webhook Mercado Pago não processa
- **Sintoma**: Pagamento aprovado lá, mas aqui continua pendente.
- **Solução**: Olhe os logs do Vercel na rota `/api/webhooks/mercadopago`. Verifique se o `id` da notificação está sendo buscado corretamente.

### Login Google falha
- **Sintoma**: "redirect_uri_mismatch"
- **Solução**: Adicione a URL exata no Google Cloud Console > Credentials > OAuth 2.0.

### Cron Jobs falhando
- **Sintoma**: Status 'Failed' no Vercel.
- **Solução**: O job pode estar estourando o tempo limite (10s no plano Hobby). Otimize a query ou mude para plano Pro.
