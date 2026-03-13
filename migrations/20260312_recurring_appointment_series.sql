-- ============================================
-- CLINIGO: Recurring Appointment Series
-- For therapy clinics (ABA, Fono, TO, etc.)
-- Fixed weekly schedules auto-filling the calendar
-- ============================================

-- Table: recurring_appointment_series
-- Purpose: Stores recurring therapy schedules
-- Example: Zezinho does ABA with Cris on Mon+Wed at 08:00
CREATE TABLE IF NOT EXISTS recurring_appointment_series (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE RESTRICT,
  doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE RESTRICT,

  -- Schedule definition
  days_of_week SMALLINT[] NOT NULL,          -- Array: [1, 3] = Monday + Wednesday
  appointment_time TIME NOT NULL,            -- Fixed time: 08:00
  therapy_type TEXT,                         -- "ABA", "Fono", "TO", etc.

  -- Period
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,

  -- Appointment defaults
  payment_type TEXT DEFAULT 'PARTICULAR',    -- PARTICULAR or CONVENIO
  appointment_type TEXT DEFAULT 'presencial', -- presencial or online
  health_insurance_plan_id UUID,
  notes TEXT,

  -- Status
  is_active BOOLEAN DEFAULT TRUE,

  -- Audit
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_days_of_week CHECK (
    array_length(days_of_week, 1) > 0 AND
    days_of_week <@ ARRAY[0, 1, 2, 3, 4, 5, 6]::SMALLINT[]
  ),
  CONSTRAINT valid_date_range CHECK (end_date > start_date),
  CONSTRAINT valid_payment_type CHECK (payment_type IN ('PARTICULAR', 'CONVENIO')),
  CONSTRAINT valid_appointment_type CHECK (appointment_type IN ('presencial', 'online'))
);

COMMENT ON TABLE recurring_appointment_series IS 'Recurring therapy schedules that auto-generate appointments';
COMMENT ON COLUMN recurring_appointment_series.days_of_week IS '0=Sunday, 1=Monday, ..., 6=Saturday';
COMMENT ON COLUMN recurring_appointment_series.therapy_type IS 'Type of therapy: ABA, Fono, TO, Psicologia, etc.';

-- Add series_id to appointments table to link individual appointments to their series
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name='appointments' AND column_name='series_id') THEN
    ALTER TABLE appointments ADD COLUMN series_id UUID REFERENCES recurring_appointment_series(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_recurring_series_clinic ON recurring_appointment_series(clinic_id);
CREATE INDEX IF NOT EXISTS idx_recurring_series_patient ON recurring_appointment_series(patient_id);
CREATE INDEX IF NOT EXISTS idx_recurring_series_doctor ON recurring_appointment_series(doctor_id);
CREATE INDEX IF NOT EXISTS idx_recurring_series_active ON recurring_appointment_series(clinic_id, is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_appointments_series ON appointments(series_id) WHERE series_id IS NOT NULL;

-- RLS
ALTER TABLE recurring_appointment_series ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view series from their clinic"
ON recurring_appointment_series FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = auth.uid()
      AND (u.clinic_id = recurring_appointment_series.clinic_id OR u.role = 'SUPER_ADMIN')
  )
);

CREATE POLICY "Clinic admins and doctors can create series"
ON recurring_appointment_series FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = auth.uid()
      AND u.clinic_id = recurring_appointment_series.clinic_id
      AND u.role IN ('CLINIC_ADMIN', 'DOCTOR', 'RECEPTIONIST')
  )
);

CREATE POLICY "Clinic admins can update series"
ON recurring_appointment_series FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = auth.uid()
      AND u.clinic_id = recurring_appointment_series.clinic_id
      AND u.role IN ('CLINIC_ADMIN', 'DOCTOR', 'RECEPTIONIST')
  )
);

CREATE POLICY "Clinic admins can delete series"
ON recurring_appointment_series FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = auth.uid()
      AND u.clinic_id = recurring_appointment_series.clinic_id
      AND u.role IN ('CLINIC_ADMIN')
  )
);

-- Trigger for updated_at
CREATE TRIGGER set_updated_at BEFORE UPDATE ON recurring_appointment_series
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Migration completed: recurring_appointment_series table created with RLS policies
