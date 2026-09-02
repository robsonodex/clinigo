-- ==============================================================================
-- Migration: Check-in do Profissional como Evento-Gatilho Central (Prioridade 1)
-- Trilha de Auditoria, Dupla Comprovação TISS e Snapshot de Repasse Financeiro
-- ==============================================================================

-- 1. Colunas de Check-in do Profissional, Comprovação e Repasse
ALTER TABLE appointments 
  ADD COLUMN IF NOT EXISTS doctor_checked_in_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS doctor_checked_in_by UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS doctor_checkin_method TEXT DEFAULT 'APP',
  ADD COLUMN IF NOT EXISTS verification_level TEXT DEFAULT 'UNVERIFIED',
  ADD COLUMN IF NOT EXISTS repasse_amount NUMERIC(10,2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS repasse_rate_applied NUMERIC(5,2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS repasse_contract_id UUID REFERENCES doctor_contracts(id),
  ADD COLUMN IF NOT EXISTS in_consultation_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS no_show_alert_sent_at TIMESTAMPTZ;

-- 2. Backfill seguro: preenche verification_level para registros anteriores
UPDATE appointments
SET 
  verification_level = CASE 
    WHEN doctor_checked_in_at IS NOT NULL AND checked_in_at IS NOT NULL THEN 'DOUBLE_VERIFIED'
    WHEN doctor_checked_in_at IS NOT NULL THEN 'DOCTOR_ONLY'
    WHEN checked_in_at IS NOT NULL THEN 'FACIAL_ONLY'
    ELSE 'UNVERIFIED'
  END
WHERE verification_level IS NULL OR verification_level = 'UNVERIFIED';

-- 3. Índices de alta performance para agenda, faturamento TISS e auditoria
CREATE INDEX IF NOT EXISTS idx_appointments_doctor_checkin 
  ON appointments(doctor_id, appointment_date, doctor_checked_in_at);

CREATE INDEX IF NOT EXISTS idx_appointments_verification_level 
  ON appointments(clinic_id, verification_level);

CREATE INDEX IF NOT EXISTS idx_appointments_doctor_date_status
  ON appointments(clinic_id, appointment_date, status);

COMMENT ON COLUMN appointments.doctor_checked_in_at IS 'Horário exato do check-in do profissional na sala de atendimento';
COMMENT ON COLUMN appointments.verification_level IS 'Nível de comprovação: UNVERIFIED, FACIAL_ONLY, DOCTOR_ONLY, DOUBLE_VERIFIED (Recepção + Sala)';
COMMENT ON COLUMN appointments.repasse_amount IS 'Valor líquido de repasse calculado no momento do check-in (snapshot imutável)';
