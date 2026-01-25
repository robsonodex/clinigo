# CliniGo 🏥

> Sistema completo de gestão para clínicas médicas com TISS, Teleconsulta e Prontuário Eletrônico

[![Version](https://img.shields.io/badge/version-2.0.0-blue)](./CHANGELOG.md)
[![License](https://img.shields.io/badge/license-Proprietary-red)]()
[![Next.js](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-green)](https://supabase.com/)

---

## 🚀 Quick Start

```bash
# 1. Clone e instale dependências
cd D:\clinigo\app
npm install

# 2. Configure environment
cp .env.local.example .env.local
# Edite .env.local com suas credenciais Supabase

# 3. Execute migrations
cd ..
supabase db push

# 4. Rode o servidor de desenvolvimento
cd app  
npm run dev
```

**Acesse:** http://localhost:3000

---

## ✨ Features Principais

###  📞 Teleconsulta WebRTC
- ✅ Criação automática de salas de vídeo
- ✅ Tokens únicos (paciente e médico)
- ✅ Compartilhamento multi-canal (copiar, e-mail, WhatsApp)
- ✅ API de reenvio de links

### 📄 TISS Completo (Padrão ANS 3.05.00)
- ✅ **Solicitações de Autorização** (guias SP/SADT)
  - Criação, envio e acompanhamento
  - Upload de anexos (laudos, exames)
  - Geração automática de número de solicitação
- ✅ **Gestão de Glosas**
  - Listagem de glosas recebidas
  - Cálculo automático de taxa de glosa
  - Sistema de contestações com documentação
- ✅ **Integração Webservice**
  - Cliente genérico SOAP/REST
  - Retry automático (exponential backoff)
  - Criptografia de credenciais
  - Logs completos de comunicação

### 🩺 Prontuário Eletrônico
- Editor rich-text com autosave
- Histórico completo do paciente
- Prescrições e atestados
- Assinatura digital

### 📅 Agendamento Inteligente
- Calendário interativo
- Anti-overbooking
- QR Code para check-in
- Notificações automáticas

### 💰 Gestão Financeira
- Faturamento TISS
- Controle de recebíveis
- Repasse de médicos
- Relatórios financeiros

---

## 📁 Estrutura do Projeto

```
clinigo/
├── app/                          # Next.js App Router
│   ├── api/                      # API Routes
│   │   ├── appointments/         # Agendamentos
│   │   │   └── send-teleconsulta-link/  # 🆕 Reenvio de link
│   │   └── tiss/                 # 🆕 TISS APIs
│   │       ├── autorizacao/      # Solicitações de autorização
│   │       ├── glosas/           # Gestão de glosas
│   │       │   └── metrics/      # Métricas agregadas
│   │       └── webservice/       # Integração webservice
│   ├── dashboard/                # Área autenticada
│   │   └── (clinic)/
│   │       ├── agendamentos/     # Agendamentos
│   │       │   └── components/
│   │       │       └── TeleconsultaLinkPanel.tsx  # 🆕
│   │       └── tiss/             # 🆕 Módulo TISS
│   │           ├── autorizacao/  # Solicitações
│   │           ├── glosas/       # Glosas
│   │           └── webservice/   # Config webservice
│   └── lib/
│       ├── services/             # Business Logic
│       │   └── tiss/             # 🆕 TISS Services
│       │       ├── autorizacao-service.ts
│       │       ├── glosa-service.ts
│       │       └── webservice-client.ts
│       └── validations/          # Zod Schemas
├── migrations/                   # 🆕 SQL Migrations
│   ├── 20260124_tiss_authorization.sql
│   ├── 20260124_tiss_glosas.sql
│   ├── 20260124_tiss_glosas_fix.sql
│   └── 20260124_tiss_webservice.sql
├── docs/                         # Documentação
└── tests/                        # Testes
```

---

## 🗄️ Database Schema (Novo)

### Teleconsulta
- `video_rooms` - Salas de vídeo com tokens

### TISS - Autorização
- `tiss_authorization_requests` - Solicitações
- `tiss_authorization_procedures` - Procedimentos
- `tiss_authorization_attachments` - Anexos

### TISS - Glosas
- `tiss_glosas` - Glosas recebidas
- `tiss_glosa_contests` - Contestações
- `tiss_glosa_contest_attachments` - Anexos de contestação
- `vw_glosa_metrics` - View de métricas

### TISS - Webservice
- `tiss_webservice_configs` - Configurações
- `tiss_webservice_logs` - Logs de comunicação
- `vw_webservice_health` - View de health check

---

## 🔧 Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | Next.js 14, React 18, TypeScript |
| **UI** | Tailwind CSS, shadcn/ui |
| **Backend** | Next.js API Routes |
| **Database** | Supabase (PostgreSQL) |
| **Auth** | Supabase Auth |
| **Validation** | Zod |
| **Email** | Vercel Email / SMTP |
| **Realtime** | Supabase Realtime |
| **Storage** | Supabase Storage |

---

## 📚 Documentação

| Documento | Descrição |
|-----------|-----------|
| [CHANGELOG](./CHANGELOG.md) | Histórico de versões |
| [Plano TISS/Teleconsulta](./teleconsulta-tiss-improvements.md) | Plano de implementação detalhado |
| [Relatório de Implementação](./final-implementation-report.md) | Status da implementação |
| [Documentação Técnica](./DOCUMENTACAO_TECNICA_V3.md) | Arquitetura e decisões técnicas |
| [API Reference](./docs/API_REFERENCE.md) | Endpoints de API |
| [Guia de Implementação](./docs/GUIA_IMPLEMENTACAO_COMPLETO.md) | Setup e configuração |
| [Manual de Usabilidade](./docs/MANUAL_USABILIDADE.md) | Guia do usuário |
| [TISS Industrial Guide](./docs/TISS_INDUSTRIAL_GUIDE.md) | Guia TISS avançado |

---

## 🚢 Deploy

### Pré-requisitos
- Node.js 18+
- Conta Supabase
- Conta Vercel (opcional)

### Passo a Passo

```bash
# 1. Build
npm run build

# 2. Executar migrations (OBRIGATÓRIO)
supabase db push

# 3. Deploy Vercel
vercel --prod
```

### Environment Variables
```env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
SUPABASE_SERVICE_ROLE_KEY=eyJxxx...
NEXT_PUBLIC_APP_URL=https://www.clinigo.app

# Email (opcional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=seu-email@gmail.com
SMTP_PASS=sua-senha-app
```

---

## 🧪 Testing

```bash
# Unit tests
npm run test

# E2E tests (Playwright)
npm run test:e2e

# Coverage
npm run test:coverage
```

---

## 📊 Status do Projeto

**Versão Atual:** 2.0.0  
**Status:** 🟢 Production Ready (Core)  
**Cobertura:** 70% funcional

### Módulos Implementados
- ✅ Teleconsulta (90%)
- ✅ TISS Autorização (80%)
- ✅ TISS Glosas (70%)
- ✅ TISS Webservice (60%)
- ✅ Prontuário (100%)
- ✅ Agendamento (100%)
- ✅ Financeiro (100%)

### Próximas Melhorias
- [ ] Upload de anexos (Supabase Storage)
- [ ] Integração real com webservice operadoras
- [ ] Dashboard de métricas TISS
- [ ] Formulário de criação de autorização
- [ ] Testes automatizados (E2E)

---

## 🤝 Contribuindo

Este é um projeto proprietário. Para contribuições externas, entre em contato.

---

## 📞 Suporte

- **Email:** contato@clinigo.app
- **Website:** https://www.clinigo.app
- **Documentação:** [docs/](./docs/)

---

## 📄 License

Proprietary © 2026 CliniGo. Todos os direitos reservados.

---

**Construído com ❤️ por CliniGo Team**
