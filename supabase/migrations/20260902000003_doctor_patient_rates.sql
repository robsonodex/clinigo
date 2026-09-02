-- ==============================================================================
-- Migration: Valores por Paciente (Doctor-Patient Rates Override)
-- Permite que o ADMIN defina valores individuais de repasse por par (médico, paciente)
-- Trilha de Auditoria, Histórico de Alterações e Suporte a Rate Source no Check-in
-- ==============================================================================

-- 1. doctor_patient_rates: override de repasse por par (profissional, paciente)
CREATE TABLE IF NOT EXISTS doctor_patient_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  rate_type TEXT NOT NULL CHECK (rate_type IN ('FIXED', 'PERCENTAGE')),
  fixed_value NUMERIC(10,2),
  percentage NUMERIC(5,2),
  active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT value_matches_type CHECK (
    (rate_type = 'FIXED' AND fixed_value IS NOT NULL AND percentage IS NULL) OR
    (rate_type = 'PERCENTAGE' AND percentage IS NOT NULL AND fixed_value IS NULL)
  )
);

-- Só um override ativo por par profissional+paciente
CREATE UNIQUE INDEX IF NOT EXISTS uniq_active_doctor_patient_rate
  ON doctor_patient_rates (doctor_id, patient_id)
  WHERE active = true;

CREATE INDEX IF NOT EXISTS idx_doctor_patient_rates_clinic ON doctor_patient_rates(clinic_id);
CREATE INDEX IF NOT EXISTS idx_doctor_patient_rates_doctor ON doctor_patient_rates(doctor_id);
CREATE INDEX IF NOT EXISTS idx_doctor_patient_rates_patient ON doctor_patient_rates(patient_id);

-- 2. Histórico de alterações (auditoria)
CREATE TABLE IF NOT EXISTS doctor_patient_rate_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rate_id UUID REFERENCES doctor_patient_rates(id) ON DELETE SET NULL,
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  doctor_id UUID NOT NULL,
  patient_id UUID NOT NULL,
  previous_rate_type TEXT,
  previous_value NUMERIC(10,2),
  new_rate_type TEXT NOT NULL,
  new_value NUMERIC(10,2) NOT NULL,
  changed_by UUID REFERENCES users(id),
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_doctor_patient_rate_history_clinic ON doctor_patient_rate_history(clinic_id);
CREATE INDEX IF NOT EXISTS idx_doctor_patient_rate_history_rate ON doctor_patient_rate_history(rate_id);
CREATE INDEX IF NOT EXISTS idx_doctor_patient_rate_history_doc_pat ON doctor_patient_rate_history(doctor_id, patient_id);

-- 3. Campo rate_source no agendamento para rastreabilidade do repasse
ALTER TABLE appointments 
  ADD COLUMN IF NOT EXISTS rate_source TEXT CHECK (rate_source IN ('PATIENT_OVERRIDE', 'CONTRACT_DEFAULT')),
  ADD COLUMN IF NOT EXISTS repasse_rate_id UUID REFERENCES doctor_patient_rates(id) ON DELETE SET NULL;

COMMENT ON COLUMN appointments.rate_source IS 'Origem da regra de repasse aplicada: PATIENT_OVERRIDE (customizado) ou CONTRACT_DEFAULT (contrato padrão)';
COMMENT ON COLUMN appointments.repasse_rate_id IS 'ID do registro doctor_patient_rates caso tenha sido aplicado override por paciente';

-- 4. RLS - Row Level Security
ALTER TABLE doctor_patient_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctor_patient_rate_history ENABLE ROW LEVEL SECURITY;

-- Policies para doctor_patient_rates
DROP POLICY IF EXISTS "doctor_patient_rates_select_policy" ON doctor_patient_rates;
CREATE POLICY "doctor_patient_rates_select_policy" ON doctor_patient_rates
  FOR SELECT
  USING (
    clinic_id IN (
      SELECT clinic_id FROM users WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "doctor_patient_rates_insert_policy" ON doctor_patient_rates;
CREATE POLICY "doctor_patient_rates_insert_policy" ON doctor_patient_rates
  FOR INSERT
  WITH CHECK (
    clinic_id IN (
      SELECT clinic_id FROM users WHERE id = auth.uid() AND role IN ('CLINIC_ADMIN', 'SUPER_ADMIN', 'COORDINATOR')
    )
  );

DROP POLICY IF EXISTS "doctor_patient_rates_update_policy" ON doctor_patient_rates;
CREATE POLICY "doctor_patient_rates_update_policy" ON doctor_patient_rates
  FOR UPDATE
  USING (
    clinic_id IN (
      SELECT clinic_id FROM users WHERE id = auth.uid() AND role IN ('CLINIC_ADMIN', 'SUPER_ADMIN', 'COORDINATOR')
    )
  );

DROP POLICY IF EXISTS "doctor_patient_rates_delete_policy" ON doctor_patient_rates;
CREATE POLICY "doctor_patient_rates_delete_policy" ON doctor_patient_rates
  FOR DELETE
  USING (
    clinic_id IN (
      SELECT clinic_id FROM users WHERE id = auth.uid() AND role IN ('CLINIC_ADMIN', 'SUPER_ADMIN', 'COORDINATOR')
    )
  );

-- Policies para doctor_patient_rate_history
DROP POLICY IF EXISTS "doctor_patient_rate_history_select_policy" ON doctor_patient_rate_history;
CREATE POLICY "doctor_patient_rate_history_select_policy" ON doctor_patient_rate_history
  FOR SELECT
  USING (
    clinic_id IN (
      SELECT clinic_id FROM users WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "doctor_patient_rate_history_insert_policy" ON doctor_patient_rate_history;
CREATE POLICY "doctor_patient_rate_history_insert_policy" ON doctor_patient_rate_history
  FOR INSERT
  WITH CHECK (
    clinic_id IN (
      SELECT clinic_id FROM users WHERE id = auth.uid() AND role IN ('CLINIC_ADMIN', 'SUPER_ADMIN', 'COORDINATOR')
    )
  );
