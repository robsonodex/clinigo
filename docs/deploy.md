# 🚀 CliniGo - Guia de Deploy Vercel

> Guia completo para publicar o CliniGo em produção

---

## 📋 Pré-requisitos

Antes de iniciar o deploy, certifique-se de ter:

- [ ] Conta no [Vercel](https://vercel.com) (gratuita)
- [ ] Conta no [Supabase](https://supabase.com) com projeto criado
- [ ] Conta no [Mercado Pago](https://www.mercadopago.com.br/developers) (desenvolvedor)
- [ ] Conta no [Google Cloud](https://console.cloud.google.com) com Calendar API habilitada
- [ ] Conta no [SendGrid](https://sendgrid.com) ou [Resend](https://resend.com) para emails

---

## 🔑 Variáveis de Ambiente

### Lista Completa de Variáveis

```env
# ============================================================================
# SUPABASE (Obrigatório)
# ============================================================================
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# ============================================================================
# MERCADO PAGO (Obrigatório para pagamentos)
# ============================================================================
MERCADOPAGO_ACCESS_TOKEN=APP_USR-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
MERCADOPAGO_PUBLIC_KEY=APP_USR-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
MERCADOPAGO_WEBHOOK_SECRET=seu-webhook-secret

# ============================================================================
# GOOGLE CALENDAR / MEET (Obrigatório para videochamadas)
# ============================================================================
GOOGLE_CLIENT_ID=xxxxxxxxxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxxxxxxxxxxxxx
GOOGLE_REFRESH_TOKEN=1//xxxxxxxxxxxxxxxxxxxxxxxx

# ============================================================================
# EMAIL (Obrigatório para notificações)
# ============================================================================
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxxxxx
EMAIL_FROM=noreply@seudominio.com.br

# ============================================================================
# WHATSAPP (Opcional - mas recomendado)
# ============================================================================
WHATSAPP_API_KEY=seu-whatsapp-api-key
WHATSAPP_PHONE_NUMBER_ID=seu-phone-number-id

# ============================================================================
# SENTRY (Opcional - monitoramento de erros)
# ============================================================================
SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
SENTRY_AUTH_TOKEN=sntrys_xxxxxxxxxxxxxxxx

# ============================================================================
# POSTHOG (Opcional - analytics)
# ============================================================================
NEXT_PUBLIC_POSTHOG_KEY=phc_xxxxxxxxxxxxxxxx
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com

# ============================================================================
# APLICAÇÃO
# ============================================================================
NEXT_PUBLIC_APP_URL=https://seu-dominio.vercel.app
```

---

## 🛠️ Passo a Passo do Deploy

### Método 1: Via Vercel CLI (Recomendado)

#### 1. Instale a CLI do Vercel

```bash
npm install -g vercel
```

#### 2. Faça login

```bash
vercel login
```

#### 3. Navegue até a pasta do app

```bash
cd clinigo/app
```

#### 4. Execute o deploy

```bash
# Deploy de preview (staging)
vercel

# Deploy de produção
vercel --prod
```

#### 5. Configure as variáveis de ambiente

```bash
# Adicione cada variável
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
vercel env add SUPABASE_SERVICE_ROLE_KEY production
# ... continue para todas as variáveis
```

---

### Método 2: Via Dashboard Vercel

#### 1. Acesse o Vercel Dashboard

Vá para [vercel.com/dashboard](https://vercel.com/dashboard)

#### 2. Importe o Repositório

1. Clique em **"Add New..."** → **"Project"**
2. Conecte sua conta do GitHub/GitLab/Bitbucket
3. Selecione o repositório `clinigo`

#### 3. Configure o Projeto

| Campo | Valor |
|-------|-------|
| **Root Directory** | `app` |
| **Framework Preset** | Next.js |
| **Build Command** | `npm run build` |
| **Output Directory** | `.next` |
| **Install Command** | `npm install` |

#### 4. Adicione as Variáveis de Ambiente

1. Expanda **"Environment Variables"**
2. Adicione cada variável uma por uma
3. Selecione os ambientes: **Production**, **Preview**, **Development**

#### 5. Clique em Deploy

O primeiro deploy pode levar 2-5 minutos.

---

## ⚙️ Configurações Pós-Deploy

### 1. Configure o Domínio Personalizado

1. Vá em **Settings** → **Domains**
2. Adicione seu domínio: `app.clinigo.com.br`
3. Configure o DNS conforme instruções

### 2. Configure o Webhook do Mercado Pago

1. Acesse [Mercado Pago Developers](https://www.mercadopago.com.br/developers/panel/app)
2. Vá em **Webhooks**
3. Adicione o URL: `https://seu-dominio.vercel.app/api/payments/webhook`
4. Selecione os eventos: `payment`

### 3. Configure o Webhook do Supabase (Opcional)

Para Edge Functions, configure em:
- Supabase Dashboard → Edge Functions

### 4. Verifique os Cron Jobs

Os crons configurados no `vercel.json` são:

| Cron | Horário | Função |
|------|---------|--------|
| `/api/cron/send-reminders` | A cada hora | Envia lembretes de consultas |
| `/api/cron/cancel-unpaid` | A cada 10 min | Cancela agendamentos não pagos |

> ⚠️ **Nota**: Crons no Vercel requerem plano Pro ($20/mês)

---

## 🔍 Verificação do Deploy

### Checklist de Verificação

- [ ] Home page carrega corretamente
- [ ] Login funciona
- [ ] Dashboard carrega após login
- [ ] Página pública de agendamento funciona (`/clinica-slug`)
- [ ] Webhook do Mercado Pago está acessível
- [ ] Emails estão sendo enviados
- [ ] Videochamadas Google Meet são geradas

### Teste Rápido

```bash
# Verificar se a API está respondendo
curl https://seu-dominio.vercel.app/api/health

# Verificar webhook
curl -X POST https://seu-dominio.vercel.app/api/payments/webhook \
  -H "Content-Type: application/json" \
  -d '{"type": "test"}'
```

---

## 🔧 Troubleshooting

### Erro: Build Failed

```
Verifique:
1. Se todas as variáveis de ambiente estão configuradas
2. Se o Root Directory está definido como "app"
3. Se há erros de TypeScript no código
```

### Erro: 500 Internal Server Error

```
Verifique:
1. Logs do Vercel (Dashboard → Deployments → Logs)
2. Se as variáveis do Supabase estão corretas
3. Se o banco de dados está acessível
```

### Erro: Webhook não recebe notificações

```
Verifique:
1. URL do webhook está correta no Mercado Pago
2. O endpoint retorna 200 OK
3. Não há firewall bloqueando
```

### Erro: Google Meet não gera links

```
Verifique:
1. Calendar API está habilitada no Google Cloud
2. OAuth consent screen está configurado
3. GOOGLE_REFRESH_TOKEN está válido
```

---

## 📊 Monitoramento

### Vercel Analytics

Ative em: **Settings** → **Analytics**

### Sentry (Erros)

O Sentry já está configurado. Verifique em [sentry.io](https://sentry.io)

### Logs

Acesse em: **Deployments** → Selecione deploy → **Logs**

---

## 🔄 Atualizações

### Deploy Automático

O Vercel faz deploy automático a cada push para a branch `main`.

### Deploy Manual

```bash
# Via CLI
vercel --prod

# Via Dashboard
Vá em Deployments → Redeploy
```

---

## 💰 Custos Estimados

| Serviço | Plano | Custo/mês |
|---------|-------|-----------|
| Vercel | Hobby (gratuito) | $0 |
| Vercel | Pro (com crons) | $20 |
| Supabase | Pro | $25 |
| SendGrid | Essentials | $19.95 |
| Google Calendar API | Gratuito | $0 |
| Mercado Pago | 4.99% por transação | Variável |

**Total mínimo**: ~$65/mês + taxas de transação

---

## 📞 Suporte

Em caso de problemas:

1. Verifique os [logs do Vercel](https://vercel.com/docs/observability/runtime-logs)
2. Consulte a [documentação do Next.js](https://nextjs.org/docs)
3. Entre em contato: suporte@clinigo.com.br

---

*Guia atualizado em 2026-01-06*
