-- =====================================================
-- MIGRAÇÃO: Item 3 (Assinatura) + Item 4 (CRM Stages) + Item 6 (Satisfaction Surveys)
-- Data: 2026-05-17
-- EXECUTAR NO SUPABASE DASHBOARD → SQL EDITOR
-- =====================================================

-- =====================================================
-- ITEM 3: Colunas de assinatura digital em medical_records
-- =====================================================
ALTER TABLE medical_records 
    ADD COLUMN IF NOT EXISTS signed_at timestamptz,
    ADD COLUMN IF NOT EXISTS signed_by_patient boolean DEFAULT false,
    ADD COLUMN IF NOT EXISTS signature_url text,
    ADD COLUMN IF NOT EXISTS signature_token text,
    ADD COLUMN IF NOT EXISTS signature_token_expires_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_medical_records_signature_token 
    ON medical_records(signature_token) WHERE signature_token IS NOT NULL;


-- =====================================================
-- ITEM 4: Tabela crm_stages (pipeline/funil)
-- =====================================================
CREATE TABLE IF NOT EXISTS crm_stages (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id uuid NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    patient_id uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    stage varchar(30) NOT NULL CHECK (stage IN ('lead', 'agendou', 'compareceu', 'retornou', 'recorrente')),
    updated_at timestamptz DEFAULT now(),
    UNIQUE(clinic_id, patient_id)
);

ALTER TABLE crm_stages ENABLE ROW LEVEL SECURITY;

CREATE POLICY crm_stages_clinic_isolation ON crm_stages
    FOR ALL USING (
        clinic_id IN (SELECT clinic_id FROM users WHERE id = auth.uid())
    );

CREATE INDEX IF NOT EXISTS idx_crm_stages_clinic ON crm_stages(clinic_id);
CREATE INDEX IF NOT EXISTS idx_crm_stages_patient ON crm_stages(patient_id);
CREATE INDEX IF NOT EXISTS idx_crm_stages_stage ON crm_stages(clinic_id, stage);


-- =====================================================
-- ITEM 6: Tabela satisfaction_surveys (NPS público)
-- =====================================================
CREATE TABLE IF NOT EXISTS satisfaction_surveys (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id uuid NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    appointment_id uuid REFERENCES appointments(id) ON DELETE SET NULL,
    patient_id uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    doctor_id uuid REFERENCES doctors(id) ON DELETE SET NULL,
    nps_score int CHECK (nps_score >= 0 AND nps_score <= 10),
    professional_rating int CHECK (professional_rating >= 1 AND professional_rating <= 5),
    comment text,
    survey_token text,
    survey_token_expires_at timestamptz,
    completed_at timestamptz,
    sent_via varchar(20) DEFAULT 'manual',
    created_at timestamptz DEFAULT now()
);

ALTER TABLE satisfaction_surveys ENABLE ROW LEVEL SECURITY;

CREATE POLICY satisfaction_surveys_clinic_isolation ON satisfaction_surveys
    FOR ALL USING (
        clinic_id IN (SELECT clinic_id FROM users WHERE id = auth.uid())
    );

CREATE INDEX IF NOT EXISTS idx_satisfaction_surveys_clinic ON satisfaction_surveys(clinic_id);
CREATE INDEX IF NOT EXISTS idx_satisfaction_surveys_token ON satisfaction_surveys(survey_token) WHERE survey_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_satisfaction_surveys_appointment ON satisfaction_surveys(appointment_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_satisfaction_surveys_unique_appointment 
    ON satisfaction_surveys(appointment_id) WHERE appointment_id IS NOT NULL;


-- =====================================================
-- ITEM 4 addon: lead_source em patients (se não existir)
-- =====================================================
ALTER TABLE patients ADD COLUMN IF NOT EXISTS lead_source varchar(50);

-- =====================================================
-- Verificação final
-- =====================================================
SELECT 'Migration complete' AS status;
