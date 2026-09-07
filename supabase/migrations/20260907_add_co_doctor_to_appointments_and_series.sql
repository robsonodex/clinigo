-- ================================================================
-- Migration: Add co_doctor_id to appointments and recurring_appointment_series
-- Purpose: Support Co-Atendimento Multidisciplinar (Simultaneous Co-Therapy)
-- Date: 2026-09-07
-- ================================================================

-- 1. Add co_doctor_id to recurring_appointment_series
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'recurring_appointment_series' AND column_name = 'co_doctor_id'
  ) THEN
    ALTER TABLE recurring_appointment_series
    ADD COLUMN co_doctor_id UUID REFERENCES doctors(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 2. Add co_doctor_id to appointments
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'appointments' AND column_name = 'co_doctor_id'
  ) THEN
    ALTER TABLE appointments
    ADD COLUMN co_doctor_id UUID REFERENCES doctors(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 3. Safety constraints: doctor and co_doctor cannot be the same person
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_series_distinct_doctors'
  ) THEN
    ALTER TABLE recurring_appointment_series
    ADD CONSTRAINT chk_series_distinct_doctors
    CHECK (co_doctor_id IS NULL OR doctor_id != co_doctor_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_appointments_distinct_doctors'
  ) THEN
    ALTER TABLE appointments
    ADD CONSTRAINT chk_appointments_distinct_doctors
    CHECK (co_doctor_id IS NULL OR doctor_id != co_doctor_id);
  END IF;
END $$;

-- 4. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_appointments_co_doctor_id
ON appointments(co_doctor_id)
WHERE co_doctor_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_recurring_series_co_doctor_id
ON recurring_appointment_series(co_doctor_id)
WHERE co_doctor_id IS NOT NULL;

COMMENT ON COLUMN recurring_appointment_series.co_doctor_id IS 'Secondary/Coparticipant therapist for multidisciplinary co-attendance';
COMMENT ON COLUMN appointments.co_doctor_id IS 'Secondary/Coparticipant therapist for multidisciplinary co-attendance';
