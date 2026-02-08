-- CliniGo - Tabela para armazenar biometria facial de pacientes
-- Esta tabela armazena os descriptores faciais criptografados para check-in biométrico

CREATE TABLE IF NOT EXISTS patient_face_biometrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL,
    clinic_id UUID NOT NULL,
    face_descriptor_encrypted TEXT NOT NULL,
    reference_image_url TEXT,
    detection_score FLOAT,
    angles_captured TEXT[],
    consent_given BOOLEAN DEFAULT false,
    consent_date TIMESTAMPTZ,
    retention_until TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(patient_id, clinic_id)
);

-- Índices para busca rápida
CREATE INDEX IF NOT EXISTS idx_patient_face_biometrics_patient_id ON patient_face_biometrics(patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_face_biometrics_clinic_id ON patient_face_biometrics(clinic_id);

-- RLS Policies
ALTER TABLE patient_face_biometrics ENABLE ROW LEVEL SECURITY;

-- Política para usuários da clínica visualizarem biometrias de seus pacientes
CREATE POLICY "clinic_users_can_view_biometrics" ON patient_face_biometrics
    FOR SELECT USING (
        clinic_id IN (
            SELECT clinic_id FROM users WHERE id = auth.uid()
        )
    );

-- Política para usuários da clínica criarem biometrias
CREATE POLICY "clinic_users_can_insert_biometrics" ON patient_face_biometrics
    FOR INSERT WITH CHECK (
        clinic_id IN (
            SELECT clinic_id FROM users WHERE id = auth.uid()
        )
    );

-- Política para usuários da clínica atualizarem biometrias  
CREATE POLICY "clinic_users_can_update_biometrics" ON patient_face_biometrics
    FOR UPDATE USING (
        clinic_id IN (
            SELECT clinic_id FROM users WHERE id = auth.uid()
        )
    );

-- Política para service role (usado no pré-check-in público)
CREATE POLICY "service_role_full_access" ON patient_face_biometrics
    FOR ALL USING (auth.role() = 'service_role');

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_patient_face_biometrics_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_patient_face_biometrics_updated_at
    BEFORE UPDATE ON patient_face_biometrics
    FOR EACH ROW
    EXECUTE FUNCTION update_patient_face_biometrics_updated_at();

-- Comentários
COMMENT ON TABLE patient_face_biometrics IS 'Armazena biometria facial criptografada de pacientes para check-in biométrico';
COMMENT ON COLUMN patient_face_biometrics.face_descriptor_encrypted IS 'Descriptor facial de 128 dimensões criptografado com AES-256';
COMMENT ON COLUMN patient_face_biometrics.reference_image_url IS 'URL da imagem de referência (opcional, para thumbnail)';
COMMENT ON COLUMN patient_face_biometrics.detection_score IS 'Score de qualidade da detecção (0-1)';
COMMENT ON COLUMN patient_face_biometrics.angles_captured IS 'Lista de ângulos capturados (frontal, left, right)';
COMMENT ON COLUMN patient_face_biometrics.consent_given IS 'Se o paciente deu consentimento LGPD';
COMMENT ON COLUMN patient_face_biometrics.retention_until IS 'Data até quando manter os dados (LGPD)';
