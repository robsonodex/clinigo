# DOCUMENTAÇÃO TÉCNICA V5 — AUDITORIA PÓS-RESTORE
## CliniGo SaaS · Atualizada em 29/04/2026

> **Objetivo:** Refletir o estado real do codebase e banco de dados após restore de backup.

---

## 1. VISÃO GERAL

| Item | Valor |
|---|---|
| **Framework** | Next.js 16.1.1 (App Router) |
| **Runtime** | React 19, TypeScript 5 |
| **Banco** | Supabase (PostgreSQL) |
| **Styling** | TailwindCSS 4 |
| **Deploy** | Vercel (clinigo.app) |
| **Auth** | Supabase Auth + JWT (portal paciente) |
| **Cache** | Upstash Redis |
| **Pagamento** | MercadoPago + Banco Inter |
| **Observability** | Sentry, PostHog, Pino logger |
| **AI** | OpenRouter (brain-engine), OpenAI (CID-10) |

---

## 2. SISTEMA DE PLANOS (4 Tiers)

| Plano | Preço | Max Médicos | Max Pacientes | Storage | Unidades |
|---|---|---|---|---|---|
| **BASICO** | R$99/mês | 1 | 200 | 2 GB | 1 |
| **AVANCADO** | R$249/mês | 5 | ∞ | 20 GB | 1 |
| **PROFESSIONAL** | R$449/mês | 30 | ∞ | 100 GB | 3 |
| **ENTERPRISE** | R$699+/mês | ∞ | ∞ | 500 GB | ∞ |

### Recursos por Plano (Route Gate — `route-features.ts`)

| Recurso | Plano Mínimo |
|---|---|
| Dashboard, Agenda, Prontuário, Financeiro básico, Relatórios | BASICO |
| Repasse Médico (`/financial/payroll`) | AVANCADO |
| DRE Gerencial (`/financial/dre`) | AVANCADO |
| Auditoria Financeira (`/financial/audit`) | AVANCADO |
| CRM, WhatsApp, Automação, Importação, Integrações | AVANCADO |
| TISS Completo (`/tiss/*`) | PROFESSIONAL |
| Multi-Unidade (`/grupos`) | PROFESSIONAL |
| Groups API, Integrations API | ENTERPRISE |

---

## 3. ARQUITETURA DE AUTENTICAÇÃO (middleware.ts — 633 linhas)

### Camadas de Auth

1. **Supabase Auth** — Médicos, Admins, Clinic Admins
2. **JWT (jose)** — Portal do Paciente (cookie `patient_token`)
3. **Super Admin Whitelist** — Emails hardcoded em env
4. **Partner Auth** — Role `PARTNER` via user_metadata

### Fluxo do Middleware

```
Request → WWW Redirect → Auth Route Bypass → Static Skip
  → Super Admin Gate → Patient JWT Gate → Partner Gate
  → Supabase Auth → Clinic Active Check → Payment Check
  → Trial Expiration → Plan Gate → Role Gate → Headers
```

### Headers Injetados

| Header | Descrição |
|---|---|
| `x-user-id` | UUID do usuário autenticado |
| `x-user-role` | Role: DOCTOR, CLINIC_ADMIN, SUPER_ADMIN |
| `x-clinic-id` | UUID da clínica do usuário |
| `x-plan-type` | Plano ativo: BASICO, AVANCADO, etc. |

---

## 4. ESTRUTURA DE DIRETÓRIOS

```
clinigo-producao/
├── app/
│   ├── api/                    # 83 módulos de API (~260 route.ts)
│   ├── dashboard/
│   │   ├── (admin)/            # Super Admin (13 páginas)
│   │   ├── (clinic)/           # Clínica (45+ páginas)
│   │   └── (doctor)/           # Médico (4 páginas)
│   ├── partners/               # Portal de afiliados
│   ├── paciente/               # Portal do paciente
│   ├── video/                  # Teleconsulta
│   └── painel-tv/              # TV Panel (recepção)
├── components/                 # 46 módulos de componentes
├── hooks/                      # 8 hooks customizados
├── lib/
│   ├── ai/                     # Brain Engine, CID-10 Suggester
│   ├── aia/                    # Triagem IA
│   ├── cache/                  # Redis, Plan Cache, Slots Cache
│   ├── constants/              # Plans, Route Features
│   ├── services/               # 32+ serviços externos
│   ├── supabase/               # Clients (server/browser)
│   └── utils/                  # Export, formatação
├── types/                      # 8 arquivos de tipos
├── __tests__/                  # Testes (billing, plan-guards, cron, tiss)
├── demo-system/                # Seeds e scripts demo
└── docs/                       # 6 arquivos de documentação
```

---

## 5. MÓDULOS API — INVENTÁRIO COMPLETO (83 módulos)

### Core

| Módulo | Rotas | Descrição |
|---|---|---|
| `appointments` | 10+ | CRUD, cancel, confirm, status, recurring, details |
| `consultations` | 3 | Atendimentos, evolução |
| `patients` | 3 | CRUD pacientes |
| `doctors` | 5+ | Perfil, schedules, health-insurances |
| `clinics` | 3 | Detalhes, by-slug |
| `users` | 3 | Invite, CRUD, reset-password |

### Financeiro

| Módulo | Rotas | Descrição |
|---|---|---|
| `financial` | 5+ | Dashboard, DRE, executive, audit |
| `billing` | 6 | create-preference, webhook, subscription, boleto, generate-payment |
| `payments` | 3 | Webhook MercadoPago, create-preference |
| `revenue` | 1 | Revenue reports |
| `payroll` | 2+ | Repasse médico |

### TISS (Convênios)

| Módulo | Rotas | Descrição |
|---|---|---|
| `tiss/batches` | 6 | CRUD, generate-xml, sign, submit, errors |
| `tiss/guides` | 4 | CRUD, validate, xml |
| `tiss/glosas` | 3 | CRUD, metrics, contest |
| `tiss/returns` | 5 | Upload, parse, status |
| `tiss/autorizacao` | 2 | Autorização prévia |
| `tiss/*` | 6 | Eligibility, operators, import, validate-xsd, dashboard |

### Clínico

| Módulo | Rotas | Descrição |
|---|---|---|
| `medical-records` | 2 | Prontuários |
| `medical-record-templates` | 1 | Templates de prontuário |
| `prescriptions` | 1 | Prescrições |
| `session-evolutions` | 2 | Evoluções por sessão |
| `therapeutic-plans` | 2 | Planos terapêuticos |
| `session-packages` | 1 | Pacotes de sessão |
| `session-replacements` | 1 | Substituição de sessões |
| `documents` | 1 | Documentos clínicos |

### Operacional

| Módulo | Rotas | Descrição |
|---|---|---|
| `reception` | 3 | Painel, walk-in, queue |
| `checkin` | 5 | QR, OCR, pre-checkin, validate, verify |
| `face-biometrics` | 1 | Check-in facial |
| `totem` | 1 | Auto-atendimento QR |
| `consulting-rooms` | 1 | Salas de consulta |
| `schedule-price-ranges` | 1 | Faixas de preço |
| `absence-rules` | 1 | Controle de faltas |

### Comunicação

| Módulo | Rotas | Descrição |
|---|---|---|
| `chat` | 1 | Chat interno |
| `whatsapp` | 1 | Test connection |
| `teleconsulta` | 1 | Consent |
| `video` | 4 | Create room, validate-token, upload-recording, waiting |

### Integrações & Admin

| Módulo | Rotas | Descrição |
|---|---|---|
| `integrations` | 1+ | Settings |
| `webhooks` | 2 | MercadoPago, Banco Inter |
| `super-admin` | 15+ | Dashboard, clinics CRUD, plan changes, SMTP |
| `admin` | 1 | Admin routes |
| `audit` / `audit-log` | 2 | Logs de auditoria |

### AI & Automação

| Módulo | Rotas | Descrição |
|---|---|---|
| `ai` | 1+ | Predict diagnosis |
| `aia` | 1 | Triagem IA |
| `crm` | 1 | CRM |
| `partners` | 3+ | Register, dashboard |
| `import` | 1+ | CSV import |

---

## 6. CRON JOBS (9 endpoints)

| Rota | Função |
|---|---|
| `cron/send-reminders` | Lembretes de consulta |
| `cron/send-notifications` | Fila de notificações |
| `cron/expire-trials` | Expirar trials vencidos |
| `cron/cancel-unpaid` | Cancelar clínicas inadimplentes |
| `cron/check-subscriptions` | Verificar status assinaturas |
| `cron/reconcile-payments` | Conciliação MercadoPago |
| `cron/calculate-commissions` | Comissões de afiliados |
| `cron/execute-automations` | Automações programadas |
| `cron/reset-demo` | Reset ambiente demo |

---

## 7. SERVIÇOS EXTERNOS (`lib/services/`)

| Serviço | Arquivo | Integração |
|---|---|---|
| MercadoPago | `mercadopago.ts` | Pagamentos split, webhook |
| Banco Inter | `bancointer.ts` | Boletos, cobrança |
| WhatsApp Business | `whatsapp-business.ts` | Notificações |
| Email Multi-tenant | `email-multi-tenant.ts` | SMTP customizado por clínica |
| OCR | `ocr-service.ts` | Leitura de documentos |
| Assinatura Digital | `digital-signature.ts` | Guias TISS |
| Transcrição | `transcription-service.ts` | Audio→texto |
| Feature Flags | `feature-flags.ts` + `feature-gate.ts` | Gates de plano |
| Rate Limiter | `rate-limiter.ts` | Proteção de API |
| Checkin Notifications | `checkin-notifications.ts` | Alertas de chegada |
| Teleconsulta Recording | `teleconsulta-recording.ts` | Gravação de vídeo |
| Partner Service | `partner.service.ts` | Programa de afiliados |
| Permissions | `permissions-service.ts` | RBAC granular |
| Plan Limits | `plan-limits.ts` | Enforcement de limites |
| Commission | `commission.service.ts` | Cálculo de comissões |
| CSV Import | `csv-importer.ts` | Importação de dados |
| AI Service | `ai.ts` | Assistência clínica |
| AIA Audit | `aia-audit.ts` | Auditoria IA |
| RJ Integrations | `rj-integrations.ts` | Integrações regionais RJ |

---

## 8. VARIÁVEIS DE AMBIENTE (Auditadas)

### Supabase (Críticas)
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

### Auth & Security
- `JWT_SECRET` — Portal paciente
- `SUPER_ADMIN_EMAILS` — Whitelist super admin
- `ENCRYPTION_KEY` — Criptografia de dados sensíveis
- `CRON_SECRET_KEY` — Proteção de cron jobs

### Pagamentos
- `MERCADOPAGO_ACCESS_TOKEN`
- `INTER_CLIENT_ID`, `INTER_CLIENT_SECRET`, `INTER_CERT_*`

### AI
- `OPENROUTER_API_KEY` — Brain Engine
- `OPENAI_API_KEY` — CID-10 Suggester

### Cache & Observability
- `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`
- `NEXT_PUBLIC_SENTRY_DSN`
- `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST`

### Misc
- `NEXT_PUBLIC_APP_URL` — Base URL (https://www.clinigo.app)
- `LOG_LEVEL`
- `DEMO_MODE`, `DEMO_SUPABASE_URL`

---

## 9. PÁGINAS DO DASHBOARD (Inventário por Perfil)

### Admin de Clínica (45+ páginas)

| Seção | Páginas |
|---|---|
| **Agenda** | agenda, agenda/balcao |
| **Recepção** | recepcao, recepcao/face-checkin, recepcao/painel |
| **Atendimentos** | atendimentos, atendimentos/[id] |
| **Prontuários** | prontuarios, prontuarios/[id] |
| **Pacientes** | pacientes, pacientes/[id] |
| **Médicos** | medicos |
| **Financeiro** | financeiro, financeiro/dre, financeiro/conciliacao, financeiro/glosas, financeiro/operadoras, financeiro/reembolsos |
| **Financial (EN)** | financial/audit, financial/dre, financial/payroll (+ contracts, report, [id]) |
| **TISS** | tiss, tiss/autorizacao, tiss/batches, tiss/batches/[id], tiss/glosas, tiss/migration, tiss/reports/loss-analysis |
| **Configurações** | configuracoes (principal), assinatura, pagamento, pagina-publica, reembolso, reembolso-paciente, teleconsulta, templates-prontuario, terapias, usuarios |
| **Relatórios** | relatorios |
| **Comunicação** | chat, whatsapp, notificacoes |
| **Outros** | convenios, crm, documentos, estoque, evolucoes, controle-faltas, horarios, integracoes, integracoes/whatsapp, logs-auditoria, planos-terapeuticos, seguranca, termos, triagem, consultas, pagamentos |
| **Automação** | automacao, automacao/configuracoes |
| **Importação** | importacao, importacao/novo, importacao/[id] |

### Médico (4 páginas)

| Página | Descrição |
|---|---|
| `minha-agenda` | Agenda pessoal |
| `consultas/[id]` | Atendimento em andamento |
| `fila` | Fila de espera |
| `prescricoes` | Prescrições |

### Super Admin (4+ páginas)

| Página | Descrição |
|---|---|
| `super` | Dashboard global |
| `super/admins` | Gestão de administradores |
| `super/clinicas-pendentes` | Aprovação de clínicas |
| `super/smtp` | Configuração SMTP global |
| `(admin)/*` | 13 páginas administrativas |

---

## 10. COMPONENTES — INVENTÁRIO (46 módulos)

| Módulo | Componentes Principais |
|---|---|
| `admin` | Painel administrativo |
| `agenda` | Visualização de agenda |
| `aia` | Triagem IA |
| `animations` | Micro-animações |
| `appointments` | RecurringAppointmentModal, EditSeriesModal |
| `auth` | Login, Signup forms |
| `billing` | Pagamento, assinatura |
| `calendar` | Calendário visual |
| `chat` | Chat interno |
| `checkin` | QR, facial, pre-checkin |
| `dashboard` | AppointmentDetailsDrawer, widgets |
| `doctors` | Perfil médico |
| `documents` | Gestão documental |
| `face-recognition` | Biometria facial (face-api.js) |
| `financial` | Dashboard financeiro |
| `forms` | Formulários reutilizáveis |
| `guards` | `premium-feature-guard.tsx` |
| `import` | Importação CSV |
| `landing` | Landing page pública |
| `layout` | Sidebar, god-mode-shield |
| `legal` | Termos, LGPD |
| `lgpd` | Consentimento LGPD |
| `notifications` | Sistema de notificações |
| `onboarding` | Onboarding wizard |
| `partners` | Portal afiliados |
| `patients` | CRUD pacientes |
| `pep` | Prontuário eletrônico (TipTap) |
| `plans` | Seleção de planos |
| `prontuarios` | Visualização prontuário |
| `public` | Booking page pública |
| `recepcao` / `reception` | Painel de recepção |
| `registration` | Cadastro de clínicas |
| `sidebar` | `visual-lock.tsx` |
| `support` | Suporte |
| `system-master-hub` | Super Admin Hub |
| `tiss` | Guias, batches, XML |
| `totem` | Auto-atendimento |
| `ui` | agenda-view, modals, tabelas |
| `video-call` | Teleconsulta WebRTC |

---

## 11. HOOKS CUSTOMIZADOS

| Hook | Função |
|---|---|
| `use-appointment-actions` | Ações de agendamento (confirmar, cancelar) |
| `use-media-query` | Responsividade |
| `use-notifications` | Sistema de notificações |
| `use-user` | Dados do usuário logado |
| `useClinicTheme` | Tema customizado da clínica |
| `usePublicClinic` | Dados da clínica pública (booking) |

---

## 12. TESTES EXISTENTES

| Arquivo | Cobertura |
|---|---|
| `__tests__/billing.critical.test.ts` | Fluxo de billing |
| `__tests__/plan-guards.test.ts` | Guards de plano |
| `__tests__/cron/` | Cron jobs (reminders, payroll) |
| `__tests__/pep/` | Prontuário eletrônico |
| `__tests__/tiss/` | TISS module |
| `__tests__/api/` | API routes |
| `lib/services/tiss/tiss-parser.test.ts` | Parser TISS XML |

> **⚠️ GAP:** Cobertura de testes é baixa. Módulos críticos como financeiro, agenda e recepção não possuem testes unitários dedicados.

---

## 13. TABELAS DO BANCO (Confirmadas via Supabase)

### Core
- `clinics` — Tenants (plano, status, payment, configs)
- `users` — Profissionais (role, clinic_id)
- `patients` — Pacientes
- `appointments` — Agendamentos
- `recurring_appointment_series` — Séries recorrentes
- `consultations` — Atendimentos/consultas
- `medical_records` — Prontuários

### Financeiro
- `financial_entries` — Lançamentos financeiros
- `financial_categories` — Categorias financeiras
- `doctor_contracts` — Contratos médicos (repasse)
- `payroll_entries` — Folha de pagamento
- `payment_confirmations` — Confirmações de pagamento

### TISS
- `tiss_batches` — Lotes TISS
- `tiss_guides` — Guias TISS
- `tiss_glosas` — Glosas
- `tiss_returns` — Retornos XML

### Convênios
- `health_insurances` — Convênios
- `health_insurance_plans` — Planos de convênio
- `patient_health_insurances` — Vínculo paciente-convênio
- `patient_reimbursement_rules` — Regras de reembolso

### Operacional
- `consulting_rooms` — Salas
- `doctor_schedules` — Horários médicos
- `absence_rules` — Regras de falta
- `notification_queue` — Fila de notificações
- `audit_logs` — Logs de auditoria

### Config
- `clinic_settings` — Configurações da clínica
- `medical_record_templates` — Templates de prontuário
- `session_evolutions` — Evoluções
- `therapeutic_plans` — Planos terapêuticos

---

## 14. INTEGRAÇÕES EXTERNAS

| Integração | Status | Arquivos Chave |
|---|---|---|
| **MercadoPago** | ✅ Ativo | `lib/services/mercadopago.ts`, `api/webhooks/mercadopago`, `api/billing/*` |
| **Banco Inter** | ✅ Ativo | `lib/services/bancointer.ts`, `api/webhooks/bancointer`, `api/auth/pre-register` |
| **WhatsApp Business** | ✅ Ativo | `lib/services/whatsapp-business.ts`, `api/whatsapp` |
| **Supabase** | ✅ Ativo | `lib/supabase/`, Auth + DB + Storage |
| **OpenRouter AI** | ✅ Ativo | `lib/ai/brain-engine.ts`, `lib/aia/triage-service.ts` |
| **OpenAI** | ✅ Ativo | `lib/ai/cid10-suggester.ts` |
| **Upstash Redis** | ✅ Ativo | `lib/cache/redis-client.ts`, `cache-service.ts` |
| **Sentry** | ✅ Ativo | `lib/sentry.ts` |
| **PostHog** | ✅ Ativo | `lib/posthog.ts` |
| **face-api.js** | ✅ Ativo | `components/face-recognition/` |
| **TipTap** | ✅ Ativo | `components/pep/` (Prontuário) |

---

## 15. GAPS E RISCOS IDENTIFICADOS

### 🔴 Críticos

| # | Gap | Impacto | Recomendação |
|---|---|---|---|
| 1 | **TypeScript build errors** (`Property 'id' does not exist on type 'never'`) | Build falha, requer bypass | Regenerar `database.types.ts` via Supabase CLI |
| 2 | **Tabela `payments` vazia** | Relatórios financeiros zerados sem fallback | Já corrigido com fallback para `financial_entries` |
| 3 | **Rotas duplicadas** (financeiro PT/EN) | `/financeiro/dre` + `/financial/dre` coexistem | Consolidar para uma nomenclatura |

### 🟡 Médios

| # | Gap | Impacto | Recomendação |
|---|---|---|---|
| 4 | **Debug routes em produção** | `api/debug-*` acessíveis publicamente | Remover ou proteger |
| 5 | **JWT secret hardcoded como fallback** | Risco de segurança se env não configurada | Forçar env obrigatória |
| 6 | **Cobertura de testes baixa** | Regressões não detectadas | Adicionar testes para módulos críticos |
| 7 | **Arquivos `.disabled`** em services | Email fallback desativado | Verificar se necessário restaurar |

### 🟢 Menores

| # | Gap | Impacto | Recomendação |
|---|---|---|---|
| 8 | **Console.log debug no middleware** | Performance em produção | Remover logs de debug |
| 9 | **`database.types.ts.tmp`** | Arquivo temporário no repo | Limpar |

---

## 16. DEPLOY — FLUXO ATUAL

```bash
# 1. Validar localmente
npm run build    # (com bypass TS se necessário)

# 2. Versionar
git add -A
git commit -m "desc"
git push origin master

# 3. Deploy
vercel --prod
```

**URL Produção:** `https://clinigo.app` / `https://www.clinigo.app`

---

## 17. RESUMO EXECUTIVO DA AUDITORIA

| Métrica | Valor |
|---|---|
| **Rotas API** | ~260 endpoints em 83 módulos |
| **Páginas Dashboard** | 90+ |
| **Componentes** | 46 módulos |
| **Serviços Externos** | 32+ |
| **Cron Jobs** | 9 |
| **Tabelas DB** | 30+ |
| **Variáveis de Ambiente** | 18+ |
| **Testes** | ~7 arquivos (cobertura baixa) |
| **Estado Geral** | ✅ Funcional com ressalvas |

**Confiança na auditoria: 92%** — Limitação: MCP Supabase indisponível durante consulta de tabelas ao vivo; dados de schema baseados em sessão anterior confirmada.

---

*Gerado automaticamente por auditoria técnica — CliniGo v5.0*
\ n -   [ 2 0 2 6 - 0 5 - 0 1 ]   R e c e � � o   - >   A g e n d a   - >   M a n u a l A p p o i n t m e n t M o d a l . t s x   - >   C o r r e � � o   d e   c a c h e   ( q u e r y K e y )   q u e   i m p e d i a   n o v o s   m � d i c o s   d e   a p a r e c e r e m   n o   a g e n d a m e n t o   m a n u a l .  
 \ n -   [ 2 0 2 6 - 0 5 - 0 1 ]   B a c k e n d   - >   l i b / w h a t s a p p / s e r v i c e . t s   - >   C o r r e � � o   d o   e s t a d o   d e   s e s s � o   ' L a z y   R e c o n n e c t i o n '   i n - p r o c e s s   p a r a   n � o   d e s l o g a r   a   U I   v i s u a l m e n t e   d u r a n t e   d e v .   A u m e n t a d o   o   t e m p o   d e   r e c o n n e c t _ t i m e o u t   n o   s e n d W h a t s A p p M e s s a g e   d e   5 s   p a r a   1 0 s   g a r a n t i n d o   q u e   e n v i o s   a s s � n c r o n o s   n � o   f a l h e m .  
 \ n -   [ 2 0 2 6 - 0 5 - 0 1 ]   F r o n t e n d / B a c k e n d   - >   R e s e n d   W h a t s A p p   - >   A d i c i o n a d o   b o t � o   n o   A p p o i n t m e n t D e t a i l s M o d a l   e   r o t a   / a p i / a p p o i n t m e n t s / [ i d ] / r e s e n d   p a r a   r e e n v i o   a v u l s o   d e   n o t i f i c a � � e s   v i a   W h a t s A p p   s e m   p r e c i s a r   r e c r i a r   a g e n d a m e n t o s .  
 
- [2026-05-01] Backend -> WhatsApp -> lib/whatsapp/service.ts -> Adicionado onWhatsApp para formatar/checar nono dígito (BR) e 1.5s delay no envio para evitar Vercel timeout congelado.
- [2026-05-01] Frontend -> Marketing -> app/(marketing)/landing-premium/page.tsx -> Inserção de Cards de Novidades: WhatsApp Integrado e Chat Interno no grid de funcionalidades.
