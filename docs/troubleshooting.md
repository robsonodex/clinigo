# CliniGo - Troubleshooting

> Guia de resolução de problemas comuns

---

## 🔐 Autenticação

### "Usuário não encontrado"
- Verificar se o e-mail está correto
- Verificar se a conta foi ativada
- Para clínicas: verificar se foi aprovada

### "Senha incorreta"
- Usar recuperação de senha: `/recuperar-senha`
- Token expira em 1 hora

### "Clínica pendente de aprovação"
- Super Admin precisa aprovar em `/dashboard/super/clinicas-pendentes`
- Ou aguardar pagamento via Mercado Pago

### Login de paciente não funciona
- Paciente usa CPF, não e-mail
- Portal: `/paciente`
- Verificar se tem senha cadastrada

---

## 💳 Pagamentos

### Webhook não processa
1. Verificar logs no Vercel: `vercel logs --follow`
2. Verificar URL no Mercado Pago
3. Testar com ngrok localmente
4. Verificar `MERCADOPAGO_WEBHOOK_SECRET`

### "Mercado Pago não configurado"
- Adicionar `MERCADOPAGO_ACCESS_TOKEN` no Vercel
- Fazer redeploy

### Pagamento aprovado mas clínica não ativou
- Verificar se webhook foi recebido (logs)
- Verificar `external_reference` começa com `clinic_`
- Manualmente: atualizar `approval_status` no Supabase

---

## 📧 E-mails

### E-mails não enviam
1. Verificar variáveis SMTP no Vercel
2. Para Gmail: usar senha de app (16 dígitos)
3. Verificar `SMTP_SECURE=false` para porta 587

### Erro "Invalid login"
- Gmail: ativar verificação em 2 etapas
- Gmail: gerar senha de app em myaccount.google.com

### E-mail vai para spam
- Configurar SPF/DKIM no domínio
- Usar e-mail do próprio domínio como remetente

---

## 🏗️ Build

### Build falha localmente
```bash
rm -rf .next node_modules
npm install
npm run build
```

### "Module not found"
```bash
npm install
```

### Erro de TypeScript
- Verificar erros com: `npm run lint`
- Usar `as any` para bypass temporário

---

## 🗄️ Banco de Dados

### "Row Level Security violation"
- Verificar se usuário está autenticado
- Verificar `clinic_id` do usuário
- Usar `createServiceRoleClient()` para bypass

### Tabela não existe
```sql
-- Verificar no Supabase SQL Editor
SELECT * FROM information_schema.tables 
WHERE table_name = 'nome_da_tabela';
```

### Dados não aparecem
- Verificar RLS policies
- Verificar `clinic_id` correta
- Testar via SQL Editor do Supabase

---

## 🌐 Deploy

### Deploy falha no Vercel
1. Verificar logs de build
2. Testar build local: `npm run build`
3. Verificar variáveis de ambiente

### Variáveis não funcionam
1. Adicionar no Vercel Dashboard
2. Fazer redeploy (não apenas push)
3. Prefixo `NEXT_PUBLIC_` para cliente

### 404 em rotas
- Verificar se arquivo existe em `/app`
- Limpar cache do browser
- CDN pode ter cache antigo

---

## 🎥 Telemedicina

### Daily.co não funciona
- Verificar API key
- Planos Profissional+ apenas

### Vídeo não carrega
- Verificar permissões do browser
- Testar microfone/câmera

---

## 📱 WhatsApp

### "WhatsApp não configurado"
- Requer conta Business API
- Configurar provedor (Twilio, Z-API, etc.)
- Definir variáveis de ambiente

---

## 🔄 Comandos Úteis

```bash
# Logs do Vercel
vercel logs --follow

# Build local
npm run build

# Limpar cache
rm -rf .next

# Verificar tipos
npx tsc --noEmit

# Verificar lint
npm run lint
```

---

## 📞 Suporte

Se o problema persistir:
- E-mail: suporte@clinigo.app
- WhatsApp: (21) 99040-0577
- GitHub Issues: [repo]/issues
