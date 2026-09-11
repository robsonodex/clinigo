-- Migration: Add student_id and mentoring_notes to recurring_appointment_series
-- Permite criacao de series recorrentes para mentorias clinicas / alunas (sem vinculo com pacientes)

-- 1. Permitir patient_id nulo na tabela recurring_appointment_series
ALTER TABLE recurring_appointment_series 
ALTER COLUMN patient_id DROP NOT NULL;

-- 2. Adicionar student_id referenciando a tabela students
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'recurring_appointment_series' AND column_name = 'student_id'
    ) THEN
        ALTER TABLE recurring_appointment_series 
        ADD COLUMN student_id UUID REFERENCES students(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 3. Adicionar mentoring_notes na tabela recurring_appointment_series
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'recurring_appointment_series' AND column_name = 'mentoring_notes'
    ) THEN
        ALTER TABLE recurring_appointment_series 
        ADD COLUMN mentoring_notes TEXT;
    END IF;
END $$;

-- 4. Indice para buscas otimizadas por mentorando(a)
CREATE INDEX IF NOT EXISTS idx_recurring_appointment_series_student_id 
ON recurring_appointment_series(student_id);

COMMENT ON COLUMN recurring_appointment_series.student_id IS 'Mentorando(a) / Formando(a) participante da serie recorrente de mentoria clinica';
COMMENT ON COLUMN recurring_appointment_series.mentoring_notes IS 'Pauta e anotacoes tecnicas da serie recorrente de mentoria clinica';
