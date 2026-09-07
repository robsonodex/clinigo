-- Migration: 20260906_biometrics_and_session_status.sql
-- Descrição: 
-- 1. Remove restrição UNIQUE em patient_face_biometrics para permitir múltiplos registros por paciente (criança + responsáveis).
-- 2. Adiciona colunas de identificação da pessoa biométrica (person_type, person_name, notes).
-- 3. Adiciona colunas de status da sessão clínica e assinatura digital na tabela appointments.
-- 4. Adiciona suporte a contestação de inconsistências em professional_financial_documents.
-- 5. Atualiza o nome da conta administradora da Patrícia para 'Patricia Mendes'.

-- 1. Suporte a Múltiplas Biometrias por Paciente
ALTER TABLE patient_face_biometrics DROP CONSTRAINT IF EXISTS patient_face_biometrics_patient_id_key;
ALTER TABLE patient_face_biometrics DROP CONSTRAINT IF EXISTS patient_face_biometrics_patient_id_clinic_id_key;

ALTER TABLE patient_face_biometrics ADD COLUMN IF NOT EXISTS person_type TEXT DEFAULT 'patient';
ALTER TABLE patient_face_biometrics ADD COLUMN IF NOT EXISTS person_name TEXT;
ALTER TABLE patient_face_biometrics ADD COLUMN IF NOT EXISTS notes TEXT;

-- 2. Status da Sessão e Assinatura Digital no Agendamento
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS session_status TEXT;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS session_status_notes TEXT;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS digital_signature_url TEXT;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS digital_signature_hash TEXT;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS digital_signature_at TIMESTAMPTZ;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS digital_signature_by UUID;

-- 3. Contestação de Inconsistências nos Demonstrativos Financeiros
ALTER TABLE professional_financial_documents ADD COLUMN IF NOT EXISTS inconsistency_notes TEXT;
ALTER TABLE professional_financial_documents ADD COLUMN IF NOT EXISTS contested_at TIMESTAMPTZ;

-- 4. Atualização cadastral da Patrícia Mendes (World Sensory)
UPDATE users 
SET full_name = 'Patricia Mendes', updated_at = NOW() 
WHERE id = 'ca412219-5039-4193-8b77-15340f1f677d';
