# CliniGo - Documentação Técnica Completa

> **Última atualização:** 11/01/2026
> **Versão:** 2.0.0
> **Status:** Produção (clinigo.app)

---

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Tecnologias](#tecnologias)
3. [Arquitetura](#arquitetura)
4. [Banco de Dados](#banco-de-dados)
5. [Rotas da API](#rotas-da-api)
6. [Páginas Frontend](#páginas-frontend)
7. [Autenticação](#autenticação)
8. [Pagamentos](#pagamentos)
9. [Status das Funcionalidades](#status-das-funcionalidades)
10. [Variáveis de Ambiente](#variáveis-de-ambiente)
11. [Deploy](#deploy)

---

## 🎯 Visão Geral

**CliniGo** é um sistema SaaS multi-tenant de gestão para clínicas médicas, oferecendo:

- Agendamento online 24/7
- Prontuário eletrônico
- Telemedicina integrada
- Gestão financeira
- IA para triagem e diagnóstico
- Integração WhatsApp
- Faturamento TISS

### Modelo de Negócio
- **Proprietário:** Recebe assinaturas via Mercado Pago
- **Clínicas:** Pagam mensalidade para usar a plataforma
- **Pacientes:** Agendam consultas (pagamento externo à clínica)

---

## 🛠 Tecnologias

### Frontend
| Tecnologia | Versão | Uso |
|------------|--------|-----|
| Next.js | 16.1.1 | Framework React com App Router |
| React | 19 | Biblioteca de UI |
| TypeScript | 5.x | Tipagem estática |
| Tailwind CSS | 4.x | Estilização |
| shadcn/ui | - | Componentes de UI |
| Lucide React | - | Ícones |

### Backend
| Tecnologia | Versão | Uso |
|------------|--------|-----|
| Next.js API Routes | - | Endpoints REST |
| Supabase | - | BaaS (Auth, Database, Storage) |
| PostgreSQL | 15+ | Banco de dados |
| Zod | - | Validação de schemas |

### Integrações
| Serviço | Uso |
|---------|-----|
| Mercado Pago | Pagamentos de assinatura |
| Nodemailer | Envio de e-mails (SMTP) |
| Daily.co | Telemedicina (planos PRO+) |
| Google Meet | Telemedicina (plano básico) |
| WhatsApp Business API | Notificações (planos PRO+) |

### DevOps
| Ferramenta | Uso |
|------------|-----|
| Vercel | Hospedagem e Deploy |
| GitHub | Controle de versão |
| Supabase | Banco de dados gerenciado |

---

## 🏗 Arquitetura

```
d:\clinigo\app\
├── app/                    # Next.js App Router
│   ├── (auth)/            # Páginas de autenticação
│   ├── (patient)/         # Portal do paciente
│   ├── (public)/          # Páginas públicas
│   ├── api/               # 108 rotas de API
│   ├── clinica/           # Portal da clínica (login)
│   ├── dashboard/         # Painel administrativo
│   ├── medico/            # Portal do médico (login)
│   ├── paciente/          # Portal do paciente (login)
│   └── pagamento/         # Retornos do Mercado Pago
├── components/            # Componentes React
├── hooks/                 # Custom hooks
├── lib/                   # Utilitários e serviços
│   ├── constants/         # Configurações de planos
│   ├── services/          # Mail, Mercado Pago
│   └── supabase/          # Clients Supabase
└── public/                # Assets estáticos
```

---

## 🗄 Banco de Dados

### Tabelas Principais

| Tabela | Descrição | Status |
|--------|-----------|--------|
| `clinics` | Clínicas (tenants) | ✅ Funcional |
| `users` | Usuários (admins, médicos) | ✅ Funcional |
| `doctors` | Perfis de médicos | ✅ Funcional |
| `patients` | Pacientes por clínica | ✅ Funcional |
| `appointments` | Agendamentos | ✅ Funcional |
| `consultations` | Consultas realizadas | ✅ Funcional |
| `medical_records` | Prontuários | ✅ Funcional |
| `prescriptions` | Prescrições | ✅ Funcional |
| `doctor_schedules` | Horários de médicos | ✅ Funcional |
| `schedule_exceptions` | Exceções de horário | ✅ Funcional |
| `financial_entries` | Entradas financeiras | ✅ Funcional |
| `inventory_products` | Estoque | ✅ Funcional |
| `tiss_guides` | Guias TISS | ✅ Funcional |
| `health_insurances` | Convênios | ✅ Funcional |
| `password_reset_tokens` | Tokens de reset | ✅ Funcional |
| `activation_tokens` | Tokens de ativação | ✅ Funcional |
| `email_logs` | Log de e-mails | ✅ Funcional |
| `subscriptions` | Assinaturas | ✅ Funcional |
| `billing_events` | Eventos de cobrança | ✅ Funcional |

### Colunas de Billing (adicionar via SQL)
```sql
ALTER TABLE clinics ADD COLUMN IF NOT EXISTS billing_cycle VARCHAR(20);
ALTER TABLE clinics ADD COLUMN IF NOT EXISTS mercadopago_preference_id TEXT;
ALTER TABLE clinics ADD COLUMN IF NOT EXISTS mercadopago_payment_id TEXT;
ALTER TABLE clinics ADD COLUMN IF NOT EXISTS subscription_starts_at TIMESTAMP;
ALTER TABLE clinics ADD COLUMN IF NOT EXISTS subscription_ends_at TIMESTAMP;
ALTER TABLE clinics ADD COLUMN IF NOT EXISTS paid_amount DECIMAL(10,2);
```

---

## 🔌 Rotas da API

### Autenticação (`/api/auth`)

| Rota | Método | Descrição | Status |
|------|--------|-----------|--------|
| `/api/auth/register` | POST | Cadastro de clínica | ✅ |
| `/api/auth/login` | POST | Login | ✅ |
| `/api/auth/logout` | POST | Logout | ✅ |
| `/api/auth/forgot-password` | POST | Solicitar reset | ✅ |
| `/api/auth/reset-password` | POST | Redefinir senha | ✅ |
| `/api/auth/activate-account` | POST | Ativar conta | ✅ |
| `/api/auth/signup` | POST | Alias do register | ✅ |
| `/api/auth/mfa` | POST | Configurar MFA | ⚠️ Parcial |
| `/api/auth/sessions` | GET | Listar sessões | ✅ |

### Billing (`/api/billing`)

| Rota | Método | Descrição | Status |
|------|--------|-----------|--------|
| `/api/billing/create-preference` | POST | Criar link MP | ✅ |
| `/api/billing/create-subscription` | POST | Criar assinatura | ✅ |

### Clínicas (`/api/clinics`)

| Rota | Método | Descrição | Status |
|------|--------|-----------|--------|
| `/api/clinics` | GET/POST | CRUD clínicas | ✅ |
| `/api/clinics/[clinicId]` | GET/PUT/DELETE | Clínica específica | ✅ |
| `/api/clinics/by-slug/[slug]` | GET | Buscar por slug | ✅ |
| `/api/clinics/api-keys` | GET/POST | Gerenciar API keys | ✅ |

### Médicos (`/api/doctors`)

| Rota | Método | Descrição | Status |
|------|--------|-----------|--------|
| `/api/doctors` | GET/POST | CRUD médicos | ✅ |
| `/api/doctors/[doctorId]` | GET/PUT/DELETE | Médico específico | ✅ |
| `/api/doctors/invite` | POST | Convidar médico | ✅ |
| `/api/doctors/schedules` | GET/POST | Horários | ✅ |
| `/api/doctors/[id]/health-insurances` | GET/POST | Convênios | ✅ |

### Pacientes (`/api/patients`)

| Rota | Método | Descrição | Status |
|------|--------|-----------|--------|
| `/api/patients` | GET/POST | CRUD pacientes | ✅ |
| `/api/patients/register` | POST | Auto-cadastro | ✅ |
| `/api/patient/auth/login` | POST | Login paciente | ✅ |

### Agendamentos (`/api/appointments`)

| Rota | Método | Descrição | Status |
|------|--------|-----------|--------|
| `/api/appointments` | GET/POST | CRUD agendamentos | ✅ |
| `/api/appointments/[id]` | GET/PUT/DELETE | Agendamento | ✅ |
| `/api/appointments/[id]/cancel` | POST | Cancelar | ✅ |
| `/api/appointments/[id]/confirm-payment` | POST | Confirmar pag | ✅ |
| `/api/appointments/available-slots` | GET | Horários livres | ✅ |
| `/api/appointments/walk-in` | POST | Encaixe | ✅ |

### Consultas (`/api/consultations`)

| Rota | Método | Descrição | Status |
|------|--------|-----------|--------|
| `/api/consultations` | GET/POST | CRUD consultas | ✅ |
| `/api/consultations/[id]` | GET/PUT | Consulta | ✅ |
| `/api/consultations/[id]/analyze` | POST | Análise IA | ✅ |

### Financeiro (`/api/financial`)

| Rota | Método | Descrição | Status |
|------|--------|-----------|--------|
| `/api/financial/summary` | GET | Resumo financeiro | ✅ |
| `/api/financial/entries` | GET/POST | Lançamentos | ✅ |
| `/api/financial/payment-methods` | GET | Métodos | ✅ |

### Webhooks

| Rota | Método | Descrição | Status |
|------|--------|-----------|--------|
| `/api/webhooks/mercadopago` | POST | Webhook MP | ✅ |

### Super Admin (`/api/super-admin`)

| Rota | Método | Descrição | Status |
|------|--------|-----------|--------|
| `/api/super-admin/pending-clinics` | GET | Clínicas pendentes | ✅ |
| `/api/super-admin/approve-clinic` | POST | Aprovar clínica | ✅ |
| `/api/super-admin/reject-clinic` | POST | Rejeitar clínica | ✅ |
| `/api/super-admin/clinics` | GET | Todas clínicas | ✅ |
| `/api/super-admin/stats` | GET | Estatísticas | ✅ |

### Outras Rotas

| Rota | Descrição | Status |
|------|-----------|--------|
| `/api/ai/predict-diagnosis` | IA diagnóstico | ✅ |
| `/api/aia/triage` | IA triagem | ✅ |
| `/api/crm/*` | CRM (automações, campanhas) | ✅ |
| `/api/inventory/*` | Estoque | ✅ |
| `/api/tiss/*` | Guias TISS | ✅ |
| `/api/video/*` | Telemedicina | ✅ |
| `/api/whatsapp/*` | Integração WhatsApp | ⚠️ Config externa |
| `/api/medical-records/*` | Prontuários | ✅ |
| `/api/prescriptions/*` | Prescrições | ✅ |

---

## 📄 Páginas Frontend

### Públicas

| Rota | Descrição | Status |
|------|-----------|--------|
| `/` | Landing page | ✅ |
| `/planos` | Página de planos | ✅ |
| `/termos` | Termos de uso | ✅ |
| `/privacidade` | Política privacidade | ✅ |
| `/[clinic_slug]` | Página pública da clínica | ✅ |
| `/[clinic_slug]/agendar` | Agendamento online | ✅ |

### Autenticação

| Rota | Descrição | Status |
|------|-----------|--------|
| `/clinica` | Login clínica | ✅ |
| `/medico` | Login médico | ✅ |
| `/paciente` | Login paciente | ✅ |
| `/cadastro` | Cadastro clínica | ✅ |
| `/recuperar-senha` | Recuperar senha | ✅ |
| `/redefinir-senha/[token]` | Nova senha | ✅ |
| `/ativar-conta/[token]` | Ativar conta | ✅ |
| `/aguardando-aprovacao` | Aguardando aprovação | ✅ |

### Dashboard

| Rota | Descrição | Status |
|------|-----------|--------|
| `/dashboard` | Painel principal | ✅ |
| `/dashboard/agenda` | Agenda | ✅ |
| `/dashboard/pacientes` | Gestão pacientes | ✅ |
| `/dashboard/medicos` | Gestão médicos | ✅ |
| `/dashboard/horarios` | Configurar horários | ✅ |
| `/dashboard/financeiro` | Financeiro | ✅ |
| `/dashboard/estoque` | Estoque | ✅ |
| `/dashboard/tiss` | Guias TISS | ✅ |
| `/dashboard/documentos` | Documentos | ✅ |
| `/dashboard/crm` | CRM | ✅ |
| `/dashboard/whatsapp` | WhatsApp | ⚠️ Config externa |
| `/dashboard/configuracoes` | Configurações | ✅ |

### Pagamento

| Rota | Descrição | Status |
|------|-----------|--------|
| `/pagamento/sucesso` | Sucesso MP | ✅ |
| `/pagamento/erro` | Erro MP | ✅ |
| `/pagamento/pendente` | Pendente MP | ✅ |

---

## 🔐 Autenticação

### Fluxos Implementados

1. **Cadastro de Clínica**
   - Formulário → status `pending_payment`
   - Redireciona para Mercado Pago
   - Webhook ativa automaticamente
   - E-mail com credenciais

2. **Login**
   - Supabase Auth para clínicas/médicos
   - JWT próprio para pacientes (via CPF)

3. **Recuperação de Senha**
   - Token de 1 hora
   - E-mail com link seguro

4. **Ativação de Conta**
   - Token de 7 dias
   - Para médicos convidados e pacientes

### Roles

| Role | Descrição |
|------|-----------|
| `SUPER_ADMIN` | Administrador da plataforma |
| `CLINIC_ADMIN` | Administrador da clínica |
| `DOCTOR` | Médico |

---

## 💳 Pagamentos

### Mercado Pago

**Configuração:**
```env
MERCADOPAGO_ACCESS_TOKEN=APP_USR-xxx
MERCADOPAGO_WEBHOOK_SECRET=xxx
```

**Webhook URL:** `https://clinigo.app/api/webhooks/mercadopago`

### Planos

| Plano | Preço Mensal | Preço Anual (2 grátis) |
|-------|--------------|------------------------|
| Starter | R$ 47 | R$ 470 |
| Básico | R$ 87 | R$ 870 |
| Profissional | R$ 247 | R$ 2.470 |
| Enterprise | R$ 497 | R$ 4.970 |
| Network | R$ 997 | R$ 9.970 |

---

## ✅ Status das Funcionalidades

### ✅ Funcionando

- Cadastro e login de clínicas
- Gestão de médicos e pacientes
- Agendamento online
- Prontuário eletrônico
- Prescrições
- Financeiro básico
- Estoque
- TISS
- CRM
- Telemedicina (Daily.co/Meet)
- Pagamentos via Mercado Pago
- E-mails automáticos

### ⚠️ Requer Configuração Externa

- WhatsApp Business API (precisa de conta Meta)
- SMTP (configurar variáveis de ambiente)
- Mercado Pago (configurar credenciais)

### ❌ Não Implementado

- App mobile nativo
- Integração com laboratórios
- BI avançado

---

## 🔧 Variáveis de Ambiente

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# App
NEXT_PUBLIC_APP_URL=https://clinigo.app

# Mercado Pago
MERCADOPAGO_ACCESS_TOKEN=
MERCADOPAGO_PUBLIC_KEY=
MERCADOPAGO_WEBHOOK_SECRET=

# SMTP
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASSWORD=
SMTP_FROM_NAME=CliniGo
SMTP_FROM_EMAIL=
SMTP_SECURE=false

# Admin
SUPER_ADMIN_EMAIL=
```

---

## 🚀 Deploy

### Produção
- **URL:** https://clinigo.app
- **Plataforma:** Vercel
- **Comando:** `vercel --prod`

### Desenvolvimento
```bash
cd d:\clinigo\app
npm install
npm run dev
```

### Build
```bash
npm run build
```
