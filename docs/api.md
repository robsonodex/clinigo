# CliniGo - Documentação de Rotas da API

> **Total de Rotas:** 108 endpoints
> **Base URL:** `https://clinigo.app/api`

---

## 🔐 Autenticação (`/api/auth`)

| Método | Rota | Body | Resposta | Status |
|--------|------|------|----------|--------|
| POST | `/auth/register` | `{email, password, full_name, clinic_name, cnpj, phone, plan_type}` | `{success, clinic_id}` | ✅ |
| POST | `/auth/login` | `{email, password}` | `{user, session}` | ✅ |
| POST | `/auth/logout` | - | `{success}` | ✅ |
| POST | `/auth/forgot-password` | `{email}` | `{success, message}` | ✅ |
| POST | `/auth/reset-password` | `{token, password}` | `{success}` | ✅ |
| GET | `/auth/reset-password?token=xxx` | - | `{valid, email}` | ✅ |
| POST | `/auth/activate-account` | `{token, password}` | `{success}` | ✅ |
| GET | `/auth/activate-account?token=xxx` | - | `{valid, type}` | ✅ |
| POST | `/auth/signup` | (alias de register) | - | ✅ |
| POST | `/auth/mfa` | `{enable}` | `{qr_code}` | ⚠️ |
| POST | `/auth/mfa/verify` | `{code}` | `{success}` | ⚠️ |
| GET | `/auth/sessions` | - | `{sessions: []}` | ✅ |
| DELETE | `/auth/sessions/[id]` | - | `{success}` | ✅ |

---

## 💳 Billing (`/api/billing`)

| Método | Rota | Body | Resposta | Status |
|--------|------|------|----------|--------|
| POST | `/billing/create-preference` | `{clinic_id, plan_type, billing_cycle}` | `{init_point, preference_id}` | ✅ |
| POST | `/billing/create-subscription` | `{clinic_id, plan_type}` | `{subscription_id}` | ✅ |

---

## 🏥 Clínicas (`/api/clinics`)

| Método | Rota | Descrição | Status |
|--------|------|-----------|--------|
| GET | `/clinics` | Listar clínicas (Super Admin) | ✅ |
| POST | `/clinics` | Criar clínica | ✅ |
| GET | `/clinics/[clinicId]` | Detalhes da clínica | ✅ |
| PUT | `/clinics/[clinicId]` | Atualizar clínica | ✅ |
| DELETE | `/clinics/[clinicId]` | Deletar clínica | ✅ |
| GET | `/clinics/by-slug/[slug]` | Buscar por slug | ✅ |
| GET | `/clinics/api-keys` | Listar API keys | ✅ |
| POST | `/clinics/api-keys` | Criar API key | ✅ |
| POST | `/clinics/[clinicId]/import` | Importar dados | ✅ |
| POST | `/clinics/[clinicId]/doctors/bulk` | Importar médicos | ✅ |
| POST | `/clinics/smtp` | Configurar SMTP | ❌ (obsoleto) |

---

## 👨‍⚕️ Médicos (`/api/doctors`)

| Método | Rota | Descrição | Status |
|--------|------|-----------|--------|
| GET | `/doctors` | Listar médicos da clínica | ✅ |
| POST | `/doctors` | Criar médico | ✅ |
| GET | `/doctors/[doctorId]` | Detalhes do médico | ✅ |
| PUT | `/doctors/[doctorId]` | Atualizar médico | ✅ |
| DELETE | `/doctors/[doctorId]` | Deletar médico | ✅ |
| POST | `/doctors/invite` | Convidar médico por e-mail | ✅ |
| GET | `/doctors/schedules` | Horários dos médicos | ✅ |
| POST | `/doctors/schedules` | Definir horários | ✅ |
| GET | `/doctors/[id]/health-insurances` | Convênios do médico | ✅ |
| POST | `/doctors/[id]/health-insurances` | Adicionar convênio | ✅ |
| DELETE | `/doctors/[id]/health-insurances/[id]` | Remover convênio | ✅ |

---

## 🧑‍🤝‍🧑 Pacientes (`/api/patients`)

| Método | Rota | Descrição | Status |
|--------|------|-----------|--------|
| GET | `/patients` | Listar pacientes | ✅ |
| POST | `/patients` | Criar paciente | ✅ |
| GET | `/patients/[id]` | Detalhes do paciente | ✅ |
| PUT | `/patients/[id]` | Atualizar paciente | ✅ |
| DELETE | `/patients/[id]` | Deletar paciente | ✅ |
| POST | `/patients/register` | Auto-cadastro paciente | ✅ |
| POST | `/patient/auth/login` | Login paciente (CPF) | ✅ |
| GET | `/patient/appointments` | Agendamentos do paciente | ✅ |
| GET | `/patient/medical-records` | Prontuário do paciente | ✅ |
| POST | `/patient/request-appointment` | Solicitar agendamento | ✅ |

---

## 📅 Agendamentos (`/api/appointments`)

| Método | Rota | Descrição | Status |
|--------|------|-----------|--------|
| GET | `/appointments` | Listar agendamentos | ✅ |
| POST | `/appointments` | Criar agendamento | ✅ |
| GET | `/appointments/[id]` | Detalhes | ✅ |
| PUT | `/appointments/[id]` | Atualizar | ✅ |
| DELETE | `/appointments/[id]` | Deletar | ✅ |
| POST | `/appointments/[id]/cancel` | Cancelar | ✅ |
| POST | `/appointments/[id]/confirm-payment` | Confirmar pagamento | ✅ |
| GET | `/appointments/available-slots` | Horários disponíveis | ✅ |
| POST | `/appointments/walk-in` | Encaixe | ✅ |

**Parâmetros de query:**
- `doctor_id` - Filtrar por médico
- `date` - Filtrar por data
- `status` - Filtrar por status

---

## 📋 Consultas (`/api/consultations`)

| Método | Rota | Descrição | Status |
|--------|------|-----------|--------|
| GET | `/consultations` | Listar consultas | ✅ |
| POST | `/consultations` | Iniciar consulta | ✅ |
| GET | `/consultations/[id]` | Detalhes | ✅ |
| PUT | `/consultations/[id]` | Atualizar (prontuário) | ✅ |


---

## 💰 Financeiro (`/api/financial`)

| Método | Rota | Descrição | Status |
|--------|------|-----------|--------|
| GET | `/financial/summary` | Resumo financeiro | ✅ |
| GET | `/financial/entries` | Lançamentos | ✅ |
| POST | `/financial/entries` | Criar lançamento | ✅ |
| GET | `/financial/payment-methods` | Métodos de pagamento | ✅ |

---

## 📦 Estoque (`/api/inventory`)

| Método | Rota | Descrição | Status |
|--------|------|-----------|--------|
| GET | `/inventory/products` | Listar produtos | ✅ |
| POST | `/inventory/products` | Criar produto | ✅ |
| PUT | `/inventory/products/[id]` | Atualizar | ✅ |
| DELETE | `/inventory/products/[id]` | Deletar | ✅ |
| POST | `/inventory/stock` | Movimentar estoque | ✅ |

---

## 🏦 TISS (`/api/tiss`)

| Método | Rota | Descrição | Status |
|--------|------|-----------|--------|
| GET | `/tiss/guias` | Listar guias | ✅ |
| POST | `/tiss/guias` | Criar guia | ✅ |
| GET | `/tiss/convenios` | Listar convênios | ✅ |
| POST | `/tiss/enviar` | Enviar para convênio | ⚠️ |
| GET | `/tiss/relatorios` | Relatórios | ✅ |

---



## 📱 WhatsApp (`/api/whatsapp`)

| Método | Rota | Descrição | Status |
|--------|------|-----------|--------|
| POST | `/whatsapp/send` | Enviar mensagem | ⚠️ Requer config |

> ⚠️ Requer configuração de conta WhatsApp Business API

---

## 🎥 Vídeo/Telemedicina (`/api/video`)

| Método | Rota | Descrição | Status |
|--------|------|-----------|--------|
| POST | `/video/create-room` | Criar sala | ✅ |
| GET | `/video/token` | Token de acesso | ✅ |
| POST | `/video/end-call` | Encerrar chamada | ✅ |

---

## 📊 CRM (`/api/crm`)

| Método | Rota | Descrição | Status |
|--------|------|-----------|--------|
| GET | `/crm/automations` | Listar automações | ✅ |
| POST | `/crm/automations` | Criar automação | ✅ |
| GET | `/crm/campaigns` | Campanhas | ✅ |
| POST | `/crm/campaigns` | Criar campanha | ✅ |
| GET | `/crm/notes` | Anotações | ✅ |
| POST | `/crm/notes` | Criar anotação | ✅ |

---

## 👑 Super Admin (`/api/super-admin`)

| Método | Rota | Descrição | Status |
|--------|------|-----------|--------|
| GET | `/super-admin/pending-clinics` | Clínicas pendentes | ✅ |
| POST | `/super-admin/approve-clinic` | Aprovar clínica | ✅ |
| POST | `/super-admin/reject-clinic` | Rejeitar clínica | ✅ |
| GET | `/super-admin/clinics` | Todas as clínicas | ✅ |
| GET | `/super-admin/stats` | Estatísticas | ✅ |
| GET | `/super-admin/revenue` | Receita | ✅ |
| GET | `/super-admin/users` | Usuários | ✅ |
| POST | `/super-admin/impersonate` | Acessar como clínica | ✅ |

---

## 🔔 Webhooks (`/api/webhooks`)

| Método | Rota | Descrição | Status |
|--------|------|-----------|--------|
| POST | `/webhooks/mercadopago` | Webhook Mercado Pago | ✅ |
| GET | `/webhooks/mercadopago` | Validação do webhook | ✅ |

**Headers esperados:**
- `x-signature` - Assinatura do MP
- `x-request-id` - ID da requisição

**Body:**
```json
{
  "type": "payment",
  "data": {
    "id": "payment_id"
  }
}
```

---

## ⏰ Cron Jobs (`/api/cron`)

| Método | Rota | Descrição | Status |
|--------|------|-----------|--------|
| POST | `/cron/send-reminders` | Lembretes 24h | ✅ |
| POST | `/cron/send-notifications` | Notificações | ✅ |
| POST | `/cron/cancel-unpaid` | Cancelar não pagos | ✅ |

---

## 🔧 Outros

| Método | Rota | Descrição | Status |
|--------|------|-----------|--------|
| GET | `/health` | Health check | ✅ |
| POST | `/checkin/verify` | Check-in QR | ✅ |
| GET | `/checkin/queue` | Fila de espera | ✅ |
| POST | `/checkin/pre-checkin` | Pré check-in | ✅ |
| GET | `/reports` | Relatórios gerais | ✅ |
| GET | `/audit-logs` | Logs de auditoria | ✅ |
| GET | `/validate/cnpj` | Validar CNPJ | ✅ |
| GET | `/validate/cpf` | Validar CPF | ✅ |

---

## Legenda de Status

| Símbolo | Significado |
|---------|-------------|
| ✅ | Funcionando corretamente |
| ⚠️ | Requer configuração externa |
| ❌ | Obsoleto ou não funcional |
