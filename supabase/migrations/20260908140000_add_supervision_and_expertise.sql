-- Migration: Adicionar campo de Área de Atuação e Toggle de Supervisão Técnica em doctors,
-- e suporte a Supervisão Técnica (sem paciente) na tabela appointments.

-- 1. Campos na tabela doctors
ALTER TABLE doctors
ADD COLUMN IF NOT EXISTS area_of_expertise TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS allows_supervision BOOLEAN DEFAULT FALSE;

-- 2. Backfill seguro para garantir que nenhum registro fique nulo em allows_supervision
UPDATE doctors
SET allows_supervision = FALSE
WHERE allows_supervision IS NULL;

-- 3. Campos na tabela appointments para Supervisão Técnica
ALTER TABLE appointments
ADD COLUMN IF NOT EXISTS professional_supervised_id UUID REFERENCES doctors(id) ON DELETE SET NULL DEFAULT NULL,
ADD COLUMN IF NOT EXISTS supervision_notes TEXT DEFAULT NULL;

-- 4. Índice de performance para consultas de profissionais supervisionados
CREATE INDEX IF NOT EXISTS idx_appointments_professional_supervised_id
ON appointments(professional_supervised_id);

-- 5. Comentários para documentação de schema
COMMENT ON COLUMN doctors.area_of_expertise IS 'Área de Atuação ou agrupador secundário (ex: Equipe Multiprofissional)';
COMMENT ON COLUMN doctors.allows_supervision IS 'Flag que autoriza o profissional a registrar eventos de Supervisão Técnica/Clínica na agenda';
COMMENT ON COLUMN appointments.professional_supervised_id IS 'ID do profissional supervisionado em compromissos de Supervisão Técnica (sem paciente)';
COMMENT ON COLUMN appointments.supervision_notes IS 'Anotações clínicas/técnicas livres registradas durante a sessão de supervisão';
