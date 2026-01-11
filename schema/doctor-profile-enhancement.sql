-- Migration: Adicionar campos de perfil profissional para médicos
-- Data: 2026-01-11
-- Descrição: Campos para avaliações, experiência, badges e informações adicionais

-- 1. Adicionar campos na tabela doctors
ALTER TABLE doctors
ADD COLUMN IF NOT EXISTS rating DECIMAL(2,1) DEFAULT 0,
ADD COLUMN IF NOT EXISTS review_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS experience_years INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_premium BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS bio_extended TEXT,
ADD COLUMN IF NOT EXISTS faithful_patients_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS specialties_additional TEXT[], -- Array de especialidades adicionais
ADD COLUMN IF NOT EXISTS certifications TEXT[], -- Certificações e títulos
ADD COLUMN IF NOT EXISTS languages TEXT[] DEFAULT ARRAY['Português']::TEXT[]; -- Idiomas

-- 2. Comentários para documentação
COMMENT ON COLUMN doctors.rating IS 'Avaliação média do médico (0-5 estrelas)';
COMMENT ON COLUMN doctors.review_count IS 'Número total de avaliações recebidas';
COMMENT ON COLUMN doctors.experience_years IS 'Anos de experiência profissional';
COMMENT ON COLUMN doctors.is_premium IS 'Perfil premium com destaque na busca';
COMMENT ON COLUMN doctors.bio_extended IS 'Biografia estendida com diferenciais e especialidades';
COMMENT ON COLUMN doctors.faithful_patients_count IS 'Pacientes que retornaram para consulta';
COMMENT ON COLUMN doctors.specialties_additional IS 'Especialidades ou subespecialidades adicionais';
COMMENT ON COLUMN doctors.certifications IS 'Títulos, certificações e reconhecimentos';
COMMENT ON COLUMN doctors.languages IS 'Idiomas falados pelo médico';

-- 3. Criar tabela de avaliações de médicos
CREATE TABLE IF NOT EXISTS doctor_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    is_verified BOOLEAN DEFAULT false, -- se é de uma consulta real
    is_published BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(appointment_id), -- Uma avaliação por consulta
    CONSTRAINT valid_rating CHECK (rating BETWEEN 1 AND 5)
);

-- 4. Índices para performance
CREATE INDEX IF NOT EXISTS idx_doctor_reviews_doctor_id ON doctor_reviews(doctor_id);
CREATE INDEX IF NOT EXISTS idx_doctor_reviews_patient_id ON doctor_reviews(patient_id);
CREATE INDEX IF NOT EXISTS idx_doctor_reviews_rating ON doctor_reviews(rating);
CREATE INDEX IF NOT EXISTS idx_doctors_rating ON doctors(rating DESC);
CREATE INDEX IF NOT EXISTS idx_doctors_premium ON doctors(is_premium) WHERE is_premium = true;

-- 5. Trigger para atualizar rating do médico automaticamente
CREATE OR REPLACE FUNCTION update_doctor_rating()
RETURNS TRIGGER AS $$
BEGIN
    -- Recalcular rating médio e contagem
    UPDATE doctors
    SET 
        rating = (
            SELECT ROUND(AVG(rating)::numeric, 1)
            FROM doctor_reviews
            WHERE doctor_id = NEW.doctor_id AND is_published = true
        ),
        review_count = (
            SELECT COUNT(*)
            FROM doctor_reviews
            WHERE doctor_id = NEW.doctor_id AND is_published = true
        )
    WHERE id = NEW.doctor_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_doctor_rating ON doctor_reviews;
CREATE TRIGGER trigger_update_doctor_rating
    AFTER INSERT OR UPDATE OR DELETE ON doctor_reviews
    FOR EACH ROW
    EXECUTE FUNCTION update_doctor_rating();

-- 6. Função para contar pacientes fiéis (retornaram após primeira consulta)
CREATE OR REPLACE FUNCTION update_faithful_patients_count(p_doctor_id UUID)
RETURNS INTEGER AS $$
DECLARE
    faithful_count INTEGER;
BEGIN
    -- Contar pacientes que tiveram mais de 1 consulta com o médico
    SELECT COUNT(DISTINCT patient_id)
    INTO faithful_count
    FROM appointments
    WHERE doctor_id = p_doctor_id
        AND status IN ('COMPLETED', 'CONFIRMED')
    GROUP BY patient_id
    HAVING COUNT(*) > 1;
    
    -- Atualizar contagem no perfil do médico
    UPDATE doctors
    SET faithful_patients_count = COALESCE(faithful_count, 0)
    WHERE id = p_doctor_id;
    
    RETURN COALESCE(faithful_count, 0);
END;
$$ LANGUAGE plpgsql;

-- 7. Permissões
GRANT SELECT ON doctor_reviews TO authenticated;
GRANT INSERT, UPDATE ON doctor_reviews TO authenticated;

-- 8. Valores iniciais para médicos existentes (opcional)
-- UPDATE doctors SET experience_years = 5 WHERE experience_years = 0; -- Ajustar conforme necessário
