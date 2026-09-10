-- Migration: Cadastro de Alunas/Mentorandas (students) e suporte a agendamento de mentoria em appointments
-- Sem vinculo com prontuario clinico de paciente nem biometria facial.

-- 1) Cadastro de alunas/mentorandas — tabela própria, nunca misturada com patients ou doctors
CREATE TABLE IF NOT EXISTS students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  contact_phone TEXT,
  contact_email TEXT,
  program TEXT, -- curso / estágio / pós / mentoria
  supervising_doctor_id UUID REFERENCES doctors(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_students_clinic_status ON students (clinic_id, status);

-- Enable RLS
ALTER TABLE students ENABLE ROW LEVEL SECURITY;

-- RLS Policies for students
DROP POLICY IF EXISTS "Users can view students of their clinic" ON students;
CREATE POLICY "Users can view students of their clinic"
  ON students FOR SELECT
  USING (
    clinic_id IN (
      SELECT clinic_id FROM users WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert students for their clinic" ON students;
CREATE POLICY "Users can insert students for their clinic"
  ON students FOR INSERT
  WITH CHECK (
    clinic_id IN (
      SELECT clinic_id FROM users WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update students of their clinic" ON students;
CREATE POLICY "Users can update students of their clinic"
  ON students FOR UPDATE
  USING (
    clinic_id IN (
      SELECT clinic_id FROM users WHERE id = auth.uid()
    )
  );

-- 2) Vínculo em appointments
ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS student_id UUID REFERENCES students(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS mentoring_notes TEXT;

CREATE INDEX IF NOT EXISTS appointments_student_id_idx ON appointments (student_id);

-- 3) Garantir exclusividade entre os três tipos de vínculo (patient_id, professional_supervised_id, student_id)
ALTER TABLE appointments
  DROP CONSTRAINT IF EXISTS appointments_attendee_exclusivity_chk;

ALTER TABLE appointments
  ADD CONSTRAINT appointments_attendee_exclusivity_chk CHECK (
    (patient_id IS NOT NULL)::INT
    + (professional_supervised_id IS NOT NULL)::INT
    + (student_id IS NOT NULL)::INT
    <= 1
  );

-- 4) Comentários para documentação do schema
COMMENT ON TABLE students IS 'Cadastro de alunas, estagiárias e mentorandas da clínica (sem vínculo com pacientes)';
COMMENT ON COLUMN appointments.student_id IS 'ID da aluna em sessões de mentoria/estágio (sem paciente e sem prontuário clínico)';
COMMENT ON COLUMN appointments.mentoring_notes IS 'Pauta e anotações técnicas da sessão de mentoria com a aluna';
