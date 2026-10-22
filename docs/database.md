# CliniGo - Schema do Banco de Dados Oficial (PostgreSQL 15+ / Supabase)

> **Ambiente Oficial:** PostgreSQL 15+ sob Supabase com Row Level Security (RLS)  
> **Isolamento de Dados:** Multi-tenant estrito por chave `clinic_id` em 100% das tabelas operacionais  
> **Integridade Contábil e Comercial:** Valores monetários armazenados em centavos inteiros (`INTEGER`) ou `NUMERIC(12,2)`  
> **Padrão de Qualidade:** Corporativo Médico Internacional (Zero Emojis, Sigilo LGPD)

---

## 1. Tipos e Enums Nativos

```sql
-- Papéis de Usuários no Sistema
CREATE TYPE public.user_role AS ENUM (
    'SUPER_ADMIN',
    'CLINIC_ADMIN',
    'FINANCIAL',
    'DOCTOR',
    'RECEPTIONIST',
    'NURSE',
    'PATIENT',
    'READONLY'
);

-- Status de Agendamentos Clínicos
CREATE TYPE public.appointment_status AS ENUM (
    'SCHEDULED',
    'CONFIRMED',
    'CHECKED_IN',
    'IN_SERVICE',
    'COMPLETED',
    'CANCELLED',
    'NO_SHOW'
);

-- Planos Comerciais da Plataforma
CREATE TYPE public.plan_type AS ENUM (
    'STARTER',
    'BASIC',
    'PROFESSIONAL',
    'ENTERPRISE',
    'NETWORK'
);

-- Status de Guias TISS
CREATE TYPE public.tiss_guide_status AS ENUM (
    'DRAFT',
    'VALIDATED',
    'BATCHED',
    'SUBMITTED',
    'PROCESSED',
    'PAID',
    'GLOSADA',
    'CANCELLED'
);
```

---

## 2. Mapa Estrutural do Modelo de Dados

```
┌────────────────────────────────────────────────────────────────────────┐
│                               CLINICS                                  │
│  (Tenant central de isolamento multi-empresa com planos e licenciamento) │
└────────────────────────────────────────────────────────────────────────┘
         │
         ├── users (credenciais de acesso, perfil RBAC, isolamento)
         │     ├── doctors (dados profissionais, CRM, especialidade, repasse)
         │     │     ├── schedules (grade de atendimento e slots)
         │     │     ├── doctor_contracts (percentuais e regras de repasse)
         │     │     └── doctor_patient_rates (valores específicos por paciente)
         │     │
         │     └── seat_billing_events (eventos probatórios imutáveis de licenças)
         │
         ├── patients (cadastro de beneficiários e prontuários)
         │     ├── patient_documents (laudos e exames com ponte Cloudflare R2)
         │     ├── patient_face_biometrics (embeddings faciais criptografados)
         │     ├── patient_intake_links (admissão digital online)
         │     └── appointments (consultas presenciais e teleconsultas)
         │           ├── consultations (atendimentos médicos estruturados)
         │           ├── session_evolutions (evoluções terapêuticas e ICP-Brasil)
         │           └── prescriptions (prescrições digitais)
         │
         ├── task_projects & clinic_tasks (projetos, tarefas da equipe, SLA e checklists)
         │
         ├── financial_entries (livro caixa, DRE, conciliação e repasse)
         │
         ├── Faturamento TISS & Convênios:
         │     ├── health_insurances (operadoras de saúde conveniadas)
         │     ├── health_insurance_price_tables (tabela de procedimentos TUSS e valores)
         │     ├── tiss_guides (guias SP/SADT e consultas com numeração atômica)
         │     ├── tiss_guide_counters (contadores anti-colisão sob lock transacional)
         │     ├── tiss_batches (lotes de faturamento com hash e versões de XML)
         │     ├── tiss_batch_xml_versions (histórico auditável de arquivos gerados)
         │     ├── tiss_glosas & tiss_appeals (gestão de glosas e recursos)
         │     └── tiss_return_imports (retornos processados com estorno atômico)
         │
         ├── scheduled_whatsapp_messages (mensageria com índice parcial e gate condicional)
         │
         └── platform_settings (tabela global de manutenção e feature flags)
```

---

## 3. Tabelas Principais de Negócio

### `clinics`
Tabela mestre de tenants (clínicas).
- `id` (UUID, PK): Identificador universal do tenant.
- `name` (TEXT): Razão social ou nome fantasia da clínica.
- `slug` (TEXT, UNIQUE): Identificador amigável de rota pública.
- `cnpj` (TEXT): Cadastro Nacional da Pessoa Jurídica.
- `plan_type` (public.plan_type): Plano comercial contratado.
- `seat_price_override_cents` (INTEGER): Preço negociado por assento extra em centavos (padrão 4990 = R$ 49,90).
- `seat_overage_waived` (BOOLEAN): Cortesia comercial que permite expansão sem cobrança, mantendo prova probatória.
- `addons` (JSONB): Módulos complementares (ex: `{"faturamento_premium": true}`).
- `repasse_regime` (VARCHAR): Regime de apuração médica (`PRODUCAO` ou `RECEBIMENTO`).
- `glosa_policy` (VARCHAR): Política de glosas (`CLINICA_ABSORVE`, `DESCONTA_PROFISSIONAL`, `DESCONTA_SE_MANTIDA`).
- `is_active` (BOOLEAN): Status operacional da clínica.

### `seat_billing_events`
Tabela probatória imutável de licenciamento por assento corporativo.
- `id` (UUID, PK): Identificador único do evento.
- `clinic_id` (UUID, FK -> clinics): Tenant responsável.
- `actor_user_id` (UUID, FK -> users): Administrador que autorizou o aceite.
- `target_user_id` (UUID, FK -> users): Usuário cujo cadastro ultrapassou o limite.
- `plan` (VARCHAR): Nome do plano vigente no momento do aceite.
- `included_seats` (INTEGER): Limite contratual incluído.
- `seats_before`, `seats_after` (INTEGER): Quantidade de assentos antes e depois da expansão.
- `unit_price_cents` (INTEGER): Valor unitário contratado em centavos.
- `monthly_before_cents`, `monthly_after_cents` (INTEGER): Recorrência mensal calculada.
- `quote_id` (VARCHAR): Identificador da cotação assinado criptograficamente com HMAC-SHA256.
- `idempotency_key` (VARCHAR, UNIQUE): Chave de idempotência anti-duplicação.
- `status` (VARCHAR): `COMMITTED` ou `VOIDED` (com compensação de cancelamento).
- `created_at` (TIMESTAMPTZ): Data e hora oficial UTC do aceite.

### `task_projects` e `clinic_tasks`
Módulo corporativo de gestão de projetos e tarefas da equipe clínica.
- `task_projects`:
  - `id` (UUID, PK), `clinic_id` (UUID, FK), `name` (TEXT), `color` (TEXT), `is_archived` (BOOLEAN).
- `clinic_tasks`:
  - `id` (UUID, PK), `clinic_id` (UUID, FK), `project_id` (UUID, FK), `title` (TEXT), `description` (TEXT).
  - `status` (TEXT): `TODO`, `IN_PROGRESS`, `DONE`, `CANCELLED`.
  - `priority` (TEXT): `LOW`, `MEDIUM`, `HIGH`, `URGENT`.
  - `due_date` (DATE), `due_time` (TIME): Prazos para farol de SLA temporal.
  - `assigned_to` (UUID, FK -> users): Colaborador responsável.
  - `created_by` (UUID, FK -> users): Criador da pendência.
  - `patient_id` (UUID, FK -> patients): Associação clínica opcional.

### `tiss_guides` e `tiss_guide_counters`
Estrutura industrial de faturamento e geração atômica de guias TISS.
- `tiss_guides`:
  - `id` (UUID, PK), `clinic_id` (UUID, FK), `guide_number` (VARCHAR, NOT NULL).
  - `status` (public.tiss_guide_status): Status operacional da guia.
  - `patient_id` (UUID, FK), `health_insurance_id` (UUID, FK), `doctor_id` (UUID, FK).
  - `total_amount` (NUMERIC(12,2)): Valor total dos procedimentos.
  - `cancellation_reason` (TEXT): Justificativa formal de cancelamento.
  - `version` (INTEGER): Contador para controle de concorrência otimista (OCC).
  - `deleted_at`, `deleted_by`: Suporte a soft-delete em rascunhos.
- `tiss_guide_counters`:
  - `clinic_id` (UUID), `year` (INTEGER), `current_value` (INTEGER), `updated_at` (TIMESTAMPTZ).
  - PK composta: `(clinic_id, year)`.

### `scheduled_whatsapp_messages`
Fila operacional de notificações e lembretes via WhatsApp.
- `id` (UUID, PK), `clinic_id` (UUID, FK), `recipient_phone` (VARCHAR), `message_body` (TEXT).
- `scheduled_for` (TIMESTAMPTZ): Horário planejado para disparo.
- `status` (VARCHAR): `pending`, `sent`, `failed`, `cancelled`.
- `idx_scheduled_whatsapp_pending`: Índice parcial sob `(scheduled_for) WHERE status = 'pending'`.

### `platform_settings`
Tabela global de configurações dinâmicas da plataforma CliniGo.
- `id` (UUID, PK), `key` (TEXT, UNIQUE), `value` (JSONB), `description` (TEXT), `updated_by` (UUID, FK).
- Contém a chave padrão `maintenance_mode` (`false`/`true`).

---

## 4. Procedimentos Armazenados e Funções (RPCs) Críticas

### `generate_tiss_guide_number(p_clinic_id UUID, p_year INT)`
Gera numeração atômica sequencial por clínica e ano, eliminando colisões:
- Opera como `SECURITY DEFINER` com `SET search_path = public, pg_temp`.
- Valida o isolamento da clínica contra a sessão do usuário autenticado (`auth.uid() = user.clinic_id`).
- Bloqueia a linha da tabela `tiss_guide_counters` sob `SELECT ... FOR UPDATE`.
- Calcula o próximo sequencial como `GREATEST(contador, max_existente) + 1` com laço de garantia anti-colisão em `tiss_guides`.

### `tiss_undo_return_import(p_return_or_batch_id UUID, p_clinic_id UUID, p_user_id UUID, p_user_name TEXT)`
Estorno atômico e transacional de processamento de retorno de convênio:
- Validação impeditiva caso existam recursos de glosa ativos (`IN_APPEAL` ou `ACCEPTED`).
- Validação impeditiva se a competência contábil já foi formalmente fechada ou liquidada.
- Reversão de lançamentos financeiros e estorno de repasse médico associado.
- Atualização do status do retorno para `CANCELLED`, viabilizando a reimportação do arquivo.

### `trigger_scheduled_whatsapp_worker()`
Função gate de alta performance para economia de consumo de borda e logs:
- Configurada como `SECURITY DEFINER` concedida exclusivamente ao usuário `postgres`.
- Executa checagem ultra-rápida via índice parcial:
  ```sql
  IF EXISTS (
      SELECT 1 FROM public.scheduled_whatsapp_messages 
      WHERE status = 'pending' AND scheduled_for <= now()
  ) THEN
      PERFORM net.http_get(url := 'https://clinigo.app/api/cron/send-scheduled-whatsapp');
  END IF;
  ```
- Impede invocações HTTP inúteis a cada 1 minuto quando a fila de mensagens está vazia.

---

## 5. Arquitetura de Armazenamento de Arquivos (Storage)

### Migração de Prontuários para Cloudflare R2
- **Protocolo:** URLs canônicas persistidas no banco com prefixo `r2://`.
- **Benefício:** Eliminação do limite de armazenamento do Supabase Storage e garantia de zero custo de egress na leitura de exames, laudos e fotos de pacientes.
- **Acesso Seguro:** Geração de Presigned URLs pelo backend com expiração estrita de 600 segundos (10 minutos), protegendo o sigilo médico de acordo com as normas da LGPD e CFM.
- **Bucket Público:** `clinic-assets` mantido no Supabase Storage exclusivamente para logotipos e ícones institucionais das clínicas.
