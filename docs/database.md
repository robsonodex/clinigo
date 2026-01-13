# CliniGo - Schema do Banco de Dados

> **Banco:** PostgreSQL 15+ (Supabase)
> **Última Atualização:** 11/01/2026

---

## 📊 Visão Geral

```
┌──────────────────────────────────────────────────────────────┐
│                        CLINICS                               │
│  (Tenant principal - todas tabelas se relacionam aqui)      │
└──────────────────────────────────────────────────────────────┘
         │
         ├── users (admins, médicos)
         │     └── doctors (perfil do médico)
         │           └── doctor_schedules
         │           └── schedule_exceptions
         │
         ├── patients
         │     └── appointments
         │           └── consultations
         │                 └── prescriptions
         │                 └── medical_records
         │
         ├── financial_entries
         ├── inventory_products
         ├── tiss_guides
         ├── health_insurances
         └── subscriptions (billing)
```

---

## 🗂 Tabelas

### `clinics`
Tabela principal de tenants. Cada clínica é isolada.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID | PK |
| `name` | TEXT | Nome da clínica |
| `slug` | TEXT | URL amigável (único) |
| `cnpj` | TEXT | CNPJ (opcional) |
| `email` | TEXT | E-mail principal |
| `phone` | TEXT | Telefone |
| `address` | JSONB | Endereço completo |
| `plan_type` | ENUM | STARTER, BASIC, PROFESSIONAL, ENTERPRISE, NETWORK |
| `plan_limits` | JSONB | Limites do plano |
| `is_active` | BOOLEAN | Status ativo |
| `approval_status` | TEXT | pending_approval, active, rejected, suspended |
| `responsible_name` | TEXT | Nome do responsável |
| `billing_cycle` | VARCHAR | MONTHLY, ANNUAL |
| `mercadopago_preference_id` | TEXT | ID da preference MP |
| `mercadopago_payment_id` | TEXT | ID do pagamento MP |
| `subscription_starts_at` | TIMESTAMP | Início da assinatura |
| `subscription_ends_at` | TIMESTAMP | Fim da assinatura |
| `paid_amount` | DECIMAL | Valor pago |
| `created_at` | TIMESTAMP | Criado em |
| `updated_at` | TIMESTAMP | Atualizado em |

---

### `users`
Usuários do sistema (admins e médicos).

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID | PK (= auth.users.id) |
| `email` | TEXT | E-mail (único) |
| `full_name` | TEXT | Nome completo |
| `phone` | TEXT | Telefone |
| `role` | ENUM | SUPER_ADMIN, CLINIC_ADMIN, DOCTOR |
| `clinic_id` | UUID | FK → clinics |
| `avatar_url` | TEXT | URL do avatar |
| `is_active` | BOOLEAN | Status |
| `activation_status` | TEXT | pending_activation, active |
| `created_at` | TIMESTAMP | |
| `updated_at` | TIMESTAMP | |

---

### `doctors`
Perfil profissional dos médicos.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID | PK |
| `user_id` | UUID | FK → users |
| `clinic_id` | UUID | FK → clinics |
| `crm` | TEXT | Número do CRM |
| `crm_state` | CHAR(2) | UF do CRM |
| `specialty` | TEXT | Especialidade |
| `consultation_price` | DECIMAL | Valor da consulta |
| `bio` | TEXT | Biografia |
| `is_accepting_appointments` | BOOLEAN | Aceita agendamentos |
| `created_at` | TIMESTAMP | |

---

### `patients`
Pacientes cadastrados por clínica.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID | PK |
| `clinic_id` | UUID | FK → clinics |
| `cpf` | TEXT | CPF (único por clínica) |
| `full_name` | TEXT | Nome completo |
| `email` | TEXT | E-mail |
| `phone` | TEXT | Telefone |
| `date_of_birth` | DATE | Nascimento |
| `gender` | TEXT | Gênero |
| `address` | JSONB | Endereço |
| `password_hash` | TEXT | Senha (bcrypt) |
| `activation_status` | TEXT | pending_activation, active |
| `created_at` | TIMESTAMP | |

---

### `doctor_schedules`
Horários de trabalho dos médicos.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID | PK |
| `doctor_id` | UUID | FK → doctors |
| `clinic_id` | UUID | FK → clinics |
| `day_of_week` | INTEGER | 0 (dom) a 6 (sáb) |
| `start_time` | TIME | Início |
| `end_time` | TIME | Fim |
| `slot_duration_minutes` | INTEGER | Duração do slot |
| `is_active` | BOOLEAN | |

---

### `schedule_exceptions`
Exceções de horário (férias, feriados).

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID | PK |
| `doctor_id` | UUID | FK → doctors |
| `clinic_id` | UUID | FK → clinics |
| `date` | DATE | Data da exceção |
| `is_available` | BOOLEAN | Disponível neste dia |
| `reason` | TEXT | Motivo |

---

### `appointments`
Agendamentos de consultas.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID | PK |
| `clinic_id` | UUID | FK → clinics |
| `doctor_id` | UUID | FK → doctors |
| `patient_id` | UUID | FK → patients |
| `scheduled_at` | TIMESTAMP | Data/hora agendada |
| `duration_minutes` | INTEGER | Duração |
| `status` | ENUM | PENDING_PAYMENT, CONFIRMED, CANCELLED, COMPLETED, NO_SHOW |
| `type` | TEXT | presencial, telemedicina |
| `notes` | TEXT | Observações |
| `created_at` | TIMESTAMP | |
| `cancelled_at` | TIMESTAMP | |
| `cancellation_reason` | TEXT | |

---

### `consultations`
Consultas realizadas (prontuário).

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID | PK |
| `appointment_id` | UUID | FK → appointments |
| `clinic_id` | UUID | FK → clinics |
| `doctor_id` | UUID | FK → doctors |
| `patient_id` | UUID | FK → patients |
| `started_at` | TIMESTAMP | Início |
| `ended_at` | TIMESTAMP | Fim |
| `chief_complaint` | TEXT | Queixa principal |
| `history` | TEXT | História da moléstia |
| `physical_exam` | TEXT | Exame físico |
| `diagnosis` | TEXT | Diagnóstico |
| `treatment_plan` | TEXT | Plano de tratamento |
| `notes` | TEXT | Anotações |
| `ai_analysis` | JSONB | Análise da IA |

---

### `prescriptions`
Prescrições médicas.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID | PK |
| `consultation_id` | UUID | FK → consultations |
| `clinic_id` | UUID | FK → clinics |
| `doctor_id` | UUID | FK → doctors |
| `patient_id` | UUID | FK → patients |
| `medications` | JSONB | Lista de medicamentos |
| `instructions` | TEXT | Instruções gerais |
| `valid_until` | DATE | Validade |
| `created_at` | TIMESTAMP | |

---

### `medical_records`
Prontuários e arquivos.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID | PK |
| `consultation_id` | UUID | FK → consultations |
| `clinic_id` | UUID | FK → clinics |
| `patient_id` | UUID | FK → patients |
| `type` | TEXT | exam, report, image, document |
| `file_url` | TEXT | URL do arquivo |
| `metadata` | JSONB | Metadados |
| `created_at` | TIMESTAMP | |

---

### `financial_entries`
Lançamentos financeiros.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID | PK |
| `clinic_id` | UUID | FK → clinics |
| `appointment_id` | UUID | FK → appointments (opcional) |
| `type` | TEXT | income, expense |
| `category` | TEXT | Categoria |
| `description` | TEXT | Descrição |
| `amount` | DECIMAL | Valor |
| `payment_method` | ENUM | PIX, CREDIT_CARD, DEBIT_CARD, CASH |
| `status` | ENUM | PENDING, PAID, FAILED, REFUNDED |
| `date` | DATE | Data |
| `created_at` | TIMESTAMP | |

---

### `inventory_products`
Produtos em estoque.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID | PK |
| `clinic_id` | UUID | FK → clinics |
| `name` | TEXT | Nome do produto |
| `sku` | TEXT | Código |
| `category` | TEXT | Categoria |
| `quantity` | INTEGER | Quantidade atual |
| `min_quantity` | INTEGER | Estoque mínimo |
| `unit_price` | DECIMAL | Preço unitário |
| `created_at` | TIMESTAMP | |

---

### `health_insurances`
Convênios aceitos.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID | PK |
| `clinic_id` | UUID | FK → clinics |
| `name` | TEXT | Nome do convênio |
| `code` | TEXT | Código ANS |
| `is_active` | BOOLEAN | |
| `created_at` | TIMESTAMP | |

---

### `tiss_guides`
Guias TISS para convênios.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID | PK |
| `clinic_id` | UUID | FK → clinics |
| `patient_id` | UUID | FK → patients |
| `health_insurance_id` | UUID | FK → health_insurances |
| `type` | TEXT | sp_sadt, consulta, internacao |
| `number` | TEXT | Número da guia |
| `status` | TEXT | rascunho, enviada, aprovada, glosada |
| `data` | JSONB | Dados da guia |
| `created_at` | TIMESTAMP | |

---

### `password_reset_tokens`
Tokens de recuperação de senha.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID | PK |
| `user_id` | UUID | FK → users |
| `email` | TEXT | E-mail |
| `token` | TEXT | Token (hash) |
| `expires_at` | TIMESTAMP | Expiração |
| `used_at` | TIMESTAMP | Quando usado |
| `created_at` | TIMESTAMP | |

---

### `activation_tokens`
Tokens de ativação de conta.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID | PK |
| `user_id` | UUID | FK → users (opcional) |
| `clinic_id` | UUID | FK → clinics |
| `email` | TEXT | E-mail |
| `token` | TEXT | Token |
| `type` | TEXT | clinic_activation, doctor_invite, patient_activation |
| `expires_at` | TIMESTAMP | Expiração (7 dias) |
| `used_at` | TIMESTAMP | Quando usado |
| `created_at` | TIMESTAMP | |

---

### `email_logs`
Log de e-mails enviados.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID | PK |
| `clinic_id` | UUID | FK → clinics |
| `user_id` | UUID | FK → users (opcional) |
| `recipient` | TEXT | Destinatário |
| `subject` | TEXT | Assunto |
| `template_used` | TEXT | Template usado |
| `status` | TEXT | sent, failed |
| `sent_at` | TIMESTAMP | |
| `error_message` | TEXT | Erro (se houver) |

---

### `subscriptions`
Assinaturas de clínicas.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID | PK |
| `clinic_id` | UUID | FK → clinics |
| `plan_type` | TEXT | Tipo do plano |
| `billing_cycle` | TEXT | MONTHLY, ANNUAL |
| `status` | TEXT | PENDING, ACTIVE, CANCELLED, EXPIRED |
| `mp_payment_id` | TEXT | ID pagamento MP |
| `mp_payer_id` | TEXT | ID pagador MP |
| `current_period_start` | TIMESTAMP | Início do período |
| `current_period_end` | TIMESTAMP | Fim do período |
| `created_at` | TIMESTAMP | |
| `cancelled_at` | TIMESTAMP | |

---

### `billing_events`
Eventos de cobrança.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID | PK |
| `subscription_id` | UUID | FK → subscriptions |
| `clinic_id` | UUID | FK → clinics |
| `event_type` | TEXT | payment.approved, payment.rejected, etc |
| `mp_payment_id` | TEXT | ID pagamento MP |
| `amount` | DECIMAL | Valor |
| `status` | TEXT | Status |
| `metadata` | JSONB | Dados extras |
| `created_at` | TIMESTAMP | |

---

## 🔒 Row Level Security (RLS)

Todas as tabelas têm RLS habilitado. Políticas principais:

```sql
-- Clínicas só veem seus próprios dados
CREATE POLICY "clinic_isolation" ON patients
  FOR ALL
  USING (clinic_id = auth.jwt() -> 'app_metadata' ->> 'clinic_id');

-- Super Admin vê tudo
CREATE POLICY "super_admin_access" ON clinics
  FOR ALL
  USING (auth.jwt() -> 'app_metadata' ->> 'role' = 'SUPER_ADMIN');
```

---

## 📈 Índices

```sql
-- Performance das consultas mais frequentes
CREATE INDEX idx_appointments_clinic_date ON appointments(clinic_id, scheduled_at);
CREATE INDEX idx_patients_clinic_cpf ON patients(clinic_id, cpf);
CREATE INDEX idx_doctors_clinic ON doctors(clinic_id);
CREATE INDEX idx_consultations_patient ON consultations(patient_id, created_at);
```

---

## 🔧 Migrations Pendentes

Execute no Supabase SQL Editor:

```sql
-- Colunas de billing
ALTER TABLE clinics ADD COLUMN IF NOT EXISTS billing_cycle VARCHAR(20) DEFAULT 'MONTHLY';
ALTER TABLE clinics ADD COLUMN IF NOT EXISTS mercadopago_preference_id TEXT;
ALTER TABLE clinics ADD COLUMN IF NOT EXISTS mercadopago_payment_id TEXT;
ALTER TABLE clinics ADD COLUMN IF NOT EXISTS subscription_starts_at TIMESTAMP;
ALTER TABLE clinics ADD COLUMN IF NOT EXISTS subscription_ends_at TIMESTAMP;
ALTER TABLE clinics ADD COLUMN IF NOT EXISTS paid_amount DECIMAL(10,2);

-- Tabelas de auth tokens (se não existirem)
-- Ver: migration-auth-tokens.sql
```
