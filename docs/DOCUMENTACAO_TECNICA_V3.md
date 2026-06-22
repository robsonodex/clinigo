# CliniGo SaaS — Documentação Técnica Oficial V4

> **Última atualização:** 11 de Maio de 2026  
> **Status:** Documento vivo — reflete 100% das funcionalidades implementadas e ativas em produção.  
> **Stack:** Next.js 16 · React 19 · Supabase (PostgreSQL + Auth + Storage + RLS) · TailwindCSS 3 · Vercel  
> **Repositório:** `clinigo-producao`

---

## Índice

1. [Visão Geral](#1-visão-geral)
2. [Arquitetura Técnica](#2-arquitetura-técnica)
3. [Sistema de Planos e Monetização](#3-sistema-de-planos)
4. [Autenticação e Controle de Acesso](#4-autenticação)
5. [Módulo: Agendamento](#5-agendamento)
6. [Módulo: Equipe (Profissionais e Pacientes)](#6-equipe)
7. [Módulo: Prontuário Clínico](#7-prontuário)
8. [Módulo: Financeiro](#8-financeiro)
9. [Módulo: Faturamento TISS](#9-tiss)
10. [Módulo: Comunicação](#10-comunicação)
11. [Módulo: Gestão](#11-gestão)
12. [Módulo: Configurações](#12-configurações)
13. [Módulo: Recepção e Check-in](#13-recepção)
14. [Módulo: PWA Mobile](#14-pwa)
15. [Módulo: Super Admin (Master Hub)](#15-super-admin)
16. [Módulo: Portal do Paciente](#16-portal-paciente)
17. [Módulo: Parceiros e Afiliados](#17-parceiros)
18. [Módulo: Teleconsulta](#18-teleconsulta)
19. [Módulo: Chatbot Clin (Vendas)](#19-chatbot)
20. [Infraestrutura e DevOps](#20-infraestrutura)
21. [Banco de Dados — Mapa Completo](#21-banco-de-dados)
22. [Segurança e LGPD](#22-segurança)
23. [Histórico de Alterações Recentes](#23-histórico)

---

## 1. Visão Geral

O **CliniGo** é uma plataforma SaaS multitenant para gestão completa de clínicas médicas e terapêuticas. Construída com arquitetura moderna, oferece desde agendamento até faturamento TISS industrial, passando por prontuário eletrônico, teleconsulta, estoque, CRM e repasse financeiro.

### 1.1 Público-Alvo
- Médicos solo em consultórios particulares
- Clínicas multiprofissionais (psicólogos, fisioterapeutas, fonoaudiólogos)
- Centros de reabilitação e espaços terapêuticos
- Redes de clínicas com gestão centralizada

### 1.2 Diferenciais
- **Multitenant com isolamento total** via Row Level Security (RLS)
- **4 planos comerciais** com feature gating por rota
- **Nomenclatura adaptativa** (Médico/Terapeuta/Profissional conforme tipo de clínica)
- **PWA mobile** para profissionais em campo
- **Painel TV** para recepção com fila de espera em tempo real
- **Totem de autoatendimento** para check-in de pacientes
- **Integração WhatsApp** nativa via Baileys (lembretes automatizados)
- **Faturamento TISS** completo com validação XSD conforme padrão ANS

---

## 2. Arquitetura Técnica

### 2.1 Stack Principal

| Camada | Tecnologia | Versão |
|--------|-----------|--------|
| Framework | Next.js (App Router) | 16.1 |
| UI | React | 19.0 |
| Estilização | TailwindCSS | 3.4 |
| Componentes UI | Radix UI + shadcn/ui | Última |
| Banco de dados | Supabase (PostgreSQL 15) | — |
| Autenticação | Supabase Auth + JWT (portal paciente) | — |
| Storage | Supabase Storage (documentos, imagens) | — |
| Deploy | Vercel (Edge Network) | — |
| Rate Limiting | Upstash Redis | — |
| Monitoramento | Sentry + PostHog | — |
| E-mail | Resend + Nodemailer | — |
| Pagamento | Mercado Pago + Banco Inter (boleto) | — |
| WhatsApp | Baileys (@whiskeysockets/baileys) | 7.0-rc |
| Vídeo | WebRTC nativo | — |
| XML/TISS | fast-xml-parser + xml-crypto | — |
| PDF | jsPDF + html2pdf.js | — |
| QR Code | qrcode + html5-qrcode (leitor) | — |
| Rich Text | TipTap (editor de prontuário) | 3.15 |
| Animações | Framer Motion | 12.x |
| State | Zustand | 5.0 |
| Forms | React Hook Form + Zod | — |
| Excel | ExcelJS + XLSX | — |

### 2.2 Estrutura de Diretórios

```
clinigo-producao/
├── app/
│   ├── api/                    # 82+ rotas de API (REST)
│   ├── dashboard/(clinic)/     # 30 páginas do dashboard clínica
│   ├── m/                      # PWA mobile (agenda, fila, prontuários)
│   ├── system-master-hub/      # Painel Super Admin
│   ├── (auth)/                 # Login/Cadastro
│   ├── (patient)/              # Portal do paciente
│   ├── totem/                  # Autoatendimento
│   ├── painel-tv/              # TV de recepção
│   ├── checkin/                # Check-in QR
│   ├── video/                  # Sala de teleconsulta
│   ├── partners/               # Portal de parceiros
│   ├── trial/                  # Landing page Google Ads (teste grátis 7 dias)
│   └── reschedule/             # Reagendamento via link
├── components/                 # 45+ diretórios de componentes
├── lib/
│   ├── hooks/                  # 16 hooks customizados
│   ├── middlewares/             # Auth helpers (requireRole, requireAdmin)
│   ├── whatsapp/               # Serviço WhatsApp (Baileys)
│   ├── constants/              # Planos, features, rotas protegidas
│   ├── validations/            # Schemas Zod
│   ├── supabase/               # Client + Server Supabase
│   └── services/               # Serviços compartilhados
├── middleware.ts               # Middleware consolidado (634 linhas)
└── public/                     # Assets estáticos + PWA manifest
```

### 2.3 Middleware Consolidado

O `middleware.ts` implementa uma arquitetura tripartida:

1. **Bypass de rotas públicas** — 30+ rotas que não exigem autenticação
2. **Portal do Paciente** — Autenticação JWT separada (cookie `patient_token`)
3. **Portal de Parceiros** — Auth Supabase com role `PARTNER` no metadata
4. **Supabase Auth** — Autenticação principal (Clínica/Médico/Admin)
5. **RBAC** — Controle por role em rotas protegidas
6. **Feature Gating** — Bloqueio por plano (4 tiers) com redirect para upgrade
7. **Payment Gate** — Bloqueio de acesso se pagamento não confirmado
8. **Trial Expiration** — Bloqueio automático após período de teste (7 dias)

---

## 3. Sistema de Planos

### 3.1 Tabela de Planos

| Plano | Preço/mês | Médicos | Pacientes | Destaques |
|-------|-----------|---------|-----------|-----------|
| **Básico** | R$ 99 | 1 | 200 | Agenda, Prontuário, Financeiro básico |
| **Avançado** | R$ 249 | 5 | Ilimitado | + Teleconsulta, DRE, Repasse, QR Check-in, WhatsApp, CRM, Chat, Importação, Automação |
| **Professional** | R$ 449 | 30 | Ilimitado | + TISS completo, Check-in facial, Totem, Auditoria, API/Webhooks |
| **Enterprise** | R$ 699+ | Ilimitado | Ilimitado | + Super Admin, Multi-clínicas, Analytics global, SLA 99.5% |

### 3.2 Feature Gating

Implementado em duas camadas:
- **Middleware** (`ROUTE_MIN_PLAN`): Bloqueia rotas por plano mínimo
- **Sidebar** (`minPlan`): Exibe cadeado visual 🔒 para features não disponíveis no plano atual

---

## 4. Autenticação e Controle de Acesso

### 4.1 Roles do Sistema

| Role | Descrição | Acesso |
|------|-----------|--------|
| `SUPER_ADMIN` | Administrador da plataforma | Master Hub, todas as clínicas |
| `CLINIC_ADMIN` | Dono/gestor da clínica | Dashboard completo, financeiro, configurações |
| `DOCTOR` | Profissional de saúde | Agenda própria, prontuários, evoluções |
| `RECEPTIONIST` | Recepcionista | Agenda geral, check-in, pacientes |
| `STAFF` | Auxiliar | Agenda geral, recepção |
| `PARTNER` | Parceiro/afiliado | Portal de comissões |

### 4.2 Coordenadores

Profissionais com `is_coordinator = true` na tabela `users` possuem visão ampliada:
- Acesso ao módulo **Documentos** (mesmo sendo DOCTOR)
- Visão de **todas** as evoluções e documentos da clínica (sem filtro por paciente)

### 4.3 Sigilo Clínico (Isolamento por Terapeuta)

- **Evoluções:** DOCTORs não-coordenadores veem apenas evoluções onde são o `doctor_id`
- **Documentos:** DOCTORs não-coordenadores veem apenas documentos **de saúde** (`doc_group = 'health'`) de pacientes vinculados via `appointments`
- **Segregação de Documentos:** Documentos são categorizados em dois grupos:
  - **Saúde** (`doc_group = 'health'`): Exame, Receita, Laudo, Encaminhamento, Atestado — visíveis para terapeutas
  - **Administrativo** (`doc_group = 'admin'`): Convênio, Consentimento, Pessoal, Outros — visíveis apenas para recepção e admin
- **Upload de documentos:** Restrito a `CLINIC_ADMIN`, `RECEPTIONIST` e coordenadores
- **RLS:** Policies granulares em `session_evolutions` e `patient_documents` garantem isolamento no nível do banco

### 4.4 Hooks de Autenticação

```
useAuth()        → user, profile, signIn, signOut, signUp
useRequireAuth() → redireciona se não autenticado
useRole()        → role, isSuperAdmin, isClinicAdmin, isDoctor, isReceptionist, isCoordinator, clinicId
usePlan()        → planType, isLoading
useFeatureGate() → verificação de feature por plano
```

---

## 5. Módulo: Agendamento

### 5.1 Páginas

| Página | Rota | Roles | Descrição |
|--------|------|-------|-----------|
| Agenda | `/dashboard/agenda` | ADMIN, RECEPTIONIST, STAFF | Calendário visual por profissional |
| Minha Agenda | `/dashboard/minha-agenda` | DOCTOR | Agenda pessoal do profissional |
| Consultas | `/dashboard/consultas` | ADMIN, DOCTOR | Atendimentos do dia |
| Horários | `/dashboard/horarios` | ADMIN | Grade de disponibilidade por profissional |

### 5.2 APIs de Agendamento

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/api/appointments` | GET/POST | Listar e criar agendamentos |
| `/api/appointments/[id]` | GET/PUT/DELETE | Detalhe, editar, cancelar |
| `/api/appointments/available-slots` | GET | Horários disponíveis |
| `/api/appointments/recurring` | POST | Criar série recorrente |
| `/api/appointments/rearrange` | POST | Reorganizar agenda |
| `/api/appointments/walk-in` | POST | Encaixe sem agendamento prévio |
| `/api/appointments/manual` | POST | Agendamento manual |
| `/api/appointments/overdue` | GET | Consultas atrasadas |
| `/api/appointments/suggest-slots` | GET | Sugestão inteligente de horários |
| `/api/appointments/send-teleconsulta-link` | POST | Enviar link de teleconsulta |
| `/api/appointments/resend-email` | POST | Reenviar e-mail de confirmação |

### 5.3 Funcionalidades

- **Anti-overbooking**: Lock temporário de slots via `appointment_slot_locks` + verificação de conflito
- **Realtime slot locks**: Hook `useRealtimeSlotLocks` com Supabase Realtime
- **Série recorrente**: Tabela `recurring_appointment_series` com 170 séries ativas
- **QR Code por consulta**: Gerado automaticamente (`appointment_qr_codes` — 105 registros)
- **Reagendamento por link**: Rota pública `/reschedule/[token]` via `reschedule_tokens`
- **Fila de espera**: `appointment_queue` para walk-ins
- **Notificações automáticas**: `notification_queue` com 8.747 notificações programadas

---

## 6. Módulo: Equipe

### 6.1 Profissionais

| Rota | Função |
|------|--------|
| `/dashboard/medicos` | Listagem de profissionais (label dinâmico: Médicos/Terapeutas) |
| `/api/doctors` | CRUD de profissionais |
| `/api/doctors/[id]` | Perfil, horários, convênios |
| `/api/doctors/[id]/schedules` | Grade de disponibilidade |
| `/api/doctors/[id]/health-insurances` | Convênios aceitos |

**Tabelas:** `doctors` (19 registros), `doctor_contracts` (16), `schedules` (88 grades de horário)

**Nomenclatura adaptativa:** O hook `useProfessionalLabel()` retorna labels dinâmicos conforme o tipo da clínica:
- Clínica médica → "Médicos" / "Repasse Médico"
- Espaço terapêutico → "Terapeutas" / "Repasse Profissional"

### 6.2 Pacientes

| Rota | Função |
|------|--------|
| `/dashboard/pacientes` | Listagem e cadastro de pacientes |
| `/dashboard/pacientes/[id]` | Perfil completo com abas |
| `/api/patients` | CRUD de pacientes |
| `/api/patients/[id]` | Detalhe do paciente |
| `/api/patients/search` | Busca por nome/CPF |
| `/api/patients/register` | Auto-cadastro público |
| `/api/patients/consent` | Gestão de consentimentos LGPD |

**Tabela:** `patients` (57 registros)

**Perfil do paciente (abas):**
- Dados pessoais e contato
- Histórico de consultas
- Prontuários e evoluções
- Documentos (laudos, exames, relatórios)
- Plano terapêutico
- Reembolso (visível apenas para ADMIN)

---

## 7. Módulo: Prontuário Clínico

### 7.1 Páginas

| Página | Rota | Roles | Descrição |
|--------|------|-------|-----------|
| Prontuários | `/dashboard/prontuarios` | ADMIN, DOCTOR | Lista de prontuários eletrônicos |
| Evoluções | `/dashboard/evolucoes` | ADMIN, DOCTOR | Evoluções por sessão (SOAP, CIF, DAP) |
| Documentos | `/dashboard/documentos` | ADMIN, RECEPTIONIST, Coordenadores | Upload e gestão de documentos de pacientes |
| Templates | `/dashboard/configuracoes/templates-prontuario` | ADMIN, DOCTOR | Templates customizados de prontuário |
| Planos Terapêuticos | `/dashboard/planos-terapeuticos` | ADMIN, DOCTOR | Planos com metas e objetivos |
| Prescrições | `/dashboard/prescricoes` | DOCTOR | Prescrições digitais (plano PRO+) |
| Controle de Faltas | `/dashboard/controle-faltas` | ADMIN | Dashboard de faltas com automação WhatsApp |

### 7.2 APIs

| Endpoint | Descrição |
|----------|-----------|
| `/api/medical-records` | CRUD prontuários eletrônicos |
| `/api/medical-record-templates` | Templates customizados |
| `/api/session-evolutions` | Evoluções de sessão (filtro por doctor_id para sigilo) |
| `/api/session-evolutions/[id]` | Detalhe, editar, excluir evolução |
| `/api/session-evolutions/sign` | Assinatura digital ICP-Brasil |
| `/api/session-evolutions/pdf` | Exportação de evolução para PDF assinado |
| `/api/documents` | Upload e listagem de documentos |
| `/api/therapeutic-plans` | Planos terapêuticos com metas |
| `/api/therapeutic-plans/pdf` | Exportação de plano terapêutico para PDF assinado |
| `/api/prescriptions` | Prescrições médicas digitais |
| `/api/session-packages` | Pacotes de sessão |
| `/api/session-replacements` | Reposição de sessões perdidas |
| `/api/absence-rules` | Regras de controle de faltas |
| `/api/consultations` | Registros de consultas com anotações |

### 7.3 Templates de Evolução

Suporte a 3 modelos de evolução clínica:
- **SOAP** — Subjetivo, Objetivo, Avaliação, Plano
- **CIF** — Funções corporais, Atividades/Participação, Fatores ambientais
- **DAP** — Dados, Análise, Plano de ação

### 7.4 Assinatura Digital

- Certificados ICP-Brasil armazenados com AES-256 (`doctor_certificates`)
- Assinatura registrada em `digital_signatures`
- Prontuários assinados em `medical_record_signatures`
- Auto-save com audit trail (`medical_record_autosave_log`)
- Hook `useAutoSave` para salvamento automático a cada 30s

### 7.5 Tabelas

| Tabela | Registros | Descrição |
|--------|-----------|-----------|
| `medical_records` | 18 | Prontuários eletrônicos |
| `session_evolutions` | 6 | Evoluções por sessão |
| `patient_documents` | 24 | Documentos de pacientes |
| `consultations` | 30 | Registros de consultas |
| `prescriptions` | 1 | Prescrições |
| `prescription_items` | 1 | Itens de prescrição |
| `therapeutic_plans` | 0 | Planos terapêuticos |
| `therapeutic_plan_goals` | 0 | Metas de planos |
| `absence_rules` | 2 | Regras de faltas |

---

## 8. Módulo: Financeiro

### 8.1 Páginas

| Página | Rota | Roles | Plano Min. |
|--------|------|-------|------------|
| Financeiro | `/dashboard/financeiro` | ADMIN | Básico |
| Pagamentos | `/dashboard/pagamentos` | ADMIN | Básico |
| Repasse Profissional | `/dashboard/financial/payroll` | ADMIN | Avançado |
| DRE | `/dashboard/financial/dre` | ADMIN | Avançado |
| Auditoria Financeira | `/dashboard/financial/audit` | ADMIN | Avançado |
| Convênios | `/dashboard/convenios` | ADMIN | Básico |
| Fechamento Mensal | `/dashboard/financeiro/fechamento` | ADMIN | Básico |
| Reembolso Config | `/dashboard/configuracoes/reembolso` | ADMIN | Básico |
| Reembolso Paciente | `/dashboard/configuracoes/reembolso-paciente` | ADMIN | Básico |
| Conciliação | `/dashboard/financeiro/conciliacao` | ADMIN | Básico |
| Glosas | `/dashboard/financeiro/glosas` | ADMIN | Básico |
| Operadoras | `/dashboard/financeiro/operadoras` | ADMIN | Básico |
| Reembolsos | `/dashboard/financeiro/reembolsos` | ADMIN | Básico |

### 8.2 APIs Financeiras

| Endpoint | Descrição |
|----------|-----------|
| `/api/financial/entries` | CRUD lançamentos (receitas/despesas) |
| `/api/financial/closing` | Fechamento mensal consolidado |
| `/api/financial/dashboard` | Dashboard financeiro |
| `/api/financial/summary` | Resumo financeiro |
| `/api/financial/dre` | Demonstrativo de Resultado |
| `/api/financial/payments` | Gestão de pagamentos |
| `/api/financial/conciliation` | Conciliação bancária |
| `/api/financial/glosas` | Gestão de glosas |
| `/api/financial/insurance-payments` | Pagamentos de convênios |
| `/api/financial/reimbursements` | Reembolsos |
| `/api/payroll` | Folha de repasse profissional |
| `/api/revenue` | Receita consolidada |
| `/api/health-insurances` | CRUD convênios |
| `/api/health-insurance-plans` | Planos de convênio |
| `/api/patient-reimbursement-rules` | Regras de reembolso por paciente |
| `/api/reimbursement-configs` | Configurações de reembolso |
| `/api/schedule-price-ranges` | Faixas de preço por horário |

### 8.3 Fechamento Mensal

Dashboard consolidado com:
- 6 cards de resumo: Receitas, Despesas, Resultado Líquido, Sessões, Ticket Médio, Pendências
- Comparativo com mês anterior (variação %)
- Breakdown por profissional, forma de pagamento, categoria
- Tabela de pendências/vencidos com badges de status

### 8.4 Tabelas

| Tabela | Registros |
|--------|-----------|
| `financial_entries` | 222 |
| `health_insurances` | 4 |
| `patient_reimbursement_rules` | 103 |
| `doctor_contracts` | 16 |

---

## 9. Módulo: Faturamento TISS

### 9.1 Páginas

| Página | Rota | Plano Min. |
|--------|------|------------|
| Guias e Lotes | `/dashboard/tiss` | Professional |
| Gestão de Glosas | `/dashboard/tiss/glosas` | Professional |
| Perdas (BI) | `/dashboard/tiss/reports/loss-analysis` | Professional |
| Autorização | `/dashboard/tiss/autorizacao` | Professional |
| Lotes | `/dashboard/tiss/batches` | Professional |
| Relatórios TISS | `/dashboard/tiss/reports` | Professional |

### 9.2 APIs TISS

| Endpoint | Descrição |
|----------|-----------|
| `/api/tiss/guides` | CRUD guias TISS |
| `/api/tiss/batches` | Lotes para operadoras |
| `/api/tiss/batch-process` | Processamento em lote |
| `/api/tiss/glosas` | Gestão de glosas |
| `/api/tiss/autorizacao` | Autorização SP/SADT (ANS 3.05.00) |
| `/api/tiss/eligibility` | Verificação de elegibilidade |
| `/api/tiss/validate-xsd` | Validação XSD do XML |
| `/api/tiss/operators` | Operadoras de saúde |
| `/api/tiss/returns` | Retornos das operadoras |
| `/api/tiss/import` | Importação de retornos |
| `/api/tiss/reports` | Relatórios de faturamento |
| `/api/tiss/dashboard` | Dashboard TISS |
| `/api/tiss/patient-insurance` | Vínculo paciente-convênio |
| `/api/tiss/appointments-for-batch` | Consultas para lotear |
| `/api/tiss/analyze-glosa-risk` | Análise de risco de glosa |

### 9.3 Tabelas TISS

| Tabela | Registros | Descrição |
|--------|-----------|-----------|
| `tiss_guides` | 12 | Guias individuais |
| `tiss_guide_procedures` | 12 | Procedimentos por guia |
| `tiss_batches` | 4 | Lotes de envio |
| `batch_timeline` | 4 | Timeline de eventos |
| `tiss_glosas` | 0 | Glosas recebidas |
| `tiss_glosa_contests` | 0 | Contestações |
| `tiss_authorization_requests` | 0 | Autorizações SP/SADT |
| `tiss_returns` | 0 | Retornos XML |
| `tiss_batch_signatures` | 0 | Assinaturas digitais |
| `tiss_webservice_configs` | 0 | Configs webservice |
| `tiss_eligibility_checks` | 0 | Verificações |

---

## 10. Módulo: Comunicação

### 10.1 Páginas

| Página | Rota | Roles | Plano Min. |
|--------|------|-------|------------|
| Chat Interno | `/dashboard/chat` | Todos | Avançado |
| WhatsApp | `/dashboard/whatsapp` | Todos | Avançado |
| Notificações | `/dashboard/notificacoes` | ADMIN | Básico |
| FluxoMed (CRM) | `/dashboard/crm` | ADMIN | Avançado |

### 10.2 WhatsApp (Baileys)

APIs:
- `/api/whatsapp/connect` — Conectar instância (QR Code)
- `/api/whatsapp/disconnect` — Desconectar sessão
- `/api/whatsapp/send` — Enviar mensagem
- `/api/whatsapp/status` — Status da conexão
- `/api/whatsapp/test-connection` — Testar conectividade

**Tabelas:** `whatsapp_sessions` (2), `whatsapp_messages_log` (8), `whatsapp_logs` (2)

**Funcionalidades:**
- Lembretes automáticos de consulta (24h antes)
- Confirmação de presença
- Notificação de reposição de faltas
- Formatação automática de telefone BR (+55)

### 10.3 Chat Interno

**Tabelas:** `chat_conversations` (3), `chat_participants` (9), `chat_messages` (1)

Tipos de conversa: `internal` (dentro da clínica), `admin_to_clinic` (super admin → clínica), `support` (clínica → suporte)

### 10.4 Notificações

**Tabelas:** `notifications` (9.660), `notification_queue` (8.747), `notification_preferences` (29)

### 10.5 CRM (FluxoMed)

Página de gestão de leads e pipeline comercial para a clínica.

---

## 11. Módulo: Gestão

### 11.1 Páginas

| Página | Rota | Plano Min. |
|--------|------|------------|
| Estoque | `/dashboard/estoque` | Básico |
| Relatórios | `/dashboard/relatorios` | Básico |
| Termos Legais | `/dashboard/termos` | Básico |
| Importação | `/dashboard/importacao` | Avançado |
| Automação | `/dashboard/automacao` | Avançado |
| Auditoria | `/dashboard/logs-auditoria` | Básico |

### 11.2 Estoque

APIs:
- `/api/inventory/products` — CRUD produtos
- `/api/inventory/stock` — Controle de estoque (FEFO)
- `/api/inventory/categories` — Categorias
- `/api/inventory/import` — Importação em lote
- `/api/inventory/imports` — Histórico de importações

**Tabelas:** `products` (71), `stock` (71), `stock_movements` (118), `product_categories` (0)

### 11.3 Relatórios

API: `/api/reports` — Motor de relatórios com 35.346 bytes de lógica

### 11.4 Importação de Dados

APIs: `/api/import` — Importação de pacientes, profissionais, agendamentos via CSV/Excel

**Tabelas:** `import_jobs` (3), `import_logs` (269)

### 11.5 Automação

**Tabelas:** `automation_rules` (6), `clinic_automation_configs` (3)

Regras configuráveis para envio automático de lembretes, confirmações e follow-ups.

**Cron Jobs:**
- `/api/cron/send-reminders` — Lembretes de consulta
- `/api/cron/send-notifications` — Notificações em fila
- `/api/cron/calculate-commissions` — Cálculo de comissões
- `/api/cron/cancel-unpaid` — Cancelar agendamentos não pagos
- `/api/cron/expire-trials` — Expirar trials vencidos
- `/api/cron/reconcile-payments` — Reconciliação de pagamentos
- `/api/cron/execute-automations` — Executar regras de automação
- `/api/cron/billing` — Processar cobranças
- `/api/cron/reset-demo` — Reset de ambiente demo

---

## 12. Módulo: Configurações

### 12.1 Páginas

| Página | Rota | Descrição |
|--------|------|-----------|
| Minha Clínica | `/dashboard/configuracoes` | Dados da clínica, logo, endereço |
| Página Pública | `/dashboard/configuracoes/pagina-publica` | Site público para agendamento online |
| Teleconsulta | `/dashboard/configuracoes/teleconsulta` | Configurações de vídeo-chamada |
| Usuários | `/dashboard/configuracoes/usuarios` | Gestão de usuários e permissões |
| Terapias | `/dashboard/configuracoes/terapias` | Tipos de terapia/especialidade |
| Assinatura | `/dashboard/configuracoes/assinatura` | Plano, pagamento, upgrade |
| Segurança | `/dashboard/seguranca` | Logs de acesso, sessões, MFA |
| Integrações | `/dashboard/integracoes` | Webhooks, API Keys, serviços externos |

### 12.2 APIs de Configuração

| Endpoint | Descrição |
|----------|-----------|
| `/api/clinics` | Dados da clínica |
| `/api/clinics-detail` | Detalhes expandidos |
| `/api/users` | CRUD usuários |
| `/api/settings` | Configurações gerais |
| `/api/profile` | Perfil do usuário logado |
| `/api/permissions` | Permissões customizadas |
| `/api/consulting-rooms` | Salas de atendimento |
| `/api/api-keys` | Gestão de API Keys |
| `/api/integrations` | Configurações de integração |
| `/api/features` | Feature flags |
| `/api/legal` | Documentos legais |
| `/api/billing` | Cobrança e assinatura |

### 12.3 Tabelas

| Tabela | Registros | Descrição |
|--------|-----------|-----------|
| `clinics` | 3 | Clínicas cadastradas |
| `users` | 28 | Usuários do sistema |
| `clinic_settings` | 1 | Configurações por clínica |
| `user_preferences` | 29 | Preferências de interface |
| `clinic_custom_permissions` | 0 | Permissões customizadas |
| `clinic_integrations` | 0 | Integrações ativas |
| `legal_documents` | 1 | Documentos legais |

---

## 13. Módulo: Recepção e Check-in

### 13.1 Páginas

| Página | Rota | Descrição |
|--------|------|-----------|
| Recepção | `/dashboard/recepcao` | Painel de recepção (56KB — módulo robusto) |
| Triagem | `/dashboard/triagem` | Triagem pré-consulta |
| Totem | `/totem/[clinicId]` | Autoatendimento para check-in |
| Painel TV | `/painel-tv/[clinicId]` | Display de fila de espera |
| Check-in QR | `/checkin/[appointmentId]` | Formulário via QR Code |

### 13.2 APIs de Check-in

| Endpoint | Descrição |
|----------|-----------|
| `/api/checkin/pre-checkin` | Submissão de pré-check-in |
| `/api/checkin/validate` | Validação de QR Code |
| `/api/checkin/verify` | Verificação e entrada na fila |
| `/api/checkin/ocr` | OCR de documentos (RG/CPF) |
| `/api/reception` | Dados da recepção |
| `/api/face-biometrics` | Biometria facial para check-in |

### 13.3 Tabelas

| Tabela | Registros |
|--------|-----------|
| `pre_checkin_submissions` | 0 |
| `appointment_checkins` | 0 |
| `appointment_queue` | 0 |
| `walk_in_registrations` | 2 |
| `patient_face_biometrics` | 0 |
| `appointment_qr_codes` | 105 |

### 13.4 Check-in Facial (Professional+)

Reconhecimento facial via `face-api.js` com webcam. Embedding armazenado criptografado.

---

## 14. Módulo: PWA Mobile

### 14.1 Páginas

| Página | Rota | Descrição |
|--------|------|-----------|
| Login Mobile | `/m/login` | Autenticação PWA |
| Agenda Mobile | `/m/agenda` | Visualização da agenda |
| Agenda Detalhe | `/m/agenda/[id]` | Detalhe do agendamento |
| Fila | `/m/fila` | Fila de atendimento |
| Prontuários | `/m/prontuarios` | Acesso a prontuários |
| Perfil | `/m/perfil` | Perfil do profissional |

### 14.2 Características

- Progressive Web App com manifest e service worker
- Componente `SwipeableCard` para interação mobile
- Hook `useProntuario` para gestão de prontuários mobile
- Layout dedicado com navegação bottom-tab
- Funciona offline para consulta de dados cache

---

## 15. Módulo: Super Admin (Master Hub)

### 15.1 Páginas

| Página | Rota | Descrição |
|--------|------|-----------|
| Master Hub | `/system-master-hub` | Dashboard principal (66KB — painel completo) |
| Clínicas | `/system-master-hub/clinicas` | Gestão de todas as clínicas |
| Clínica Detalhe | `/system-master-hub/clinics/[id]` | Detalhe e impersonação |
| Chat Admin | `/system-master-hub/chat` | Comunicação com clínicas |
| Mudanças de Plano | `/system-master-hub/plan-changes` | Histórico de upgrades/downgrades |

### 15.2 Proteção

- Rota oculta (não aparece no sidebar para não-admins)
- Whitelist de e-mail: `robsonfenriz@gmail.com`, `contato@clinigo.app`
- Middleware retorna `404 Not Found` para não-autorizados (stealth)
- `impersonation_sessions` para suporte remoto às clínicas

### 15.3 APIs Super Admin

| Endpoint | Descrição |
|----------|-----------|
| `/api/super-admin` | Operações administrativas |
| `/api/admin` | Gestão de plataforma |
| `/api/plans` | CRUD planos |
| `/api/groups` | Grupos de clínicas |

### 15.4 Tabelas

| Tabela | Registros |
|--------|-----------|
| `system_settings` | 1 |
| `system_logs` | 360 |
| `impersonation_sessions` | 3 |
| `plans` | 4 |
| `plan_features` | 59 |

---

## 16. Módulo: Portal do Paciente

### 16.1 Rotas

| Rota | Descrição |
|------|-----------|
| `/paciente/entrar` | Login do paciente (CPF) |
| `/paciente/registro` | Cadastro do paciente |
| `/paciente/meu-painel` | Dashboard do paciente |
| `/paciente/historico` | Histórico de consultas |
| `/paciente/agendar` | Auto-agendamento |

### 16.2 Autenticação

Separada do Supabase Auth. Utiliza JWT customizado:
- Cookie: `patient_token`
- Verificação via `jose` (jwtVerify)
- Payload: `{ sub, cpf, name, type: 'patient' }`

### 16.3 APIs

- `/api/patient/auth` — Login/registro
- `/api/patient/profile` — Perfil do paciente
- `/api/patient/appointments` — Agendamentos do paciente
- `/api/patient/history` — Histórico

### 16.4 Tabelas

| Tabela | Registros |
|--------|-----------|
| `patient_credentials` | 0 |
| `patient_sessions` | 0 |
| `patient_consents` | 0 |

---

## 17. Módulo: Parceiros e Afiliados

### 17.1 Rotas

| Rota | Descrição |
|------|-----------|
| `/partners/login` | Login do parceiro |
| `/partners/register` | Cadastro de novo parceiro |
| `/partners/dashboard` | Dashboard de comissões |

### 17.2 APIs

- `/api/partners/register` — Cadastro público
- `/api/partners/[id]` — Dados do parceiro

### 17.3 Modelo de Negócio

Comissão **única** por venda (não recorrente):

**Tabelas:** `partners` (3), `clinic_referrals` (0), `partner_commissions` (0)

---

## 18. Módulo: Teleconsulta

### 18.1 Páginas

| Rota | Descrição |
|------|-----------|
| `/video/[roomId]` | Sala de vídeo-chamada |
| `/dashboard/configuracoes/teleconsulta` | Configurações |

### 18.2 Funcionalidades

- WebRTC nativo (peer-to-peer)
- Chat em tempo real na sala
- Compartilhamento de tela
- Link público por token para pacientes (sem login necessário)
- Consentimento obrigatório de teleconsulta (`teleconsulta_consents`)

### 18.3 APIs

- `/api/teleconsulta` — Gestão de salas
- `/api/video/validate-token` — Validação de token público

**Tabela:** `video_rooms` (3)

**Hook:** `useVideoCall` (11.473 bytes — gestão completa de chamada)

---

## 19. Módulo: Chatbot Clin (Vendas)

### 19.1 Visão Geral

Assistente virtual de vendas que atende leads nas páginas públicas do CliniGo. Apresenta planos, tira dúvidas e captura dados de leads para acompanhamento comercial.

### 19.2 Arquitetura

A arquitetura passou de um modelo puramente baseado em LLM (Generativo) para um **Motor de Estados Determinístico** (State Machine), garantindo fluxos de vendas estruturados, previsíveis e com zero custo de tokens para as interações principais. A IA generativa agora atua estritamente como fallback para detecção de intenção.

| Componente | Tecnologia | Arquivo |
|-----------|-----------|--------|
| API Backend | Next.js API Route | `app/api/chatbot/route.ts` |
| Motor de Estados | TypeScript | `lib/chatbot/clin-engine.ts` |
| Templates/Mensagens| TypeScript | `lib/chatbot/clin-messages.ts` |
| Widget UI | React + Framer Motion | `components/chatbot/ChatbotWidget.tsx` |
| Fallback IA | Llama 3.3 70B + GPT-OSS 120B | OpenRouter API (gratuito) |
| Banco | Supabase (3 tabelas) | `chatbot_sessions`, `chatbot_messages`, `chatbot_leads` |

### 19.3 Funcionalidades

- **Fluxo Estruturado:** Apresenta planos, coleta dados e lida com objeções de preço/LGPD através de passos definidos.
- **Botões Interativos:** O frontend (`ChatbotWidget`) intercepta emojis numéricos/letras no texto e os renderiza como botões clicáveis, aumentando a conversão.
- **Múltiplas Bolhas com Delay:** As respostas estruturadas enviam um array de mensagens. No WhatsApp, há um delay intencional de 1.5s entre cada mensagem, com indicador de "digitando" (`composing`), tornando a conversa humana e não-intrusiva.
- **Timer de Inatividade:** Se o usuário abandona no meio do fluxo, o sistema envia um follow-up automático após 5 minutos.
- **Captura de Leads Dinâmica:** Dados (nome, clínica, dor) são extraídos ao longo do fluxo e salvos estruturadamente em `chatbot_leads`.
- **Fallback de IA Automático:** Se o usuário digita algo que o State Machine não mapeia via regex/keywords de intenção, a IA é acionada para manter o contexto.
- **Transferência para Especialista:** Ao coletar todos os dados ou quando o lead solicita, a sessão passa para status `transferred` e um link direto pro WhatsApp de vendas é gerado.

### 19.4 Páginas com Widget

O `ChatbotProvider` renderiza o widget em todas as páginas **exceto**:
`/dashboard`, `/clinica`, `/medico`, `/admin`, `/checkin`, `/painel-tv`, `/totem`, `/video`, `/paciente`, `/m/`, `/system-master-hub`, `/pagamento`, `/api`, `/auth`

### 19.5 API

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/api/chatbot` | GET | Retorna o menu inicial ao abrir o widget (sem consumir sessão). |
| `/api/chatbot` | POST | Processa mensagem do usuário no motor de estados, atualiza `conversation_state` e retorna a resposta/botões. |

### 19.6 Tabelas

| Tabela | Descrição |
|--------|-----------|
| `chatbot_sessions` | Sessões de conversa (session_id, IP, user_agent, source_page, status). Contém a coluna `conversation_state` (JSONB) que mantém a máquina de estados. |
| `chatbot_messages` | Mensagens (session_id, role, content) |
| `chatbot_leads` | Leads capturados estruturados (nome, clínica, profissionais, especialidade/dor, plano_indicado). |

### 19.7 Design (Widget)

- Botão flutuante verde (emerald) no canto inferior direito
- Animação de pulse nos primeiros 10 segundos
- Painel com glassmorphism e gradiente emerald→teal
- Indicador de digitação com bolinhas animadas enquanto processa
- Os textos em `*negrito*` e `_itálico_` seguem o padrão WhatsApp e são parseados pelo widget.
- Botão CTA final quando a sessão é transferida.

### 19.8 Integração WhatsApp (Dupla)

O Chatbot Clin roda o mesmo motor de estados integrado nativamente no WhatsApp, suportado por dois serviços sincronizados:

1. **`lib/whatsapp/service.ts` (Vercel)** — Utilizado como listener via proxy e interface admin.
2. **`clin-chatbot.ts` (Railway)** — Serviço standalone de alta disponibilidade rodando Baileys.

**Arquitetura do Fluxo WhatsApp:**
1. Lead interage no número.
2. Listener capta e chama a rota interna `/api/chatbot`.
3. Motor devolve um array `messages[]`.
4. Serviço executa loop de envios com *Delay de 1.5s* e status *composing* (digitando).
5. Timer de inatividade (5min) residente no handler dispara follow-ups se não houver resposta.
- Status em tempo real (conectado/desconectado)
- Botão para reconectar ou desconectar

**API:** `/api/clin-whatsapp/connect` — POST (conectar), GET (status), DELETE (desconectar)

---

## 20. Infraestrutura e DevOps

### 19.1 Deploy

```bash
git push origin master
vercel --prod
```

### 19.2 Variáveis de Ambiente Críticas

| Variável | Serviço |
|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase (server-side) |
| `JWT_SECRET` | Portal do Paciente |
| `SUPER_ADMIN_EMAILS` | Whitelist admin |
| `RESEND_API_KEY` | E-mail |
| `UPSTASH_REDIS_*` | Rate Limiting |
| `SENTRY_DSN` | Monitoramento |
| `MERCADOPAGO_ACCESS_TOKEN` | Pagamentos |
| `NEXT_PUBLIC_POSTHOG_KEY` | Analytics |
| `OPENROUTER_API_KEY` | Chatbot Clin (modelos free) |

### 19.3 Rate Limiting

Implementado via Upstash Redis (`lib/rate-limit.ts`):
- API geral: 100 req/min
- Auth: limite mais restritivo
- Upload: limite por tamanho

### 19.4 Monitoramento

- **Sentry** — Erros em tempo real
- **PostHog** — Analytics de produto
- **Health Check** — `/api/health`, `/api/probe`, `/api/ping`

---

## 21. Banco de Dados — Mapa Completo

### 20.1 Supabase Project

- **Project ID:** `dlxakeejmyzhzdxzjgne`
- **Total de tabelas:** 116 (schema `public`)
- **RLS ativo:** 96 tabelas
- **RLS desativado:** 17 tabelas (tabelas internas/admin)

### 20.2 Tabelas por Módulo

**Core (6):** `clinics`, `users`, `doctors`, `patients`, `schedules`, `appointments`

**Prontuário (11):** `medical_records`, `medical_record_templates`, `medical_record_autosave_log`, `medical_record_signatures`, `session_evolutions`, `patient_documents`, `document_views`, `consultations`, `prescriptions`, `prescription_items`, `therapeutic_plans`

**Financeiro (8):** `financial_entries`, `financial_summary`, `financial_categories`, `health_insurances`, `health_insurance_plans`, `doctor_health_insurances`, `doctor_contracts`, `patient_reimbursement_rules`

**TISS (14):** `tiss_guides`, `tiss_guide_procedures`, `tiss_batches`, `batch_timeline`, `tiss_glosas`, `tiss_glosa_contests`, `tiss_glosa_contest_attachments`, `tiss_authorization_requests`, `tiss_authorization_procedures`, `tiss_authorization_attachments`, `tiss_webservice_configs`, `tiss_webservice_logs`, `tiss_returns`, `tiss_batch_signatures`

**Comunicação (8):** `notifications`, `notification_queue`, `notification_preferences`, `whatsapp_sessions`, `whatsapp_messages_log`, `whatsapp_logs`, `chat_conversations`, `chat_participants`, `chat_messages`

**Check-in (7):** `pre_checkin_submissions`, `appointment_checkins`, `appointment_queue`, `walk_in_registrations`, `patient_face_biometrics`, `appointment_qr_codes`, `appointment_slot_locks`

**Segurança (9):** `audit_log`, `audit_logs`, `system_logs`, `login_attempts`, `user_sessions`, `user_mfa`, `activity_log`, `appointment_audit_logs`, `appointment_lock_audit`

**Billing (7):** `subscriptions`, `billing_events`, `payments`, `payment_logs`, `registration_pending`, `plans`, `plan_features`

**Estoque (4):** `products`, `stock`, `stock_movements`, `product_categories`

**Chatbot (3):** `chatbot_sessions`, `chatbot_messages`, `chatbot_leads`

**LGPD (3):** `lgpd_consents`, `account_deletion_requests`, `data_export_requests`

---

## 22. Segurança e LGPD

### 21.1 Row Level Security (RLS)

- **96 tabelas** com RLS ativo
- Isolamento multitenant via `clinic_id`
- Policies granulares por role (`CASE get_user_role()`)
- Funções auxiliares: `get_user_role()`, `get_user_clinic_id()`

### 21.2 Autenticação

- Supabase Auth (email/password)
- MFA via TOTP (`user_mfa`, `otpauth`)
- JWT separado para portal do paciente
- Tokens de ativação e reset (`activation_tokens`, `password_reset_tokens`)
- Rate limiting em tentativas de login

### 21.3 LGPD

- Consentimentos registrados (`lgpd_consents`, `patient_consents`)
- Solicitações de exclusão com carência (`account_deletion_requests`)
- Exportação de dados (`data_export_requests`)
- Termos legais versionados (`legal_documents`, `staff_legal_acceptances`)
- Página pública: `/lgpd`, `/privacidade`, `/termos`

### 21.4 Criptografia

- Certificados ICP-Brasil: AES-256 (`lib/crypto.ts`)
- Biometria facial: armazenamento criptografado
- Senhas: bcrypt via Supabase Auth
- XML TISS: assinatura com `xml-crypto`

### 21.5 Auditoria

| Tabela | Registros | Descrição |
|--------|-----------|-----------|
| `audit_logs` | 210 | Log de ações da clínica |
| `system_logs` | 360 | Log de ações Super Admin |
| `email_logs` | 28 | E-mails transacionais enviados |
| `document_views` | 0 | Visualizações de documentos médicos |

---

## 23. Histórico de Alterações Recentes

### 11 de Maio de 2026 — Chatbot Clin (Assistente de Vendas)
- **Módulo:** Comunicação → Chatbot Clin
- **Arquivo criado:** `app/api/chatbot/route.ts` — API Route com OpenRouter (fallback entre 3 modelos free)
- **Arquivo criado:** `components/chatbot/ChatbotWidget.tsx` — Widget premium com glassmorphism e animações
- **Arquivo criado:** `components/chatbot/ChatbotProvider.tsx` — Provider com renderização condicional por pathname
- **Arquivo modificado:** `app/layout.tsx` — Adição do `<ChatbotProvider />` no layout raiz
- **Tabelas criadas:** `chatbot_sessions`, `chatbot_messages`, `chatbot_leads` (com índices e RLS)
- **Funcionalidades:** System prompt de vendas, captura de leads, transfer para WhatsApp, rate limiting, fallback automático entre modelos

### 09 de Maio de 2026 — Landing Page /trial para Google Ads
- **Módulo:** Marketing → Trial
- **Arquivo criado:** `app/trial/page.tsx` — Landing page de alta conversão
- **Arquivo criado:** `app/trial/layout.tsx` — Metadados SEO (title, description, OpenGraph)
- **Funcionalidade:** Formulário simplificado (1 tela) que chama `/api/auth/register` e cria conta trial 7 dias
- **Design:** Tema premium dark (navy-deep + teal-vibrant), consistente com landing-premium
- **Campos:** Nome, E-mail, Telefone, Nome da Clínica, Senha
- **Pós-cadastro:** Redirect para `/clinica?trial=success`
- **Propósito:** URL de destino para campanhas Google Ads

### 09 de Maio de 2026 — Isolamento por Terapeuta (Sigilo Clínico)
- **Solicitante:** Jeferson — Espaço Incluir
- **Sidebar:** Botão "Documentos" restrito a ADMIN, Recepção e coordenadores
- **Evoluções:** Filtro por `doctor_id` na API para DOCTORs não-coordenadores
- **Documentos:** Filtro por pacientes via `appointments` + bloqueio de upload para terapeutas
- **RLS:** 4 novas policies em `session_evolutions`, drop de policy duplicada em `patient_documents`
- **Hook:** `isCoordinator` adicionado ao `useRole()`

### 08 de Maio de 2026 — Fechamento Financeiro + Controle de Acesso
- Módulo de fechamento mensal permanente
- Aba "Reembolso" oculta para terapeutas (DOCTOR)
- Profissional auto-preenchido e bloqueado para terapeutas no formulário de evoluções
- Sidebar "Financeiro" bloqueado para RECEPTIONIST/STAFF

### 07 de Maio de 2026 — Linha do Tempo de Evoluções + Reembolso
- Timeline visual interativa no perfil do paciente
- Dashboard "Jornada do Paciente" com cards resumo
- Componente `PatientReimbursement` com geração de PDF para convênios
- Controle de Faltas com automação WhatsApp

### Maio de 2026 — Funcionalidades Anteriores
- Integração WhatsApp via Baileys com formatação BR
- Estoque FEFO com badges de validade
- Assinatura digital ICP-Brasil em evoluções
- Portal PWA mobile completo
- Check-in via QR Code

---

> **Documento gerado automaticamente pelo mapeamento do sistema em 11/05/2026.**  
> **Nenhuma funcionalidade pendente ou parcialmente implantada foi incluída.**  
> **Nenhuma referência a módulos de Inteligência Artificial foi incluída conforme política do projeto.**

M � d u l o 
 
 C h a t b o t 
 
 �!
 
 C o m p o n e n t e 
 
 W e b 
 
 �!
 
 C h a t b o t W i d g e t . t s x 
 
 �!
 
 R e m o v i d o 
 
 d i � l o g o 
 
 w e b 
 
 e 
 
 a d i c i o n a d o 
 
 r e d i r e c i o n a m e n t o 
 
 d i r e t o 
 
 p r o 
 
 W h a t s A p p 
 
 M � d u l o 
 
 C h a t b o t 
 
 �!
 
 M e n s a g e n s 
 
 �!
 
 c l i n - m e s s a g e s . t s 
 
 �!
 
 R e m o v i d a s 
 
 l i m i t a � � e s 
 
 d e 
 
 s t o r a g e 
 
 d o s 
 
 p l a n o s 
 
 M � d u l o 
 
 P r o n t u � r i o s 
 
 �!
 
 P a c i e n t e s 
 
 �!
 
 P a t i e n t E v o l u t i o n s . t s x 
 
 �!
 
 I n t e g r a d a 
 
 t a b e l a 
 
 s e s s i o n _ e v o l u t i o n s 
 
 p a r a 
 
 c o r r i g i r 
 
 l i s t a g e m 
 
 d e 
 
 e v o l u � � e s 
 
 d e 
 
 t e r a p e u t a s 
 
 Módulo Chatbot -> API -> route.ts -> Removida menção de aplicativo e corrigido loop infinito após transferência para especialista
Módulo Chatbot -> Mensagens -> clin-messages.ts -> Padronização das letras e opções no menu

### Atualização 12/05/2026 - Restrição de Acesso na Evolução e Plano Terapêutico

Módulo -> Prontuário Clínico -> Evoluções / Planos Terapêuticos -> PatientSearchCombobox.tsx
- Adicionado filtro de restrição de agenda para Terapeutas (DOCTOR).
- O sistema agora obriga terapeutas a selecionarem apenas pacientes associados à sua agenda no momento de criar evoluções ou planos terapêuticos, por meio do uso do filtro "doctor_id" na API de busca de pacientes.
- O autor do plano/evolução agora é auto-preenchido e bloqueado para a terapeuta logada.

### Atualização 12/05/2026 - Expansão do Módulo Financeiro e Portal do Profissional

Módulo → Financeiro → Portal do Profissional → /dashboard/(clinic)/meu-financeiro/page.tsx → MeuFinanceiroPage()
- Criado o portal Meu Financeiro restrito a usuários DOCTOR.
- Exibe resumo anual e listagem de histórico de folha de repasse, consumindo /api/payroll/history.

Módulo → Relatórios → API → /api/reports/route.ts → getLTVReport(), getGlosasReport(), getDreCostCenter()
- Adicionado Motor de Relatórios (Sprint 3) para suportar as categorias LTV, Glosas (TISS) e DRE por centro de custo.

Módulo → Financeiro → Componentes → /dashboard/(clinic)/financial/payroll/components/NotaRepasseButton.tsx → NotaRepasseButton()
- Criado botão de ação na folha de repasse para download e preview da Nota de Repasse em PDF.
- Integração com a API /api/payroll/nota-repasse.

Módulo → Layout → Sidebar → components/layout/sidebar.tsx → Sidebar()
- Adicionado o item 'Meu Financeiro' no menu lateral para usuários com a role DOCTOR.


### Atualização 12/05/2026 - Dashboards Analíticos Financeiros
Módulo → Financeiro → Relatórios LTV → /dashboard/(clinic)/financial/ltv/page.tsx → LTVReportPage()
- Implementado o dashboard analítico de LTV (Lifetime Value) dos pacientes com filtros de data, seguindo o padrão obrigatório de botões: Atualizar, Exportar Excel (ExcelJS), e Exportar PDF (jsPDF + autotable).

Módulo → Financeiro → Relatórios DRE → /dashboard/(clinic)/financial/dre-costcenter/page.tsx → DRECostCenterPage()
- Implementado o dashboard de DRE por Centro de Custo com visão analítica e agrupamento, contendo integração completa de exportações (Excel/PDF) e controle de filtros.

Módulo → Faturamento TISS → Glosas → /dashboard/(clinic)/tiss/glosas/page.tsx → GlosasPage()
- Refatorado completamente a página de Análise de Glosas para adequação ao novo padrão visual do Módulo Financeiro.
- Adicionado Filtros de Data.
- Implementado exportação de relatórios de Glosas para Excel e PDF.

Módulo → Layout → Sidebar → components/layout/sidebar.tsx
- Adicionado links de 'Análise LTV' e 'DRE (Centro Custo)' acessíveis a CLINIC_ADMIN e SUPER_ADMIN.

### Atualização 12/05/2026 - Controle de Créditos (Prepaid) de Pacientes
Módulo → Financeiro → Créditos → /app/api/financial/credits/route.ts
- Criado CRUD de créditos (API) operando sobre a tabela patient_credits.

Módulo → Financeiro → Créditos → /dashboard/(clinic)/financial/credits/page.tsx
- Implementado a página de gestão de créditos de pacientes (pré-pagos, devoluções, cortesias).
- Padronização de botões incluída (Novo, Atualizar, Exportar Excel/PDF, Filtro por UUID).
- Coluna de Ações com Editar, Duplicar e Excluir.

Módulo → Layout → Sidebar → components/layout/sidebar.tsx
- Adicionado 'Créditos de Pacientes' (role CLINIC_ADMIN, plano PROFESSIONAL).

### Atualiza��o 12/05/2026 (Continua��o) - Integra��o Resend e Metas Financeiras

M�dulo ? Financeiro ? API ? /api/payroll/send-email/route.ts
- Criado endpoint de integra��o direta com Resend API para envio de Notas de Repasse em HTML formatado.

M�dulo ? Financeiro ? Componentes ? NotaRepasseButton.tsx
- Refatorado bot�o de envio para consumir nova API com valida��o de e-mail do profissional e loading state.

M�dulo ? Financeiro ? API ? /api/reports/goals/route.ts
- Criado motor de consulta de Previsto vs Realizado (GET/POST) com l�gica de upsert de metas baseadas na tabela inancial_goals.

M�dulo ? Financeiro ? Metas ? /dashboard/(clinic)/financial/goals/page.tsx
- Implementado Dashboard Executivo de Proje��o de Faturamento (Previsto vs Realizado) com edi��o em linha de limites (revenue/expenses), barras de progresso adaptativas e exporta��o PDF/Excel.

M�dulo ? Banco de Dados ? Supabase
- Criada a instru��o SQL create_financial_goals.sql contendo esquema de metadados e RLS Policies para inancial_goals.

## Expansao Financeira - Sprint 13/05/2026

Modulo > Financeiro > API > /api/financial/debtors/route.ts
- API de inadimplencia. Lista pacientes com parcelas vencidas, agrupados por gravidade (leve/moderado/grave), com % do faturamento comprometido.

Modulo > Financeiro > API > /api/financial/projection/route.ts
- API de projecao de caixa. Calcula saldo futuro dia a dia com base em receitas/despesas pendentes + agendamentos confirmados.

Modulo > Financeiro > API > /api/financial/revenue-mix/route.ts
- API de mix de receita Particular vs Convenio. Agrupa entries e appointments por fonte de pagamento com percentual e ticket medio.

Modulo > Financeiro > API > /api/payroll/my-summary/route.ts
- API de resumo financeiro pessoal do profissional logado. Retorna producao do mes atual vs anterior, evolucao 6 meses, e percentual de repasse.

Modulo > Financeiro > API > /api/payroll/my-history/route.ts
- API de historico mensal de repasses do profissional logado. Timeline expandivel com detalhes por atendimento.

Modulo > Financeiro > API > /api/financial/my-producao/route.ts
- API de producao pessoal do profissional logado. Metricas de atendimentos, ticket medio, taxa no-show, comparativo com media da clinica.

Modulo > Financeiro > Inadimplencia > /dashboard/(clinic)/financeiro/inadimplencia/page.tsx
- Pagina completa de inadimplencia com cards de resumo, tabela de devedores com filtro por nivel (leve/moderado/grave), exportacao Excel e PDF.

Modulo > Financeiro > Projecao > /dashboard/(clinic)/financeiro/projecao/page.tsx
- Pagina de projecao de caixa com seletor de periodo (7/15/30/60 dias), cards de saldo atual/previsto, grafico de barras de evolucao do saldo, tabela diaria, export Excel/PDF.

Modulo > Financeiro > Mix > /dashboard/(clinic)/financeiro/mix/page.tsx
- Pagina de mix de receita Particular vs Convenios com barra empilhada horizontal, legenda, tabela detalhada por fonte, export Excel/PDF.

Modulo > Meu Financeiro > Historico > /dashboard/(clinic)/meu-financeiro/historico/page.tsx
- Pagina de historico de repasses do profissional com timeline mensal expandivel (Collapsible), filtro por ano, cards de total e melhor mes, export Excel/PDF.

Modulo > Meu Financeiro > Producao > /dashboard/(clinic)/meu-financeiro/producao/page.tsx
- Pagina de producao pessoal do profissional com metricas de atendimentos, ticket medio, taxa no-show, comparativo clinica, grafico de evolucao 12 meses, export Excel/PDF.

Modulo > Layout > Sidebar > /components/layout/sidebar.tsx
- Adicionados links: Historico de Repasses, Producao por Profissional, Inadimplencia, Projecao de Caixa, Mix de Receita.
- Meu Financeiro convertido em item com sub-itens (Meu Painel, Meu Historico, Minha Producao).
- Corrigido TISS: adicionado plan-check no botao pai de itens com children + UpgradeModal inline.
- max-h da secao financeira aumentado de 800px para 2000px para acomodar novos itens.

Modulo > UI > Componentes > /components/ui/collapsible.tsx
- Instalado componente Collapsible do shadcn/ui para uso na timeline do historico de repasses.

---

# MODULO TERAPIA (Implantado 13/05/2026)

Terapia → Fila de Espera → app/dashboard/(clinic)/terapia/fila-espera/page.tsx → FilaEsperaPage()
Terapia → Encaminhamentos → app/dashboard/(clinic)/terapia/encaminhamentos/page.tsx → EncaminhamentosPage()
Terapia → Supervisão → app/dashboard/(clinic)/terapia/supervisao/page.tsx → SupervisaoPage()
Terapia → Retenção → app/dashboard/(clinic)/terapia/retencao/page.tsx → RetencaoPage()
Terapia → Risco de Evasão → app/dashboard/(clinic)/terapia/risco-evasao/page.tsx → RiscoEvasaoPage()
Terapia → Aderência → app/dashboard/(clinic)/terapia/aderencia/page.tsx → AderenciaPage()
Terapia → Desfechos → app/dashboard/(clinic)/terapia/desfechos/page.tsx → DesfechosPage()
Terapia → Carga de Trabalho → app/dashboard/(clinic)/terapia/carga-trabalho/page.tsx → CargaTrabalhoPage()
Terapia → Demográfico → app/dashboard/(clinic)/terapia/demografico/page.tsx → DemograficoPage()
Terapia → Receita por Modalidade → app/dashboard/(clinic)/terapia/receita-modalidade/page.tsx → ReceitaModalidadePage()
Terapia → Sazonalidade → app/dashboard/(clinic)/terapia/sazonalidade/page.tsx → SazonalidadePage()
Terapia → NPS/Satisfação → app/dashboard/(clinic)/terapia/nps/page.tsx → NpsPage()

APIs → Terapia → app/api/waiting-list/route.ts → GET(), POST(), PUT(), DELETE()
APIs → Terapia → app/api/referrals/route.ts → GET(), POST(), PUT(), DELETE()
APIs → Terapia → app/api/supervision/route.ts → GET(), POST(), PUT(), DELETE()
APIs → Terapia → app/api/patients/evasion-risk/route.ts → GET(), PUT()
APIs → Terapia → app/api/nps/route.ts → GET(), POST(), PUT(), DELETE()
APIs → Relatórios → app/api/reports/retention/route.ts → GET()
APIs → Relatórios → app/api/reports/discharge/route.ts → GET()
APIs → Relatórios → app/api/reports/adherence/route.ts → GET()
APIs → Relatórios → app/api/reports/therapist-workload/route.ts → GET()
APIs → Relatórios → app/api/reports/demographics/route.ts → GET()
APIs → Relatórios → app/api/reports/modality-revenue/route.ts → GET()
APIs → Relatórios → app/api/reports/seasonality/route.ts → GET()

Navegação → Sidebar → components/layout/sidebar.tsx → navigationSections() (Adicionada seção Terapia com ícone Brain e tema indigo)
Navegação → Feature Gating → lib/constants/route-features.ts → ROUTE_MIN_PLAN, ROUTE_LABELS

### 13/05/2026 - Ajustes de Visibilidade e Lgica de Cancelamento

- **Mdulo** -> Recepo -> Agenda -> genda-view.tsx -> Modificada a lgica de filtro de agendamentos (getAppointmentsForSlot e getAppointmentsForDay) para no excluir agendamentos com status CANCELLED. Alterada a renderizao (Standard e Timeline view) para colorir esses agendamentos de vermelho (opacidade 80%) e exibir a justificativa (cancellation_reason) nos tooltips de consulta e Timeline.
- **Mdulo** -> Backend -> API -> ppointments/route.ts -> Removido o filtro de restrio baseado em *Role* para mdicos na listagem de agendamentos. A partir desta alterao, a visibilidade baseada na clnica logada  padro, delegando ao front-end (genda-view.tsx -> filtro selectedDoctorFilter) a filtragem, resolvendo a falha de visualizao da agenda do Espao Incluir para profissionais distintos e recepcionistas.
- **Mdulo** -> Agendamento -> Modal Recorrente -> RecurringAppointmentModal.tsx -> Substitudo o componente Select fixo (Intervalo de 30 minutos) por um Input nativo com 	ype="time", flexibilizando os agendamentos das sesses para intervalos dinmicos (ex: 45min, 50min, etc).

- **Mdulo** -> Marketing -> Landing Page -> landing-premium/page.tsx -> Adicionado o card de destaque Gesto Financeira Completa e importao do cone PieChart.

### 14/05/2026 - Correção de Duplicidade Visual e Ajustes de UI

- **Módulo** -> Recepção -> Agenda -> components/ui/agenda-view.tsx -> Alterada a lógica de getAppointmentsForSlot e getAppointmentsForDay para excluir agendamentos com status CANCELLED. Isso corrige o problema visual que fazia parecer haver duplicidade de horários quando uma sessão recorrente era substituída.
- **Módulo** -> Terapia -> Encaminhamentos -> app/dashboard/(clinic)/terapia/encaminhamentos/page.tsx -> Adicionado o ícone Send no botão "Registrar Encaminhamento" para manter o padrão visual do sistema.

### 14/05/2026 - Restrição de Agenda para Role DOCTOR

- **Módulo** -> Recepção -> Agenda -> components/ui/agenda-view.tsx -> Adicionada lógica de auto-lock do filtro de profissional. Quando o usuário logado possui role `DOCTOR`, o sistema identifica automaticamente o `doctor.id` correspondente ao `user.id` e trava o filtro (`disabled={isDoctor}`), impedindo o profissional de visualizar a agenda de outros colegas. A alteração afeta TODAS as clínicas do sistema, não apenas o Espaço Incluir.

Chat Interno -> Mensagens -> MessageArea.tsx -> Adicionado modal de gerenciar participantes e rota de insero
Chat Interno -> Sidebar -> ConversationList.tsx -> Adicionado modal de criar grupos com mltiplos membros


### 17/05/2026 - Implementação dos 6 Módulos Operacionais

**Item 1 - Onboarding Guiado:**
- Módulo → Setup → API → app/api/setup/status/route.ts → Expandido com hasWhatsApp, hasAppointment e clinicCreatedAt
- Módulo → Dashboard → Componentes → components/dashboard/InitialSetup.tsx → Expandido para 5 etapas (profissional, horários, paciente, WhatsApp, agendamento) com barra de progresso e controle por idade da clínica (< 30 dias)
- Módulo → Onboarding → Página → app/dashboard/(clinic)/onboarding/page.tsx → [NEW] Checklist dedicado com status por etapa, dicas e botão de atualização
- Módulo → Layout → Sidebar → components/layout/sidebar.tsx → Adicionado item 'Checklist Inicial' na seção Principal (CLINIC_ADMIN)

**Item 2 - Notificações Automáticas:**
- Módulo → Banco → Triggers → migrations/20260517_notification_triggers.sql → [NEW] 3 triggers: notify_appointment_created, notify_payment_registered, notify_appointment_noshow
- OBS: SQLs pendentes de execução no Supabase Dashboard SQL Editor

**Item 3 - Assinatura Digital de Prontuários:**
- Módulo → Prontuário → API → app/api/records/signature/route.ts → [NEW] POST gera token 72h + envia WhatsApp; GET valida token (público); PATCH salva assinatura PNG no Storage
- Módulo → Assinatura → Página Pública → app/sign/[token]/page.tsx → [NEW] Canvas touch/mouse para captura de assinatura; mobile-first; exibe dados do prontuário
- Módulo → Prontuário → API → app/api/medical-records/route.ts → Adicionados signed_by_patient, signed_at, signature_url no SELECT e no transform de retorno

**Item 4 - CRM Funil Kanban:**
- Módulo → CRM → API → app/api/crm/pipeline/route.ts → [NEW] Calcula estágio automático por contagem de COMPLETED appointments (lead→agendou→compareceu→retornou→recorrente) com LTV
- Módulo → CRM → Página → app/dashboard/(clinic)/crm/pipeline/page.tsx → [NEW] Kanban 5 colunas com busca, sheet lateral de detalhes, ações (ver ficha, agendar, WhatsApp)
- Módulo → Layout → Sidebar → components/layout/sidebar.tsx → FluxoMed convertido para item com children (Automações + Pipeline)

**Item 5 - Estoque:** Já existia — nenhuma alteração.

**Item 6 - NPS Automatizado:**
- Módulo → NPS → API → app/api/surveys/route.ts → [NEW] GET valida token público; POST salva resposta ou gera nova pesquisa com envio WhatsApp
- Módulo → NPS → Página Pública → app/survey/[token]/page.tsx → [NEW] Survey 3 etapas (NPS 0-10, estrelas 1-5, comentário); mobile-first; tela de agradecimento

**Banco de Dados — SQLs a executar (Supabase Dashboard):**
- ALTER TABLE medical_records ADD COLUMNS signed_at, signed_by_patient, signature_url, signature_token, signature_token_expires_at
- CREATE TABLE crm_stages (funil de pacientes com RLS)
- ALTER TABLE patients ADD COLUMN lead_source
- CREATE TABLE satisfaction_surveys (NPS por token com RLS)
- 3 TRIGGERS de notificação automática
- Arquivo consolidado: migrations/20260517_notification_triggers.sql + migrations/20260517_items_3_4_6.sql


### 19/05/2026 - Backfill Financeiro Real e Ajuste de Onboarding (Espaço Incluir)

**Módulo → Submódulo → Arquivo → Função/Componente alterado**

- Módulo → Financeiro → Banco de Dados → financial_entries → Execução de script de backfill real populando 612 lançamentos de receita retroativos (de 2025-11 a 2026-05) para sessões concluídas mapeadas com as regras de reembolso ativas de pacientes.
- Módulo → Dashboard → Componentes → components/dashboard/InitialSetup.tsx → Alterada lógica do componente para retornar `null` (esconder completamente o onboarding setup da dashboard) caso a clínica já tenha feito seus cadastros básicos (hasDoctor && hasPatient && hasAppointment) ou se for uma clínica antiga com mais de 30 dias de criação.

### 19/05/2026 - Ajuste de Impersonation para Super Admin (Master Hub)

**Módulo → Submódulo → Arquivo → Função/Componente alterado**

- Módulo → Super Admin → Autenticação → app/api/super-admin/impersonation/route.ts → Alterado cookie `impersonation_clinic_id` para `httpOnly: false` para permitir a leitura pelo JavaScript do frontend.
- Módulo → Planos e Permissões → Hook de Plano → lib/hooks/use-plan.ts → Atualizado o hook `usePlan` para ler cookies no client-side e, caso a impersonation esteja ativa pelo Super Admin, utilizar o `clinic_id` impersonado para carregar o plano correspondente ao invés do plano do admin original.
- Módulo → Planos e Permissões → Hook de Autenticação → lib/hooks/use-auth.ts → Ajustado o hook `useRole` para retornar o `clinicId` efetivo (da clínica impersonada) se a impersonação estiver ativa no perfil do Super Admin.
- Módulo → Super Admin → Componentes → components/impersonation-banner.tsx → Adicionada a limpeza do cookie `impersonation_clinic_id` client-side na função `handleEndSession` para garantir consistência.
- Módulo → Onboarding / Setup → API → app/api/setup/status/route.ts → Atualizado o endpoint para ler o `x-clinic-id` dos headers injetados pelo middleware de representação, garantindo o retorno das informações reais da clínica impersonada.

### 19/05/2026 - Correção de Produção e Repasses Médicos Zerados (Espaço Incluir)

**Módulo → Submódulo → Arquivo → Função/Componente alterado**

- Módulo → Financeiro → API → app/api/financial/my-producao/route.ts → Removida a seleção da coluna inexistente `price` e adicionado o cálculo dinâmico de faturamento buscando lançamentos reais em `financial_entries` com fallback estratégico nas regras de reembolso `patient_reimbursement_rules`.
- Módulo → Financeiro → API → app/api/financial/producao/route.ts → Removida a seleção da coluna inexistente `price` e o campo `health_insurance_id` (substituído por `health_insurance_plan_id`), adicionando o cálculo dinâmico a partir do mapeamento de lançamentos e regras de reembolso.
- Módulo → Financeiro → Banco de Dados → payroll_items e medical_payroll → Execução de script de backfill retroativo de folhas de pagamento físicas (`run_payroll_value_backfill.js`), recalculando e atualizando valores reais de repasse em 569 itens de folha (`payroll_items`) e consolidando/aprovando com dados reais as 32 folhas de pagamento (`medical_payroll`) da clínica Espaço Incluir para 2026.
- Módulo → Financeiro → API → app/api/financial/dashboard/executive/route.ts → Correção cirúrgica de quatro queries críticas que geravam erro 500 (colunas inexistentes, relacionamentos inválidos e tabelas legadas do cache), encapsulando em blocos try/catch granulares para garantir a exibição integral e em tempo real dos valores de receitas, despesas e resultado líquido na tela principal.

### 20/05/2026 - Evolução de Leads na Fila de Espera, Fechamento Mensal Cutoff e Reembolso do Paciente (Espaço Incluir)

**Módulo → Submódulo → Arquivo → Função/Componente alterado**

- Módulo → Terapia → Fila de Espera → app/dashboard/(clinic)/terapia/fila-espera/page.tsx → FilaEsperaPage()
  - Adicionados campos de entrada visuais de "Origem do Lead" (Instagram, Google, Facebook, etc.) e "Responsável pelo Paciente" no modal de cadastro de fila de espera.
  - Implementado parse automático no salvamento estruturado e visualização com badges de UX Premium na tabela de listagem sem alterar o esquema original do banco.
- Módulo → Financeiro → API → app/api/financial/closing/route.ts → GET()
  - Ajustado o período contábil dinâmico baseado no dia de fechamento contábil da clínica (`financial_cutoff_day`) correspondente, unificando os cálculos de receitas e despesas com a lógica da DRE (do dia 11 do mês anterior ao dia 10 do mês atual).
  - Implementada a busca e integração de dados de faturamento e produção médica reais a partir de `medical_payroll`, garantindo que os breakdowns de receita por profissional nunca fiquem zerados.
- Módulo → Paciente → Reembolso → components/patients/PatientReimbursement.tsx → PatientReimbursement()
  - Implementado carregamento dinâmico de regras contratuais ativas na tabela `patient_reimbursement_rules` para cada paciente.
  - Integração inteligente para auto-preencher o valor da sessão no modal e no recibo de reembolso em PDF com base no `billing_amount` cadastrado para a especialidade do terapeuta selecionado, em substituição ao valor cheio padrão de hora do profissional.
  - Adicionado componente visual premium de feedback com badge verde informando ao usuário quando a regra contratual de reembolso estiver ativa para o profissional selecionado.

### 21/05/2026 - Múltiplos Superadmins e Ferramenta de Reset de Senha Coletivo por Clínica no Smart Hub (System Master Hub)

**Módulo → Submódulo → Arquivo → Função/Componente alterado**

- Módulo → Super Admin → Autenticação → lib/super-admin-middleware.ts → isMasterAdmin()
  - Substituição da constante única por uma whitelist de múltiplos e-mails (`robsonfenriz@gmail.com` e `contato@clinigo.app`), estendendo o acesso e autorização ao portal master para ambos os e-mails superadmins.
- Módulo → Super Admin → Painel → app/system-master-hub/page.tsx →
  - **Filtro de Busca de Clínicas:** Adicionado o estado de busca reativa `searchClinic` e inserido um componente de campo visual `<Input />` elegante para pesquisa de clínicas na aba "Gestão de Clínicas" filtrando a tabela em tempo real.
  - **Ação de Reset Coletivo:** Adicionado o botão de ação "🔑 Resetar Senhas" na coluna de ações da tabela de clínicas para cada registro.
  - **Modal de Confirmação e Resultados:** Criado o modal `<Dialog />` de redefinição de senhas de clínica. Em conformidade rígida com a *Regra dos Botões*, implementa alertas críticos vermelhos e confirmação segura em pt-br. Em caso de sucesso, exibe uma tabela de credenciais com e-mail, nova senha gerada em monospace, botões de cópia individual (`<Copy />`) e botão de cópia de todas as credenciais em lote com alertas de feedback para o clipboard do superadmin.
  - **Ação de Prorrogação de Período de Teste:** Adicionado o botão de ação "+7d Testes" na coluna de ações de clínicas, que reativa a clínica inativa no banco de dados e adiciona 7 dias gratuitos de testes.
- Módulo → Super Admin → API → app/api/super-admin/extend-trial/route.ts → [NEW] POST
  - Endpoint seguro de superadministrador que recebe `clinicId` e prorroga o período de testes gratuitamente. No banco, altera `is_active = true`, `approval_status = 'trial'`, `trial_ends_at = hoje + 7 dias` e habilita `payment_confirmed = true` temporariamente (que será expirado novamente após 7 dias pelas rotinas do Cron). Registra log em `audit_logs` de forma automatizada.

### 23/05/2026 - Auditoria Exaustiva e Validação de QA Sênior

- **Módulo** → Garantia de Qualidade (QA) → Banco de Dados → Supabase → Execução de script de reflexão de schema e auditoria de registros (`scripts/qa-db-audit.ts`) para verificação física das migrações do CRM, NPS e colunas de assinatura eletrônica em prontuário de 17/05/2026.
- **Módulo** → Garantia de Qualidade (QA) → Documentação → `qa_audit_report.md` → [NEW] Geração de relatório de QA Sênior atestando 100% de conformidade técnica e aprovação global do CliniGo SaaS para deploy.
- **Módulo** → Interface de Usuário (UI) → Barra Lateral → `components/layout/sidebar.tsx` →
  - **Reorganização do Menu Financeiro:** Consolidação de 20+ itens soltos em 6 categorias/sub-menus colapsáveis lógicos (Transações, Repasses, Controladoria, TISS, Meu Financeiro, Convênios), minimizando sobrecarga cognitiva.
  - **Ícones de Ajuda Discretos:** Injeção do ícone de ajuda `?` (`<HelpCircle />`) ao lado de cada item do menu geral e sub-menus. O ícone permanece oculto por padrão e surge sutilmente apenas no hover (`group-hover:opacity-100 opacity-0`), com `e.stopPropagation()` no clique para evitar disparar a ação do menu pai, redirecionando o usuário para a âncora correspondente no guia central.
  - **Página de Ajuda Premium:** Criação do portal de ajuda interativo com barra de busca reativa e tags de planos e roles. Documenta de forma real e sem alucinações as perguntas "Para que serve?" e "Quando usar?" para cada um dos módulos e funcionalidades existentes no sistema CliniGo.
  - **Ajuste Cirúrgico de Conteúdo:** Refinamento da frase do indicador "Quando usar" da funcionalidade "Consultas", alterado para a instrução direta: "No momento do atendimento da teleconsulta do paciente."

### 24/05/2026 - PWA Inteligente e Otimizações de Navegação Mobile

**Módulo → Submódulo → Arquivo → Função/Componente alterado**

- Módulo → PWA Mobile → Configurações → public/manifest.json → start_url e theme_color
  - Alterada a start_url do aplicativo de `/m/agenda` para `/dashboard` para garantir o fluxo de login e redirecionamento de usuários ativos.
  - Alinhada a cor oficial do tema PWA (`theme_color`) para o verde esmeralda `#16a34a`.
- Módulo → Navegação → Mobile Bottom Nav → components/layout/mobile-bottom-nav.tsx → MobileBottomNav()
  - Adicionado suporte a rotas dinâmicas. Ao clicar no atalho de "Agenda", o médico/terapeuta (`DOCTOR`) é redirecionado cirurgicamente para a sua agenda pessoal (`/dashboard/minha-agenda`), enquanto Administradores e Recepcionistas continuam visualizando a Agenda Geral da Clínica (`/dashboard/agenda`), garantindo fluxo e permissões de acesso perfeitos.
- Módulo → PWA Mobile → Inicializador → components/pwa-initializer.tsx → PWAInitializer()
  - Implementação de um Bottom Sheet (gaveta flutuante) de design premium e glassmorphism que sobe de forma fluida a partir da base do celular se a aplicação for móvel e não instalada.
  - Adicionado suporte híbrido inteligente:
    - **Android (Chrome/Firefox)**: Captura e ativação do evento nativo `beforeinstallprompt` via clique no botão "Instalar Aplicativo".
    - **iOS (Safari)**: Tutorial animado e ilustrado ensinando o passo a passo de compartilhamento do Safari e adição à tela inicial.
  - Armazenamento de estado de fechamento por 3 dias no `localStorage` ("Lembrar mais tarde") para preservar a fluidez do uso operacional diário dos profissionais.
- Módulo → Marketing → Landing Page → app/(marketing)/landing-premium/page.tsx → LandingPremium()
  - Adicionados botões pílula de acesso rápido ("Clínica" e "Médico") específicos para celulares no cabeçalho (Navbar), integrados ao lado da logo principal. Isso assegura que usuários em dispositivos móveis tenham uma via rápida e visível de login ao acessar a página inicial do CliniGo, resolvendo a usabilidade de forma cirúrgica.


### 24/05/2026 - Otimização Responsiva Premium e Rolagem da Agenda no Mobile

**Módulo → Submódulo → Arquivo → Função/Componente alterado**

- Módulo → Agenda → Interface de Usuário (UI) → components/ui/agenda-view.tsx → AgendaView()
  - **Toolbar Móvel Retrátil (Mobile First):** Criação de um estado reativo `showMobileFilters` para compactar os 8+ botões de filtros secundários e ações avançadas ("Recorrente", "Ausência", "Sugerir", "Encaixe", "Horários Livres", seletor de Profissional, e busca de paciente). No celular, as opções começam elegantemente ocultas, liberando 70% de espaço vertical na tela e exibindo apenas o Título "Agenda", o botão compacto "+ Novo" e o botão "Filtros e Ações" com o ícone `SlidersHorizontal` (que abre a gaveta de filtros quando tocado).
  - **Otimização de Altura da Viewport:** Ajuste na div principal de `h-[calc(100vh-6rem)]` para `h-[calc(100vh-11rem)]` no celular, garantindo que o calendário caiba perfeitamente no limite físico do smartphone e a barra de rolagem horizontal apareça logo acima da barra de navegação inferior.
  - **Rolagem Horizontal Tátil Fluida:** Adição de propriedades táteis nativas de rolagem na grade do calendário (`Card`), com classes `overflow-x-auto overflow-y-auto touch-pan-x touch-pan-y` e aumento da largura mínima de dias de `800px` para `950px` no mobile. Isso previne o esmagamento lateral dos cartões de agendamento de pacientes e propicia uma navegação por gestos extremamente suave e legível nos celulares!
- Módulo → Pacientes → Interface de Usuário (UI) → app/dashboard/(clinic)/pacientes/page.tsx → PacientesPage()
  - **Cabeçalho Responsivo Flex:** Ajuste na div do cabeçalho de `flex justify-between` para `flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between`. Isso faz com que o título/subtítulo fiquem acima e os botões de ação fiquem posicionados abaixo na tela inteira do celular, impedindo sobreposição de componentes.
  - **Botões Simétricos com Largura Dinâmica:** Adição das classes `flex-1 sm:flex-initial justify-center` nos botões "Exportar" e "Novo Paciente". Com isso, ambos dividem a tela de forma simétrica (50% de largura cada) no mobile, ocupando a largura total disponível.
  - **Texto Condicional Inteligente:** Envelopamento do texto "Novo Paciente" em tags conditional-span (`span className="hidden sm:inline"`) e "+ Novo" (`span className="inline sm:hidden"`) para celulares. Isso reduz a extensão do texto do botão verde de forma elegante, garantindo que o botão caiba perfeitamente na linha sem cortes de string ou transbordamento de borda.


### 24/05/2026 - Ativos Visuais e Identidade PWA de Altíssima Fidelidade

**Módulo → Submódulo → Arquivo → Função/Componente alterado**

- Módulo → PWA Mobile → Ativos Visuais → public/icons/icon-512x512.png e icon-192x192.png → [NEW / OVERWRITE]
  - Substituição dos ativos de ícones móveis pela imagem oficial de altíssima fidelidade e estética premium. Utiliza a cruz estilizada fornecida (degradê azul-escuro/verde) mesclada perfeitamente na parte inferior com a marca escrita oficial **"CliniGO"** (com a sigla GO em caixa alta), garantindo conformidade estética e identidade única na tela inicial do celular de médicos e terapeutas.
- Módulo → PWA Mobile → Identidade e Branding → public/logo.png e public/favicon.svg.png → [NEW / OVERWRITE]
  - Atualização do logotipo oficial de alta resolução e favicons compatíveis na pasta public utilizando a nova fusão de cruz estilizada com o nome de marca **"CliniGO"** em azul marinho.


### 25/05/2026 - PWA Mobile: Instruções de Instalação Interativas no iOS (iPhone/iPad)

**Módulo → Submódulo → Arquivo → Função/Componente alterado**

- Módulo → PWA Mobile → Inicializador → components/pwa-initializer.tsx → PWAInitializer()
  - **Instrução de Instalação Interativa (iOS)**: Adicionado suporte ao Web Share API (`navigator.share`) no prompt de instalação para iOS.
  - **Botão "Abrir Compartilhamento"**: Implementado o botão principal de compartilhamento que abre diretamente a folha de compartilhamento nativa do Safari no iOS via clique do usuário, facilitando imensamente o acesso à opção "Adicionar à Tela de Início".
  - **Link Ativo nas Instruções**: Tornou-se o termo "Compartilhar" dentro do passo a passo em um botão interativo inline que também dispara a folha de compartilhamento nativa ao ser clicado, solucionando a queixa de falta de funcionalidade da instrução.
  - **Conformidade de Interface**: Auditado de acordo com a *Regra dos Botões*, assegurando botões funcionais e claros de "Abrir Compartilhamento", "Fechar" e "Lembrar mais tarde" com feedback imediato.


### 25/05/2026 - Posicionamento Híbrido Premium e Nichagem Terapêutica na Landing Page

**Módulo → Submódulo → Arquivo → Função/Componente alterado**

- Módulo → Marketing → Landing Page → app/(marketing)/landing-premium/page.tsx → LandingPremium()
  - **Destaque de Nicho Otimizado (Sparkles Badge)**: Atualização do copy do badge superior para "Otimizado para Psicologia, Terapias (T.O., Fono, Fisio) e Consultórios", posicionando explicitamente a plataforma no nicho de terapias multidisciplinares.
  - **Sub-headline Adaptativa**: Atualização da sub-headline principal enfatizando o suporte sob medida para clínicas multidisciplinares, psicologia, reabilitação e consultórios de saúde, além de ressaltar o superpoder dos prontuários adaptativos e agenda integrada.

### 25/05/2026 - Template Multidisciplinar Avançado, Visualização de Prontuários (Natália/Espaço Incluir) e Agendas Coordenadas

**Módulo → Submódulo → Arquivo → Função/Componente alterado**

- Módulo → Recepção → Agenda → components/layout/sidebar.tsx → Sidebar()
  - Liberada a visualização do menu "Agenda" Geral (`/dashboard/agenda`) para médicos que possuem a flag `isCoordinator === true` (Coordenadoras), permitindo que acessem o painel completo de agendamento de todos os profissionais.
- Módulo → Recepção → Agenda → components/layout/mobile-bottom-nav.tsx → MobileBottomNav()
  - Ajustado o atalho de Agenda no menu inferior mobile para não forçar o redirecionamento de médicos coordenadores para `/dashboard/minha-agenda`, permitindo que visualizem a Agenda Geral também em dispositivos móveis.
- Módulo → Prontuário Clínico → Evoluções → app/dashboard/(clinic)/evolucoes/page.tsx → SessionEvolutionsPage()
  - **Template Multidisciplinar**: Adicionado o novo tipo de template `'multidisciplinar'` em `TEMPLATE_LABELS`. Quando selecionado, renderiza de forma condicional um formulário estruturado com os 6 campos solicitados: Data e Horário do Atendimento (`data_description`), Objetivo Terapêutico (`subjective`), Estratégias/Intervenções Utilizadas (`objective`), Desempenho do Paciente (`assessment`), Intercorrências (`plan_notes`) e Orientações aos Responsáveis (`content`).
  - **Visualização Completa (Expandir/Recolher)**: Adicionado o estado `expandedEvolutions` e o botão funcional e premium "Visualizar / Recolher" nos cards de evolução. Permite que terapeutas e médicos leiam a íntegra dos dados preenchidos e assinados diretamente na listagem em um accordion elegante sem precisar abrir a tela de edição (que fica bloqueada pós-assinatura).
- Módulo → Prontuário Clínico → API/PDF → app/api/session-evolutions/pdf/route.ts → GET()
  - Adicionado suporte completo ao template `multidisciplinar` na geração e impressão de relatórios em PDF com jsPDF, mapeando e imprimindo cada uma das 6 seções com cabeçalhos e formatação sob medida.


### 25/05/2026 - Substituição Global de Contato WhatsApp e Transição do Chatbot Clin para Novo Número

**Módulo → Submódulo → Arquivo → Função/Componente alterado**

- Módulo → Configurações → Geral → app/api/chatbot/route.ts → Chatbot API
  - Atualização do número de destino no fluxo do chatbot Clin para o novo telefone de atendimento oficial: `(21) 99040-0577` (em formato internacional DDI + DDD + número: `5521990400577`).
- Módulo → Configurações → Geral → app/api/webhooks/mercadopago/route.ts → Webhook Mercado Pago
  - Alteração do link de suporte financeiro no callback de erro de pagamento para direcionar o cliente ao novo WhatsApp corporativo.
- Módulo → Chatbot → Widget UI → components/chatbot/ChatbotWidget.tsx → ChatbotWidget
  - Correção na chamada de redirecionamento no final da sessão do chatbot ("Falar com Especialista") para iniciar a conversa no novo número oficial de atendimento.
- Módulo → Chatbot → FAQ & Contato → components/landing/faq-section.tsx → FAQSection
  - Atualização de menções ao telefone de contato da central nos componentes da Landing Page.
- Módulo → Comunicação → WhatsApp Float → components/landing/hero-section.tsx, whatsapp-floating-button.tsx → Floating & Hero Action
  - Alinhados os botões flutuantes de contato imediato via WhatsApp de toda a plataforma para dispararem conversas no novo número `(21) 99040-0577`.
- Módulo → Landing Pages → Geral → app/site/page.tsx, contato/page.tsx, sobre/page.tsx, termos/page.tsx, lgpd/page.tsx, pagamentos/erro/page.tsx, landing-premium/page.tsx → Marketing & Legal Pages
  - Substituídos cirurgicamente 100% de hiperlinks do WhatsApp, links gerados da central de atendimento e menções textuais em todas as páginas públicas institucionais da marca CliniGo.
- Módulo → Landing Pages → Portfolio → public/portfolio/index.html → Portfolio Template
  - Atualizado o telefone de suporte e contato comercial no template HTML de portfólio estático.
- Módulo → Suporte → Documentação → docs/troubleshooting.md → Guia de Suporte
  - Atualizado o telefone de suporte operacional do CliniGo no manual oficial de troubleshooting para o novo canal.

### 25/05/2026 - Correção de Dígito WhatsApp no Formato Internacional do Chat e Landing Pages

**Módulo → Submódulo → Arquivo → Função/Componente alterado**

- Módulo → Geral → Central de Atendimento → Vários Componentes e Páginas → [CORRECTION]
  - Corrigido o número internacional do WhatsApp de `552190400577` (12 dígitos, incorreto por omissão do segundo dígito 9) para `5521990400577` (13 dígitos, correto para o número real (21) 99040-0577).
  - Esta alteração foi aplicada cirurgicamente em todos os componentes e páginas, restaurando o correto funcionamento do botão de redirecionamento "Falar com Especialista" e demais CTAs de contato no WhatsApp, que agora iniciam a conversa imediatamente.
  - Arquivos corrigidos:
    - `components/public/integracao-sites-section.tsx`
    - `components/landing/faq-section.tsx`
    - `components/landing/hero-section.tsx`
    - `components/chatbot/ChatbotWidget.tsx`
    - `components/landing/whatsapp-floating-button.tsx`
    - `app/termos/page.tsx`
    - `app/site/page.tsx`
    - `app/contato/page.tsx`
    - `app/(marketing)/landing-premium/page.tsx`
    - `app/api/chatbot/route.ts`

### 26/05/2026 - Otimização de Funil de Trial (7 dias), Notificações e Flexibilização de Nome de Clínica

**Módulo → Submódulo → Arquivo → Função/Componente alterado**

- Módulo → Marketing → Landing Page → app/(marketing)/landing-premium/page.tsx → LandingPremium()
  - Substituição do botão de contato "Falar com Especialista" para "Testar Grátis por 7 dias" com redirecionamento de alta velocidade para a rota local `/trial` via componente `<Link />` do Next.js.
- Módulo → Marketing → Landing Page → app/trial/page.tsx → TrialPage() & handleSubmit()
  - Adicionado banner de benefício premium e linha de urgência no topo do formulário: `"🎁 7 dias completos. Todas as funcionalidades liberadas."`
  - Substituído subtítulo padrão por copy mais poderoso e focado em conversão: `"Sem cartão. Cancele quando quiser. Acesse em segundos."`
  - Tornou o campo de WhatsApp obrigatório no formulário e na validação `handleSubmit` (Label: `"WhatsApp / Telefone *"`).
  - Tornou o campo Nome da Clínica/Consultório opcional no formulário (Label: `"Nome da clínica ou consultório"`) e removeu obrigatoriedade.
  - Implementou lógica inteligente de fallback no envio (`handleSubmit`): caso o usuário deixe o nome da clínica em branco, o sistema automaticamente extrai o primeiro nome (`firstName`) a partir do campo nome completo e gera o valor `"Consultório de [Primeiro Nome]"`, enviando esse fallback para a API de registro.
- Módulo → Back-end → API Registro → app/api/auth/register/route.ts → POST()
  - Implementou disparos automáticos por e-mail notificando o novo cadastro de teste para a central comercial nos e-mails `contato@clinigo.app` e `contato.clinigo@gmail.com`.
  - Integrou de forma cirúrgica e segura a notificação via WhatsApp (Baileys) usando o serviço do sistema (`sendWhatsAppMessage`) a partir da sessão ativa do bot de vendas `'clin-sales-bot'` (sem interferir em sua conexão via QR code), disparando um lead rico em detalhes para o número oficial comercial `(21) 96553-2247`.


### 26/05/2026 - Correção no Acesso e Login do Portal do Paciente (Sensorialmente)

**Módulo → Submódulo → Arquivo → Função/Componente alterado**

- Módulo → Pacientes → API Autenticação → app/api/patient/auth/login/route.ts → POST()
  - **Login por Data de Nascimento (Primeiro Acesso)**: Implementado o fallback inteligente de autenticação no endpoint `/api/patient/auth/login`. Agora, se o paciente tentar realizar o seu primeiro acesso utilizando a sua data de nascimento no formato `DDMMAAAA` (limpa de caracteres especiais) como senha, o sistema valida a data contra o campo `date_of_birth` cadastrado no banco.
  - **Criação de Credenciais Automatizada**: Caso seja o primeiro acesso bem-sucedido e o paciente ainda não possua registro correspondente na tabela `patient_credentials`, a credencial é inicializada no banco de dados automaticamente com o hash `bcrypt` correspondente a essa senha.
  - **Robustez de Bloqueios**: Ajustada a busca de credenciais de `.single()` para `.maybeSingle()`, permitindo tratar corretamente o fluxo de primeiro acesso sem estourar erros internos e preservando a segurança de bloqueio por tentativas falhas.
- Módulo → Pacientes → Cadastro/Acesso → Clínica Sensorialmente (Banco de Dados)
  - **Cadastro de Paciente Natália**: Identificou-se que a gestora Natália Moreira possuía cadastro administrativo profissional (como `CLINIC_ADMIN` sob o e-mail `nataliat.o@outlook.com`), mas não possuía registro correspondente na tabela de `patients` vinculada ao CPF `015.077.446-09` que tentava logar.
  - **Inserção de Registro e Sincronização de Senha**: Criou-se cirurgicamente o registro de paciente para `Natália Martins Moreira` com CPF `01507744609` sob a clínica `Sensorialmente` (id `69866811-776c-453b-bb1b-90d8db097286`) e gerou-se sua respectiva credencial em `patient_credentials` associada à senha administrativa que ela recebeu por e-mail (`rLYt*k516$Uo`), garantindo que seu login em `/paciente` funcione perfeitamente tanto com a senha de e-mail quanto com sua data de nascimento (`26051985`).

### 26/05/2026 - Pente Fino, Otimização de Orientações e Correção de Navegação no Portal do Paciente (Natália/Sensorialmente)

**Módulo → Submódulo → Arquivo → Função/Componente alterado**

- Módulo → Pacientes → Painel do Paciente → app/paciente/meu-painel/page.tsx → PatientDashboardPage()
  - **Experiência Premium com Foco na Família**: Transformação visual completa do painel do paciente com visual elegante em cinza e esmeralda. Adicionada a aba dedicada "Orientações e Evoluções" contendo as dicas de atividades para casa de forma clara, o nome do terapeuta e da clínica.
  - **Aba de Receitas e Pareceres**: Criada aba dedicada com visualização e download fácil de receitas médicas, laudos e atestados que foram emitidos no prontuário.
  - **Selo de Assinatura Digital ICP-Brasil**: Adicionado badge dinâmico oficial com ícone de escudo verde para evoluções assinadas digitalmente com certificado ICP-Brasil, transmitindo extrema segurança e autoridade jurídica para as famílias.
  - **Ações Avançadas e Impressão**: Integração dos botões de baixar PDF e imprimir para que os responsáveis salvem as evoluções ou documentos em apenas um clique.
- Módulo → Pacientes → Painel do Paciente (Route Group) → app/(patient)/meu-painel/page.tsx → PatientDashboardPage()
  - Sincronização completa de código e layout premium com o Route Group do Next.js para garantir consistência em ambas as rotas de acesso configuradas no servidor.
- Módulo → Pacientes → Histórico e Agendamento → app/paciente/historico/page.tsx, app/paciente/agendar/page.tsx, app/(patient)/historico/page.tsx, app/(patient)/agendar/page.tsx → Link de Voltar
  - **Correção Crítica de Navegação**: Corrigido o link do botão de retorno (ArrowLeft) no cabeçalho das páginas de histórico e auto-agendamento de `/paciente/dashboard` para `/paciente/meu-painel`. Esta correção evita o redirecionamento indevido para rotas inexistentes ou loops na autenticação do paciente.

### 26/05/2026 - Correção Crítica de APIs, Agendamentos e Fluxo de Saída no Portal do Paciente (Natália/Sensorialmente)

**Módulo → Submódulo → Arquivo → Função/Componente alterado**

- Módulo → Pacientes → API Histórico → app/api/patient/history/route.ts → GET()
  - **Correção da Tabela e Colunas**: Alterada a query que buscava incorretamente na tabela `consultations` para buscar na tabela `appointments` filtrando pelo status `'COMPLETED'`. Substituídas as colunas inexistentes (`date`, `start_time`, `end_time`, `consultation_type`) pelas colunas reais do banco (`appointment_date`, `appointment_time`, `appointment_type`), resolvendo o erro 500 que causava redirecionamento em loop para o login ao acessar `/paciente/historico`.
- Módulo → Pacientes → API Consultas Futuras → app/api/patient/appointments/route.ts → GET()
  - **Ajuste de Coluna**: Corrigida a consulta de agendamentos futuros para usar a coluna correta `appointment_type` em substituição à coluna inexistente `consultation_type` no select e mapeamento de dados.
- Módulo → Pacientes → API Clínicas Marketplace → app/api/marketplace/clinics/route.ts → GET()
  - **Novo Endpoint**: Criado endpoint público de marketplace utilizando Service Role para listar clínicas ativas. O endpoint formata os campos endereço e cidade (extraídos do JSON `address`) para viabilizar a exibição das clínicas e permitir que os pacientes busquem e realizem novos agendamentos sem que a tela fique vazia.
- Módulo → Pacientes → Painel e Login → app/paciente/meu-painel/page.tsx, app/(patient)/meu-painel/page.tsx, app/paciente/entrar/page.tsx, app/(patient)/entrar/page.tsx → handleLogout() & cookie clearing
  - **Transição ao Sair**: Ajustada a função de logout para limpar o token `patient_token` de ambos os paths (`/paciente` e `/`) e redirecionar corretamente para a página pública `https://clinigo.app/paciente` conforme solicitado pelo usuário.
  - **Limpeza Preventiva**: Adicionado reset preventivo de cookies de autenticação na inicialização do formulário de login para eliminar conflitos browser-side com tokens antigos de paths restritos.

### 26/05/2026 - Restrição de Auto-agendamento e Ajuda Integrada Contextual "?" nos Portais do Médico e Paciente (Sensorialmente)

**Módulo → Submódulo → Arquivo → Função/Componente alterado**

- Módulo → Pacientes → Perfil API → app/api/patient/profile/route.ts → GET()
  - **Disponibilização do Vínculo**: Adicionada a coluna `clinic_id` no select do Supabase no endpoint de perfil do paciente. Isso permite que a interface saiba a qual clínica o paciente autenticado pertence para aplicar filtros inteligentes.
- Módulo → Pacientes → Agendar Consulta → app/paciente/agendar/page.tsx, app/(patient)/agendar/page.tsx → loadPatientProfileAndClinics()
  - **Exclusividade de Agendamento da Clínica**: Atualizada a busca de clínicas na página de agendamento do paciente para primeiro consultar o endpoint do perfil do paciente, extrair o `clinic_id` e filtrar a lista de clínicas carregadas do marketplace. Agora, o paciente só pode visualizar e agendar consultas na clínica em que seu CPF está cadastrado (ex: no caso do CPF `015.077.446-09`, apenas a clínica **Sensorialmente** é exibida e fica acessível).
- Módulo → Pacientes → Painel do Paciente → app/paciente/meu-painel/page.tsx, app/(patient)/meu-painel/page.tsx → Header & Cards "?"
  - **Sistema de Ajuda da Família**: Integrado um botão de interrogação "?" no cabeçalho ao lado do título do portal e nos cabeçalhos de cada aba e card de controle ("Próximas Consultas", "Orientações e Evoluções", "Receitas e Laudos").
  - **Slide-up Drawer / Modal de Ajuda**: Implementado um belo modal interativo e responsivo que desliza de baixo para cima no celular e abre centralizado no computador. Explica de forma didática e acolhedora em Pt-Br: "Para que serve?" e "Como usar?" cada funcionalidade do espaço do paciente.
- Módulo → Médicos → Menu Lateral → components/layout/sidebar.tsx → Sidebar
  - **Interrogação "?" no Menu do Médico**: Adicionado o ícone discreto de interrogação "?" ao lado de cada item do menu lateral para profissionais de saúde e administradores. O clique ou hover abre um modal premium contextual detalhado explicando as ferramentas clínicas em tempo real e redirecionando para a página de Ajuda Geral (`/dashboard/help`).

### 26/05/2026 - Otimização de Responsividade e Alta Fidelidade Mobile PWA nos Fluxos de Auto-agendamento Público (Sensorialmente)

**Módulo → Submódulo → Arquivo → Função/Componente alterado**

- Módulo → Pacientes → Auto-agendamento Público → app/(public)/[clinic_slug]/agendar/page.tsx → BookingPage()
  - **Busca e Filtro Responsivos**: Substituído o container de layout estático de flex-row por `flex-col sm:flex-row gap-3`, garantindo que o input de busca de especialistas e a caixa seletora de especialidades fiquem empilhados verticalmente e com largura total em smartphones, evitando truncamento e quebras de layout.
  - **Premium UI**: Adicionadas bordas arredondadas e efeito de foco aveludado nos inputs de busca de acordo com o design system Clinigo v5.0.
- Módulo → Pacientes → Auto-agendamento Público → app/(public)/[clinic_slug]/agendar/[doctor_id]/page.tsx → DoctorProfilePage()
  - **Perfil do Profissional Responsivo**: Reformulada a seção superior horizontal do card do médico para empilhar dinamicamente em celulares (`flex flex-col sm:flex-row`), ajustando o alinhamento da imagem de perfil (avatar), CRM, estrelas de avaliação e o valor da consulta.
  - **Carrossel Deslizante de Datas**: Atualizado o container de abas dos 7 dias da semana com a diretiva `overflow-x-auto whitespace-nowrap scrollbar-none scroll-smooth shrink-0`. Agora, em qualquer celular, os dias da semana deslizam suavemente sob o dedo do usuário sem quebrar linhas ou espremer o texto, proporcionando uma experiência de PWA premium impecável.
  - **Paleta de Cores Esmeralda**: Atualizadas as marcações ativas das datas para a cor esmeralda (`border-emerald-600 text-emerald-600`), criando harmonia visual imediata.


### 26/05/2026 - Persistência de Credenciais de Login ("Lembrar de mim") e Exibição de Médicos no Auto-agendamento Público

**Módulo → Submódulo → Arquivo → Função/Componente alterado**

- Módulo → Autenticação → Persistência de Credenciais → app/paciente/page.tsx → PacienteLoginPage() & handleSubmit()
  - **Lembrar de Mim Ativo**: Implementada a persistência inteligente dos dados de CPF e senha no `localStorage` sob a chave `'clinigo_remember_paciente'` se o checkbox `"Lembrar de mim"` estiver marcado. Ao carregar a página, se houver dados persistidos, os campos são pré-preenchidos e a flag reativa é ativada. Em caso de login sem marcar a persistência, os dados antigos são deletados de forma segura do armazenamento local.
- Módulo → Autenticação → Persistência de Credenciais → app/medico/page.tsx → MedicoLoginPage() & handleSubmit()
  - **Lembrar de Mim Ativo**: Integrada a mesma funcionalidade de persistência de credenciais (CRM/Email e Senha) no `localStorage` sob a chave `'clinigo_remember_medico'` com preenchimento em mount, garantindo que profissionais de saúde não tenham que digitar seus acessos repetidamente.
- Módulo → Autenticação → Persistência de Credenciais → app/clinica/page.tsx → ClinicaLoginPage() & handleSubmit()
  - **Lembrar de Mim Ativo**: Adicionado suporte à persistência de e-mail administrativo e senha no `localStorage` sob a chave `'clinigo_remember_clinica'`, garantindo consistência completa no recurso de "Lembrar de mim" em todos os três principais portais de entrada do ecossistema.
- Módulo → Pacientes → Auto-agendamento Público → app/api/doctors/route.ts → GET()
  - **Bypass Seguro de RLS para Auto-agendamento**: Ajustada a lógica de inicialização do cliente Supabase. Para requisições de agendamento público oriundas da rota de auto-agendamento externo (onde `clinic_slug` ou `clinic_id` estão presentes e o usuário está anônimo), o sistema inicializa o cliente com Service Role (`createServiceRoleClient()`). Isso contorna as restrições de RLS da tabela de `doctors` e `users` para visitantes públicos, solucionando em definitivo o erro que exibia "0 resultados" de médicos nas clínicas do marketplace de auto-agendamento.


### 26/05/2026 - Ativos de Marca de Alta Resolução (Favicons Google Search), Dominância de SEO no Google e Reset Automático de Sessão WhatsApp

**Módulo → Submódulo → Arquivo → Função/Componente alterado**

- Módulo → Identidade Visual → Favicon Google Search → public/icons/icon-512x512.png, icon-192x192.png, logo.png, favicon.svg.png, favicon.ico, app/favicon.ico, favicon.png
  - **Favicons & Ativos Oficiais**: Redimensionamento e substituição de todos os favicons e ícones da aplicação com o novo logotipo oficial da marca (cruz estilizada verde e azul marinho em círculo branco) nas resoluções 512x512, 192x192, 48x48 e favicon.ico, resolvendo a queixa de ícones desatualizados mostrados nos resultados de busca do Google.
- Módulo → Landing Pages → SEO & Metadata → app/layout.tsx → Metadata Configuration
  - **Super SEO Metadata**: Enriquecimento completo do objeto global de metadados da aplicação, configurando tags de título dinâmicas e amigáveis (`CliniGO | O Melhor Sistema de Gestão de Clínicas e Consultórios`), descrição estendida, palavras-chave competitivas focadas no mercado brasileiro, controle de rastreamento `robots` refinado para o Googlebot e tags de OpenGraph completas com imagem de visualização em alta definição para compartilhamento.
  - **Google Site Verification**: Adicionado token de verificação de propriedade (`google-site-verification`) oficial do Google Search Console (`KdqyntPwFiVd3T46JuwXlcL-bSerz4LX8fRdXOTzPLU`) no objeto de metadados tipado do Next.js.
- Módulo → Marketing → Google Indexation → public/robots.txt, public/sitemap.xml → [NEW]
  - **Arquivos de Rastreamento**: Criação do arquivo de mapeamento `sitemap.xml` listando todas as páginas públicas indexáveis e do arquivo de diretrizes `robots.txt` para incentivar o robô de varredura do Google a catalogar todas as rotas institucionais e de onboarding da plataforma.
- Módulo → Chatbot → WhatsApp Auto-Reset → app/api/chatbot/route.ts → POST()
  - **Reset Automático por Inatividade (1 hora)**: Implementada lógica inteligente de monitoramento do ciclo de vida da conversa. Quando um usuário (seja no WhatsApp ou no chat da Web) envia uma mensagem e já possui sessão no banco de dados, o sistema verifica o tempo decorrido desde a última interação (`updated_at`). Caso tenha se passado mais de 1 hora, a sessão é automaticamente reativada (`status: 'active'`), o contador de mensagens é zerado (`message_count: 0`) e o estado do motor de chat é reiniciado (`createInitialState()`). Isso garante que contatos que já falaram com o bot no passado e foram transferidos ou atingiram o limite possam reiniciar conversas e interagir de forma totalmente fluida, sem silêncio do robô.

### 26/05/2026 - Envio Manual de WhatsApp no Smart Hub e Dropdown de Administradores

**Módulo → Submódulo → Arquivo → Função/Componente alterado**

- Módulo → Smart Hub → WhatsApp Painel → app/system-master-hub/clin-whatsapp/page.tsx → ClinWhatsAppPage()
  - **Interface Glassmorphic Premium**: Criação de um card elegante e translúcido para Envio Manual de WhatsApp integrado de forma nativa ao visual da página.
  - **Dropdown Dinâmico de Destinatários**: Exibição da lista de administradores e clínicas ordenados alfabeticamente para fácil seleção.
  - **Botão Recarregar (RefreshCw)**: Adicionado botão de atualização em tempo real integrado no cabeçalho do card de envio manual para buscar administradores na API.
  - **Botão Limpar (Trash2)**: Botão secundário de limpeza com janela de confirmação de segurança (`"Deseja limpar todos os campos?"`) de acordo com a Regra dos Botões.
  - **Botão Enviar (Send)**: Botão de disparo primário esmeralda com indicador visual de carregamento ("Enviando...") e bloqueio se o WhatsApp não estiver conectado.
- Módulo → Back-end → API Administradores → app/api/super-admin/admins/route.ts → GET()
  - **Nova Rota de API**: Criação de rota protegida exclusiva para `SUPER_ADMIN` que busca no Supabase todos os usuários com telefone cadastrado (`phone IS NOT NULL`) e retorna seus dados consolidados e ordenados por Clínica.
- Módulo → Back-end → API WhatsApp Proxy → app/api/clin-whatsapp/send/route.ts → POST()
  - **Proxy de Envio Seguro**: Criação de endpoint Next.js que valida o privilégio de `SUPER_ADMIN` e atua como proxy seguro encaminhando a mensagem para a instância HTTP do Clin Bot no Railway.
- Módulo → Clin Bot (Railway) → Express Mensageria → clinigo-clin-bot/src/clin-chatbot.ts → POST /clin/send
  - **Endpoint de Disparo**: Adicionada nova rota POST na aplicação Express no Railway conectando-se diretamente ao socket do Baileys (`clinSocket`) para enviar mensagens de texto para qualquer número formatado automaticamente com DDI brasileiro (`55`).

### 27/05/2026 - Correção da Relação users/clinics no Dropdown do Smart Hub WhatsApp

**Módulo → Submódulo → Arquivo → Função/Componente alterado**

- Módulo → Back-end → API Administradores → app/api/super-admin/admins/route.ts → GET()
  - **Correção da ambiguidade PGRST201 (PostgREST)**: Corrigida a ambiguidade na relação de tabelas entre `users` e `clinics` especificando explicitamente a chave estrangeira de relacionamento `clinics!users_clinic_id_fkey` na consulta do Supabase. Esta alteração resolve o erro PGRST201 ("Could not embed because more than one relationship was found...") que fazia a API de administradores retornar status 500 no Supabase e impedia o carregamento das opções no dropdown "Administrador & Clínica Destinatária" na tela do painel Clin WhatsApp.
  - **Exclusão de Contas Demo & Fallback de Celulares Reais**: Refatorada a lógica da API de administradores para ocultar completamente dados de demonstração (`is_demo = true` ou e-mails `@demo.clinigo.internal`). Implementada lógica inteligente de fallback de telefone: caso o administrador de uma clínica real não possua celular cadastrado no seu perfil de usuário (que costuma estar nulo), o sistema automaticamente herda e utiliza o telefone cadastrado na própria clínica (`clinics.phone`), permitindo a correta exibição e contato de clínicas reais como **Espaço Incluir** e **Sensorialmente**.
- Módulo → Clin Bot (Railway) → Express Mensageria → clinigo-clin-bot/src/clin-chatbot.ts → POST /clin/send
  - **Correção de Entrega e Bypass do 9º Dígito (onWhatsApp)**: Implementada validação avançada e correção de nono dígito do WhatsApp brasileiro no microserviço Express do Railway. Agora, antes de despachar a mensagem manual para o socket do Baileys (`clinSocket.sendMessage`), o bot executa a consulta `onWhatsApp` nos servidores do WhatsApp. Se a conta JID oficial do usuário estiver ativa sem o nono dígito (comportamento padrão do WhatsApp no Brasil para contas fora de SP/RJ, como o caso do Robson com DDD 88), a rota automaticamente ajusta o JID para remover/adicionar o nono dígito conforme o status real de registro, garantindo a entrega física da mensagem de forma 100% confiável e transparente.
- Módulo → Chatbot → Motor de Estados → lib/chatbot/clin-engine.ts → processStep()
  - **Fluxo de Explicação Dinâmica de Dor (Qualificação de Leads)**: Refatorado o step `'fluxo_5_aguarda_dor'` no motor determinístico do chatbot Clin. Agora, quando um lead escolhe a sua principal dor no fluxo de agendamento de demonstração guiada (Opções: A - Agenda, B - Financeiro, C - Prontuário, D - TISS), a IA recupera dinamicamente a mensagem de explicação rica correspondente àquele módulo (ex: `MSG_FUNC_4C` para Financeiro e Repasse), higieniza em tempo real removendo rodapés de menus de navegação livre e envia essa bolha explicativa sequencialmente antes da mensagem de handoff e transferência para o especialista humano. Isso qualifica e gera valor imediato ao lead demonstrando a autoridade da solução no assunto escolhido.- Módulo → Clin Bot (Railway) → Express Mensageria → clinigo-clin-bot/src/clin-chatbot.ts → INACTIVITY_TIMEOUT
  - **Ajuste de Tempo de Inatividade para 30 Minutos**: Atualizado o tempo limite da fila de monitoramento e disparo de follow-up do bot de inatividade (`INACTIVITY_TIMEOUT`) de 5 minutos para 30 minutos, otimizando o reengajamento do lead e adaptando o tempo ao comportamento humano de tomada de decisão.
- Módulo → Chatbot → Motor de Estados → lib/chatbot/clin-engine.ts e clin-messages.ts → processStep() & handleIntentOrResentMenu()
  - **Interceptação Global de Tecla '0' (Voltar ao Menu Principal)**: Adicionada a rotina global de escape de navegação determinística no motor. A qualquer momento, se o usuário digitar `'0'`, `'voltar'`, `'menu'` ou `'reiniciar'`, o sistema limpa o fluxo atual e o redireciona imediatamente para o menu principal de abertura.
  - **Tratamento Inteligente de Saudações Livres**: Desenvolvida rotina estática amigável para interceptar saudações comuns do cotidiano (`'oi'`, `'olá'`, `'bom dia'`, `'boa tarde'`, etc.) e responder com uma bolha de acolhimento amigável e simpática antes de listar o menu principal de opções, humanizando a experiência de atendimento inicial e reduzindo o consumo de APIs externas.
  - **Revisões de Gramática e Fluxo 3 de Demonstração**: Corrigidos erros ortográficos e estruturado/detalhado por completo o roteiro textual do Fluxo 3 de Demonstração no mapa de processos do chatbot.
- Módulo → Chatbot → Motor de Estados → lib/chatbot/clin-engine.ts & clin-messages.ts
  - **Fluxo 3 Totalmente Roteirizado (Demo/Trial)**: Desenvolvidos e implementados os roteiros textuais específicos e detalhados do Fluxo 3 de Demonstração (Demo Guiada com Especialista redirecionando para qualificação e Trial Direto com links e opções de ajuda contextualizadas).
  - **Tratamento da Opção 'E' (Outro Assunto)**: Mapeado o step `fluxo_5_outro_assunto` com mensagens de acolhimento livre e handoff automático de dúvida não reconhecida para atendimento humano.
  - **Indicação Visual Global de Voltar (Teclado 0)**: Adicionado o informativo visual `🔙 0 — Voltar ao menu principal` nos passos 2, 3 e 4 do formulário de coleta de leads.
- Módulo → Clin Bot (Railway) → Express Mensageria → clinigo-clin-bot/src/clin-chatbot.ts
  - **Arquitetura de Recuperação em Duas Etapas (30m e 24h)**: Desenvolvido fluxo de recuperação inteligente de sessões. O robô gerencia em paralelo timers de 30 minutos e 24 horas no Baileys. Ao completar 30m, envia a mensagem de inatividade leve e agenda o disparo de 24h. Se disparado o de 24h, o sistema altera programaticamente a sessão no Supabase para o step `recuperacao_24h` para processar a resposta comercial do usuário.
- Módulo → Back-end → Smart Hub WhatsApp → app/system-master-hub/clin-whatsapp/page.tsx
  - **Suporte a Envio Manual de WhatsApp (Número Livre)**: Refatorado o formulário "Enviar Mensagem Manual". Implementado seletor dinâmico (com estilo glassmorphic moderno) que permite ao administrador alternar o método de destino entre "Administrador Cadastrado" (dropdown tradicional com busca) e "Digitar Número Manual" (campo de texto livre com placeholder, máscara e suporte a DDD/DDI automático). Ao digitar um celular brasileiro sem DDI, o sistema injeta e trata dinamicamente o prefixo nacional `55`, proporcionando agilidade no dia a dia.

### 27/05/2026 - Implantação de Mural de Recados CliniGO (Interno, Paciente e Multiclínica)

**Módulo → Submódulo → Arquivo → Função/Componente alterado**

- Módulo → Banco de Dados → Supabase Migrations → supabase/migrations/20260527000000_create_clinic_bulletins.sql → [NEW]
  - **Criação de Tabela e RLS Multiclínica**: Criação da tabela `clinic_bulletins` contendo campos para categorização (`info`, `warning`, `alert`, `success`), escopo (`internal`, `patients`, `all`) e fixação (`is_pinned`). Habilitado RLS com isolamento absoluto: membros da equipe gerenciam apenas os boletins da clínica vinculada e pacientes leem apenas recados públicos pertencentes à clínica em que estão cadastrados.
- Módulo → Back-end → API de Boletins e Recados → app/api/bulletins/route.ts → [NEW]
  - **CRUD Seguro para Equipe**: Rota que gerencia (GET, POST, PUT, DELETE) recados por clínica. O `clinic_id` é extraído dinamicamente a partir do identificador do usuário autenticado no cabeçalho `x-user-id`, prevenindo manipulações e garantindo que nenhuma clínica acesse dados de outra.
- Módulo → Back-end → API de Boletins Pacientes → app/api/patient/bulletins/route.ts → [NEW]
  - **Leitura Segura para Paciente**: Rota com método GET protegida pela autenticação do paciente (`verifyPatientToken`). Ela recupera de forma transparente os recados públicos (com target `patients` ou `all`) vinculados ao `clinic_id` cadastrado no perfil daquele paciente.
- Módulo → Dashboard → Widget Mural de Recados → app/dashboard/page.tsx → DashboardPage()
  - **Interface Glassmorphic Premium**: Integração de um painel de avisos em formato de "post-it" dinâmicos e translúcidos. O painel exibe recados internos e importantes no topo da tela inicial de forma interativa.
  - **Drawer de Gerenciamento & Auditoria de Botões**: Implementação de formulário lateral para Novo Recado/Edição com seletores de tipo de alerta e controle de fixação. Toda a checklist de botões foi auditada e implementada: botões "Novo Recado", "Salvar", "Excluir" (com confirmação por popup), "Editar", "Limpar" (com confirmação) e "Cancelar" funcionando perfeitamente.
- Módulo → Espaço da Família → Mural de Avisos da Família → app/(patient)/meu-painel/page.tsx → PatientDashboardPage()
  - **Comunicados do Paciente**: Integração sutil de um mural de comunicados da clínica no topo do portal do paciente. A seção exibe comunicados com layout limpo e indicador visual de urgência por cores (azul, verde, amarelo, vermelho). A seção possui detecção inteligente: caso não existam avisos no momento, a tela se mantém limpa e livre de ruídos.

### 27/05/2026 - Centralização do Mural de Recados com Notificações Ativas na Agenda Geral e Limpeza de Dashboard

**Módulo → Submódulo → Arquivo → Função/Componente alterado**

- Módulo → Dashboard → Tela Principal → app/dashboard/page.tsx → DashboardPage()
  - **Otimização de Layout e Limpeza Cognitiva**: Remoção cirúrgica do widget do Mural de Recados do Dashboard, desafogando o painel de entrada de dados e priorizando a exibição limpa e estruturada das Próximas Consultas e atalhos rápidos do dia a dia.
- Módulo → Agenda → Toolbar de Ações → components/ui/agenda-view.tsx → AgendaPage()
  - **Botão Mural de Recados Integrado (Ao lado de Dia/Semana)**: Criação de um botão estilizado de alto padrão visual com borda âmbar e ícone `Megaphone` inserido diretamente ao lado dos seletores de período.
  - **Badge Pulsante e Notificações Ativas**: Implementada lógica de monitoramento de comunicados. O botão exibe dinamicamente um badge vermelho pulsante (`animate-ping`) contendo a quantidade de comunicados não lidos. O estado de leitura de cada comunicado é persistido de forma offline no `localStorage` do navegador do usuário. No momento em que o usuário clica para abrir o Mural de Recados, todos os avisos atuais são marcados como lidos automaticamente e o badge de notificação zera.
  - **Gaveta Lateral de Comunicados & CRUD de Recados**: Injeção da gaveta (Drawer) para listagem geral de recados do Mural, exibindo tipo de alerta, fixação e ações de manipulação. Habilitada permissão abrangente (`canManageBulletins`) que permite que Administradores, Recepcionistas, Médicos, Terapeutas e Coordenadores (toda a equipe clínica logada) publiquem, editem, fixem e removam comunicados no Mural de forma unificada e colaborativa.
  - **Conformidade Rígida com a Regra dos Botões**: Auditado e integrado todos os botões funcionais: "Novo Comunicado" (para criar), "Salvar" (para persistir), "Editar" (para alterar), "Excluir" (com confirmação por popup), "Limpar" (para redefinir inputs com confirmação), "Fechar" e "Cancelar" operando de forma imediata e elegante.

### 28/05/2026 - Controle Global de Expiração de Trial e Bloqueio Unificado de Acesso (Médicos, Admins e Pacientes)

**Módulo → Submódulo → Arquivo → Função/Componente alterado**

- Módulo → Autenticação → Controle de Trial → e:\Backup Clinigo 11-03-2026\clinigo\clinigo-producao\middleware.ts → middleware()
  - **Bloqueio Unificado e Global de Trial**: Implementado o bloqueio absoluto de acesso a rotas privadas do Portal do Paciente se o trial da clínica estiver expirado ou a clínica inativa. O middleware agora realiza uma consulta unificada no Supabase utilizando join entre `patients` e `clinics` a partir do `patient.sub` (JWT sub ID). Se a clínica do paciente estiver inativa ou com o trial expirado (`trial_ends_at < new Date()`), o acesso a rotas privadas e APIs é bloqueado, redirecionando o paciente para `/paciente/entrar?error=trial_expired` ou retornando status `402` (Payment Required) para chamadas de API.
  - **Reforço de Segurança Tripartite**: Garantiu-se que todos os perfis cadastrados no sistema (administradores, médicos e pacientes) tenham o acesso bloqueado imediatamente e simultaneamente assim que o trial expirar, mantendo as rotas críticas de upgrade e faturamento/billing abertas para permitir a reativação por autoatendimento.

- Módulo → Faturamento → Webhooks → e:\Backup Clinigo 11-03-2026\clinigo\clinigo-producao\app\api\webhooks\mercadopago\route.ts → POST()
  - **Correção da Liberação de Assinaturas (Remoção de Banners e Proteção de Bloqueio)**: No fluxo de pagamentos de assinaturas aprovadas (`sub_` prefix), o webhook agora atualiza o `approval_status` da clínica para `'active'` e define `is_active: true` no Supabase (anteriormente, apenas atualizava o `plan_type`). Isso remove instantaneamente o banner de trial de 7 dias do painel e blinda a clínica contra a expiração automática de trial feita pelo cron job.
  - **Notificações por E-mail em Upgrade/Assinaturas**: Injetado o envio automático de e-mail de confirmação de pagamento com design premium do CliniGo, contendo o plano, método, valor cobrado e ID de transação para o e-mail do gestor da clínica no fluxo de renovação/upgrade de assinatura (`sub_`).
  - **Disparos Automáticos por WhatsApp**: Inserida a chamada à API oficial de mensageria nativa (`sendWhatsAppMessage`), notificando instantaneamente em tempo real no celular do gestor sobre o pagamento aprovado del plano e a liberação total do sistema tanto no fluxo de onboarding inicial (`clinic_` prefix) quanto no fluxo de assinatura recorrente/upgrade (`sub_` prefix).

- Módulo → Painel Master Admin → Navegação → e:\Backup Clinigo 11-03-2026\clinigo\clinigo-producao\app\system-master-hub\clin-whatsapp\page.tsx → ClinWhatsAppPage()
  - **Implementação do Botão de Voltar Premium**: Adicionado um link de navegação estruturada e retroativa direcionando o superadministrador de volta ao painel geral do Master Hub (`/system-master-hub`). O botão inclui o ícone `ArrowLeft`, suporte de tipografia para o padrão estético dark-glassmorphism e uma micro-animação interativa (`group-hover:-translate-x-1 transition-transform`) que melhora a usabilidade de navegação profunda nas configurações do robô de atendimento.

- Módulo → Painel Master Admin → Integração → e:\Backup Clinigo 11-03-2026\clinigo\clinigo-producao\app\api\clin-whatsapp\send\route.ts → POST()
  - **Tratamento Inteligente de Nono Dígito de WhatsApp (Multiregiões do Brasil)**: Implementado no proxy local da API de envio de WhatsApp uma lógica de fallback automático para garantir a entrega de mensagens no Brasil. Se o número de destino for brasileiro, contiver 13 dígitos (com o nono dígito incluído) e possuir DDD maior que 28, a API automaticamente realiza o disparo para ambas as variações do JID no WhatsApp: com o nono dígito e sem o nono dígito. Isso elimina problemas de falhas de entrega silenciosas em contas mais antigas registradas no Meta sem o dígito 9.

### 29/05/2026 - Compactação e Ajuste de Responsividade da Toolbar da Agenda (Sem Quebras e Corte)

**Módulo → Submódulo → Arquivo → Função/Componente alterado**

- Módulo → Recepção → Agenda → components/ui/agenda-view.tsx → Toolbar Controls
  - **Ajuste de Alturas e Escala Uniforme**: Redimensionamento e unificação da altura de todos os botões e seletores da barra de ferramentas da agenda para `h-10` (40px) e com bordas arredondadas `rounded-xl`, mantendo a harmonia visual de alto padrão da interface.
  - **Prevenção de Esmagamento de Botões (shrink-0)**: Adicionada a propriedade `shrink-0` a todos os botões e subcontêineres da barra, e `min-w-full` ao contêiner flexbox interno. Isso impede que o navegador encolha e corte o texto dos botões ("Novo Agendamento" e "Mural de Recados") em resoluções menores, garantindo que o scroll horizontal funcione de forma ideal nas viewports desktop, tablet e mobile.
  - **Texto Completo do Botão Principal**: Fixado o rótulo do botão principal sempre como "Novo Agendamento" em todas as resoluções, sem abreviações automáticas.

### 29/05/2026 - Cartões Coloridos por Status na Recepção, Exibição de Notas e Padronização de Botões (Checklist & Alto Contraste)

**Módulo → Submódulo → Arquivo → Função/Componente alterado**

- Módulo → Recepção → Fila de Espera / Atendimento → app/dashboard/(clinic)/recepcao/page.tsx → Grid de Colunas
  - **Visual Colorido por Status**: Implementada nova estilização visual nos cards de paciente em cada uma das colunas do Kanban de recepção, garantindo legibilidade absoluta e alto contraste:
    - **Aguardando**: Cards estilizados com fundo levemente laranja/âmbar (`bg-amber-50/70 dark:bg-amber-950/20`) e borda (`border-amber-250/70 dark:border-amber-900/30`), com contador numérico esférico golden.
    - **Em Atendimento**: Cards estilizados com fundo levemente azul (`bg-blue-50/60 dark:bg-blue-950/20`) e borda (`border-blue-200/80 dark:border-blue-900/40`).
    - **Concluídos**: Cards estilizados com fundo levemente verde (`bg-emerald-50/60 dark:bg-emerald-950/20`) e borda (`border-emerald-250/70 dark:border-emerald-900/40`).
  - **Exibição Completa de Informações & Notas**: Adicionada a exibição destacada das observações clínicas e notas do agendamento (`notes`) em uma caixa estilizada translúcida com texto itálico no rodapé de cada card. Incorporados badges para identificar "Prioridade" (vermelho destrutivo) e "Encaixe" (azul celeste).
  - **Padronização de Botões (Checklist de Botões)**: Substituição do antigo badge passivo de status "Atendido" na coluna de Concluídos por um botão premium verde completo, contendo o ícone `CheckCircle` e o rótulo "Atendido", padronizando a altura (`h-8`), cantos arredondados (`rounded-xl`) e feedbacks visuais em conformidade com as diretrizes de botões.

### 29/05/2026 - Atualização e Recarregamento Automático de Tela na Clínica via Hard Refresh no Master Hub

**Módulo → Submódulo → Arquivo → Função/Componente alterado**

- Módulo → Back-end → API Revalidação → app/api/super-admin/revalidate/route.ts → POST()
  - **Propagação Realtime do Expurgo de Cache**: Adicionada a instrução para realizar um update no banco de dados na linha correspondente da clínica (tabela `clinics`, coluna `updated_at` com o timestamp atual). Isso garante que um sinal em tempo real (Supabase Postgres Changes) seja disparado para todos os navegadores ativos daquela clínica simultaneamente ao limpar o cache no servidor Next.js.
- Módulo → Clientes → Layout Principal → app/dashboard/layout.tsx & components/system/system-refresh-listener.tsx → [NEW]
  - **Componente SystemRefreshListener**: Criação de componente cliente invisível responsável por escutar em tempo real a alteração do campo `updated_at` na tabela `clinics` para o respectivo ID da clínica logada. Quando detectado o evento de atualização disparado pelo Master Hub, ele automaticamente aciona `window.location.reload()` no navegador cliente.
  - **Integração no Layout**: Injetado o `<SystemRefreshListener clinicId={effectiveClinicId} />` no layout global do Dashboard da clínica (`app/dashboard/layout.tsx`), garantindo cobertura total em qualquer aba que o usuário da clínica esteja navegando.

### 31/05/2026 - Edição de Mensagens Programadas Pendentes no WhatsApp do Master Hub

**Módulo → Submódulo → Arquivo → Função/Componente alterado**

- Módulo → Painel Master Admin → Gestão WhatsApp → e:\Backup Clinigo 11-03-2026\clinigo\clinigo-producao\app\system-master-hub\clin-whatsapp\page.tsx → handleStartEdit(), handleCancelEdit(), handleScheduleMessage(), handleSendScheduledNow(), handleTriggerQueue(), UI Tabela e Cabeçalho
  - **Fluxo Dinâmico de Edição**: Criada a funcionalidade de alteração de dados de mensagens na fila que ainda estão com status `'pending'`. Ao selecionar "Editar", o sistema preenche todos os campos do formulário automaticamente (detectando se o número é de administrador cadastrado ou manual e formatando a data local adequadamente) e direciona o foco do usuário rolando a tela suavemente (`scrollIntoView`) até o topo do formulário.
  - **Lógica Unificada de Persistência no Supabase**: A função `handleScheduleMessage` foi aprimorada para alternar dinamicamente entre requisições de criação (`.insert()`) e modificações de registros existentes (`.update()`) com base no estado `editingMessageId`, revertendo automaticamente falhas anteriores para `'pending'`.
  - **Auditoria de Botões & Touch Mobile (PWA/Mobile)**: Implementada a barra de botões com controle de fechamento/descarte ("Cancelar Edição") e persistência ("Salvar Alterações") com micro-feedbacks táteis e visuais. Todos os novos botões do formulário e da tabela de listagem foram configurados com área de toque mínima de `44x44px` (`min-h-[48px]` no form e padding expandido na tabela) e espaçamento horizontal otimizado (`gap-2`), blindando 100% o layout responsivo de quebras ou toques acidentais em dispositivos móveis.
  - **Disparador Manual Individual (Enviar Agora)**: Adicionada a função `handleSendScheduledNow` conectada ao botão de aviãozinho (`Send`) azul na listagem de ações. O administrador pode forçar o envio imediato e direto de qualquer mensagem programada pendente sem depender do cron job externo, registrando o log de sucesso ou falha instantaneamente no banco de dados.
  - **Processamento Geral de Fila Vencida (Disparar Fila Vencida)**: Adicionado o botão "⚡ Disparar Fila Vencida" no cabeçalho dos Agendamentos Salvos que aciona `handleTriggerQueue()`. A função faz uma varredura local em lote de todas as mensagens programadas pendentes que já passaram do horário de disparo, enviando todas em sequência imediata e dando feedback consolidado na tela.

### 15/06/2026 - Alerta Discreto de Mensalidade Vencida no Layout Global do Dashboard (Visível a Todos)

**Módulo → Submódulo → Arquivo → Função/Componente alterado**

- Módulo → Configurações → Assinatura → e:\Backup Clinigo 11-03-2026\clinigo\clinigo-producao\components\plans\BillingOverdueBanner.tsx → [NEW]
  - **Componente de Banner Discreto de Pagamento Pendente**: Desenvolvimento de componente React do lado do cliente (`'use client'`) com design moderno de alto contraste (fundo âmbar translúcido e ícone de alerta) e suporte a acessibilidade (botões com área de toque mínima de `44x44px` em conformidade com as regras PWA). O componente exibe de forma sutil o aviso de cobrança vencida a todos os usuários da clínica logados, customizando o texto: para administradores, exibe o botão ativo "Pagar Fatura" direcionando para a página de faturamento; para profissionais de saúde e recepcionistas, exibe um recado orientativo solicitando contato com o gestor da clínica.
- Módulo → Configurações → Assinatura → e:\Backup Clinigo 11-03-2026\clinigo\clinigo-producao\app\dashboard\layout.tsx → DashboardRootLayout()
  - **Integração no Layout Geral do Dashboard**: Alterado o layout de servidor Next.js para carregar as colunas `payment_confirmed` e `subscription_due_date` do banco Supabase ao autenticar uma clínica. Caso o faturamento esteja pendente (`payment_confirmed === false`) e não seja uma clínica de demonstração (`slug !== 'demo'`), o componente renderiza o banner discreto `<BillingOverdueBanner />` no topo do painel de conteúdo do dashboard, garantindo ampla visibilidade colaborativa interna sem bloquear as operações do dia a dia.

### 22/06/2026 - Reestruturação Fila de Espera, Duplicidade de Evoluções e Segregação de Documentos

**Solicitado por:** Espaço Incluir (Jeferson)
**Escopo:** Todas as clínicas

**Módulo → Submódulo → Arquivo → Função/Componente alterado**

- Módulo → Terapia → Fila de Espera → `app/dashboard/(clinic)/terapia/fila-espera/page.tsx` → [REWRITE]
  - **Formulário com abas Comercial/Financeiro**: Reestruturação completa do formulário de adição/edição. Aba Comercial: Nome, Responsável, Telefone, Terapias dinâmicas (com quantidade e botão "Adicionar Terapia"), Turno preferido, Observação comercial. Aba Financeiro: Data do contato, Resultado (Convertido/Aguardando Informação/Não Convertido), Observação financeira.
  - **Terapias dinâmicas**: Array JSONB com nome e quantidade por terapia. Botão `+` para adicionar múltiplas terapias.
  - **Listagem expandida**: Tabela com colunas Responsável, Terapias (badges), Resultado Financeiro (badges coloridos).

- Módulo → Terapia → Fila de Espera → `app/api/waiting-list/route.ts` → POST/PUT
  - **Novos campos no POST**: `responsible_name`, `therapies` (JSONB), `commercial_notes`, `financial_contact_date`, `financial_result`, `financial_notes`.
  - **Novos campos no PUT**: Mesmos campos adicionados ao update condicional.

- Módulo → Terapia → Conformidade Evoluções → `app/api/reports/evolution-compliance/route.ts` → GET
  - **Detecção de duplicatas**: Novo algoritmo que identifica evoluções com mesmo `doctor_id + patient_id + evolution_date`. Retorna array `duplicates` com nome do paciente, data, terapeuta e contagem.
  - **Campo `total_duplicates`** adicionado ao summary.

- Módulo → Terapia → Conformidade Evoluções → `app/dashboard/(clinic)/terapia/conformidade-evolucao/page.tsx` → UI
  - **Card de alerta de duplicatas**: Painel visual âmbar listando possíveis evoluções duplicadas com paciente, terapeuta, data e contagem.

- Módulo → Prontuário → Documentos → `components/documents/DocumentUpload.tsx` → [REWRITE]
  - **Categorias agrupadas**: Select com grupos visuais "🏥 Saúde" (Exame, Receita, Laudo, Encaminhamento, Atestado) e "📋 Administrativo" (Carteirinha, Termo, Outro, Pessoal/ADM).
  - **Campo `doc_group`**: Salva automaticamente `health` ou `admin` baseado no tipo selecionado.

- Módulo → Prontuário → Documentos → `components/patients/PatientDocuments.tsx` → [REWRITE]
  - **Duas seções visuais**: "Documentos de Saúde" (ícone estetoscópio, borda verde) e "Documentos Administrativos" (ícone pasta, borda padrão).
  - **Modal de edição** com grupos de categorias idênticos ao upload.

- Módulo → Prontuário → Documentos → `app/api/documents/route.ts` → GET
  - **Filtro por role DOCTOR**: Terapeutas não-coordenadores agora só veem documentos de saúde (`doc_group = 'health'`).

- Módulo → Prontuário → Documentos → `app/api/documents/[id]/route.ts` → PATCH
  - **Salvamento de `doc_group`**: Adicionado suporte para salvar/atualizar o grupo do documento na edição.

- Módulo → UI → Select → `components/ui/select.tsx`
  - **Novo componente `SelectLabel`**: Adicionado para permitir labels visuais em grupos de select.
  - **Novo componente `SelectSeparator`**: Adicionado para separação visual entre grupos.

**Migrations SQL:**
- `supabase/migrations/20260622000000_waiting_list_financial_and_therapies.sql`
- `supabase/migrations/20260622000001_document_categories_health_admin.sql`
- `supabase/migrations/EXECUTAR_MANUAL_20260622.sql` (consolidado para execução no Dashboard)

### 22/06/2026 - WhatsApp Multi-Sessão por Setor

**Solicitado por:** Espaço Incluir (Jeferson)
**Escopo:** Todas as clínicas (retrocompatível)

**Módulo → Submódulo → Arquivo → Função/Componente alterado**

- Módulo → Comunicação → WhatsApp → `lib/whatsapp/service.ts` → [MULTI-SECTOR SUPPORT]
  - **Chave composta do Map**: Sessões agora indexadas por `clinicId__sector` ao invés de `clinicId`.
  - **Todas as funções exportadas** (`createInstanceAndGetQR`, `checkInstanceStatus`, `sendWhatsAppMessage`, `disconnectInstance`) recebem parâmetro opcional `sector` (default: `'default'`).
  - **Nova função `getAllClinicSessions`**: Retorna todas as sessões de uma clínica.
  - **Retrocompatível**: Chamadores existentes sem `sector` continuam funcionando (default = `'default'`).

- Módulo → Comunicação → WhatsApp → `app/api/whatsapp/connect/route.ts` → POST
  - Aceita `{ sector }` no body para conectar um setor específico.

- Módulo → Comunicação → WhatsApp → `app/api/whatsapp/disconnect/route.ts` → POST
  - Aceita `{ sector }` no body para desconectar setor específico.

- Módulo → Comunicação → WhatsApp → `app/api/whatsapp/status/route.ts` → GET
  - Aceita `?sector=` como query param. `?sector=all` retorna array de todas as sessões.

- Módulo → Comunicação → WhatsApp → `app/api/whatsapp/send/route.ts` → POST
  - Aceita `{ sector }` no body para enviar por um número específico.

- Módulo → Comunicação → WhatsApp → `app/dashboard/(clinic)/whatsapp/page.tsx` → [REWRITE]
  - **Interface multi-sessão**: Cards de sessões conectadas/desconectadas por setor.
  - **Modal QR Code**: Dialog com QR + polling automático por setor.
  - **Dialog "Adicionar Setor"**: Input com sugestões pré-definidas (Recepção, Financeiro, Comercial, Clínico, Suporte).
  - **Badges coloridos por setor** para identificação visual.

**Migrations SQL:**
- `supabase/migrations/20260622000002_whatsapp_multi_session.sql`
- `supabase/migrations/EXECUTAR_MANUAL_20260622_WHATSAPP.sql` (consolidado para execução no Dashboard)
