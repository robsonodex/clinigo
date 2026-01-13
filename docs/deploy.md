# CliniGo - Guia de Deploy

> **Produção:** https://clinigo.app
> **Plataforma:** Vercel
> **Banco:** Supabase

---

## 🚀 Deploy Rápido

```bash
cd d:\clinigo\app
vercel --prod
```

---

## 📋 Pré-requisitos

### Contas Necessárias
- [x] Vercel (hospedagem)
- [x] Supabase (banco de dados)
- [ ] Mercado Pago (pagamentos)
- [ ] Provedor SMTP (e-mails)

### Ferramentas Locais
- Node.js 18+
- npm ou yarn
- Vercel CLI (`npm i -g vercel`)

---

## 🔧 Configuração Inicial

### 1. Clonar e Instalar

```bash
git clone [repo]
cd clinigo/app
npm install
```

### 2. Configurar Variáveis Locais

Criar `.env.local`:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Mercado Pago (opcional para dev)
MERCADOPAGO_ACCESS_TOKEN=TEST-xxx
MERCADOPAGO_WEBHOOK_SECRET=xxx

# SMTP (opcional para dev)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=seu-email@gmail.com
SMTP_PASSWORD=xxxx-xxxx-xxxx-xxxx
SMTP_FROM_NAME=CliniGo
SMTP_FROM_EMAIL=noreply@clinigo.app
SMTP_SECURE=false

# Admin
SUPER_ADMIN_EMAIL=seu-email@gmail.com
```

### 3. Rodar Local

```bash
npm run dev
# Acesse http://localhost:3000
```

### 4. Build de Teste

```bash
npm run build
# Deve completar sem erros
```

---

## 🌐 Deploy para Produção

### Via CLI

```bash
# Primeiro deploy (configura projeto)
vercel

# Deploys subsequentes
vercel --prod
```

### Via GitHub (Recomendado)

1. Push para branch `main`
2. Vercel faz deploy automático
3. Verificar em vercel.com/dashboard

---

## ⚙️ Variáveis de Ambiente (Vercel)

### Obrigatórias

| Variável | Valor |
|----------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL do Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Chave anônima |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave de serviço |
| `NEXT_PUBLIC_APP_URL` | `https://clinigo.app` |

### Para E-mails

| Variável | Valor |
|----------|-------|
| `SMTP_HOST` | `smtp.gmail.com` |
| `SMTP_PORT` | `587` |
| `SMTP_USER` | seu email |
| `SMTP_PASSWORD` | senha de app (16 dígitos) |
| `SMTP_FROM_NAME` | `CliniGo` |
| `SMTP_FROM_EMAIL` | `noreply@clinigo.app` |
| `SMTP_SECURE` | `false` |

### Para Pagamentos

| Variável | Valor |
|----------|-------|
| `MERCADOPAGO_ACCESS_TOKEN` | `APP_USR-xxx` |
| `MERCADOPAGO_PUBLIC_KEY` | `APP_USR-xxx` |
| `MERCADOPAGO_WEBHOOK_SECRET` | seu secret |

### Admin

| Variável | Valor |
|----------|-------|
| `SUPER_ADMIN_EMAIL` | email do admin |

---

## 🗄️ Banco de Dados (Supabase)

### Executar Migrations

1. Acesse Supabase Dashboard
2. Vá em **SQL Editor**
3. Execute os scripts:

```sql
-- 1. Schema principal (se ainda não existir)
-- Arquivo: d:\clinigo\database.sql

-- 2. Auth tokens
-- Arquivo: d:\clinigo\migration-auth-tokens.sql

-- 3. Billing columns
ALTER TABLE clinics ADD COLUMN IF NOT EXISTS billing_cycle VARCHAR(20) DEFAULT 'MONTHLY';
ALTER TABLE clinics ADD COLUMN IF NOT EXISTS mercadopago_preference_id TEXT;
ALTER TABLE clinics ADD COLUMN IF NOT EXISTS mercadopago_payment_id TEXT;
ALTER TABLE clinics ADD COLUMN IF NOT EXISTS subscription_starts_at TIMESTAMP;
ALTER TABLE clinics ADD COLUMN IF NOT EXISTS subscription_ends_at TIMESTAMP;
ALTER TABLE clinics ADD COLUMN IF NOT EXISTS paid_amount DECIMAL(10,2);
```

---

## 🔗 Domínio Customizado

### No Vercel

1. Settings → Domains
2. Adicionar `clinigo.app`
3. Configurar DNS no registrador:
   - A: `76.76.21.21`
   - CNAME: `cname.vercel-dns.com`

---

## 🔔 Webhook Mercado Pago

### Configurar no MP

1. Acesse developers.mercadopago.com
2. Selecione sua aplicação
3. Webhooks → Criar
4. URL: `https://clinigo.app/api/webhooks/mercadopago`
5. Eventos: `payment.created`, `payment.updated`

### Testar Webhook

```bash
# Usando ngrok para desenvolvimento
ngrok http 3000

# Use a URL do ngrok no MP
https://xxxx.ngrok.io/api/webhooks/mercadopago
```

---

## 📧 Gmail SMTP

### Configurar Senha de App

1. Acesse myaccount.google.com
2. Segurança → Verificação em 2 etapas (ativar)
3. Senhas de app → Gerar
4. Copiar os 16 dígitos para `SMTP_PASSWORD`

---

## 🧪 Testes

### Mercado Pago (Sandbox)

Use credenciais TEST:
```env
MERCADOPAGO_ACCESS_TOKEN=TEST-xxx
```

Cartões de teste:
- Aprovado: `5031 4332 1540 6351` + Nome: `APRO`
- Recusado: `5031 4332 1540 6351` + Nome: `OTHE`

---

## 📊 Monitoramento

### Logs Vercel

```bash
vercel logs --follow
```

### Logs Supabase

Dashboard → Logs

---

## 🔄 Rollback

```bash
# Ver deploys anteriores
vercel ls

# Promover deploy específico
vercel promote [deploy-url]
```

---

## 📁 Estrutura de Deploy

```
d:\clinigo\app\
├── .vercel/          # Config do Vercel (gerado)
├── .next/            # Build (gerado)
├── app/              # Código fonte
├── public/           # Assets estáticos
├── package.json      # Dependências
└── vercel.json       # Config do Vercel (opcional)
```

---

## ⚠️ Troubleshooting

### Build falha

```bash
# Limpar cache
rm -rf .next node_modules
npm install
npm run build
```

### Variáveis não funcionam

1. Verificar se estão no Vercel Dashboard
2. Fazer redeploy após adicionar
3. Checar se prefixo `NEXT_PUBLIC_` está correto

### Webhook não recebe

1. Verificar URL no Mercado Pago
2. Checar logs do Vercel
3. Testar com ngrok localmente

### E-mails não enviam

1. Verificar credenciais SMTP
2. Para Gmail: usar senha de app, não senha normal
3. Checar logs de erro no console
