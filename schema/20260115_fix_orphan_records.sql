-- CliniGo - Fix Orphan Records and Add Foreign Key Constraints
-- Execute in Supabase SQL Editor

-- ============================================
-- STEP 1: AUDIT - Count orphan records
-- ============================================

SELECT 'appointments' as table_name, COUNT(*) as orphan_count
FROM appointments a
LEFT JOIN clinics c ON a.clinic_id = c.id
WHERE c.id IS NULL

UNION ALL

SELECT 'patients', COUNT(*)
FROM patients p
LEFT JOIN clinics c ON p.clinic_id = c.id
WHERE c.id IS NULL

UNION ALL

SELECT 'medical_records', COUNT(*)
FROM medical_records mr
LEFT JOIN clinics c ON mr.clinic_id = c.id
WHERE c.id IS NULL

UNION ALL

SELECT 'doctors', COUNT(*)
FROM doctors d
LEFT JOIN clinics c ON d.clinic_id = c.id
WHERE c.id IS NULL;

-- ============================================
-- STEP 2: VIEW orphan details (for investigation)
-- ============================================

-- Orphan appointments
SELECT a.id, a.clinic_id, a.created_at, a.patient_id
FROM appointments a
LEFT JOIN clinics c ON a.clinic_id = c.id
WHERE c.id IS NULL
LIMIT 20;

-- Orphan patients
SELECT p.id, p.full_name, p.clinic_id, p.created_at
FROM patients p
LEFT JOIN clinics c ON p.clinic_id = c.id
WHERE c.id IS NULL
LIMIT 20;

-- ============================================
-- STEP 3: DELETE orphan records (CAUTION!)
-- Only run after backup and audit approval
-- ============================================

/*
-- Delete orphan appointments first (due to FK dependencies)
DELETE FROM appointments 
WHERE clinic_id NOT IN (SELECT id FROM clinics);

-- Delete orphan patients
DELETE FROM patients 
WHERE clinic_id NOT IN (SELECT id FROM clinics);

-- Delete orphan medical_records
DELETE FROM medical_records 
WHERE clinic_id NOT IN (SELECT id FROM clinics);

-- Delete orphan doctors
DELETE FROM doctors 
WHERE clinic_id NOT IN (SELECT id FROM clinics);
*/

-- ============================================
-- STEP 4: ADD Foreign Key Constraints (Prevention)
-- ============================================

-- Check existing constraints
SELECT 
    tc.constraint_name, 
    tc.table_name, 
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND ccu.table_name = 'clinics';

-- Add FK constraints if not exist
DO $$
BEGIN
  -- Appointments -> Clinics
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_appointments_clinic'
  ) THEN
    ALTER TABLE appointments 
    ADD CONSTRAINT fk_appointments_clinic
    FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE;
    RAISE NOTICE 'Added FK constraint: fk_appointments_clinic';
  END IF;
  
  -- Patients -> Clinics
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_patients_clinic'
  ) THEN
    ALTER TABLE patients 
    ADD CONSTRAINT fk_patients_clinic
    FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE;
    RAISE NOTICE 'Added FK constraint: fk_patients_clinic';
  END IF;
  
  -- Doctors -> Clinics
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_doctors_clinic'
  ) THEN
    ALTER TABLE doctors 
    ADD CONSTRAINT fk_doctors_clinic
    FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE;
    RAISE NOTICE 'Added FK constraint: fk_doctors_clinic';
  END IF;
  
  -- Medical Records -> Clinics
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_medical_records_clinic'
  ) THEN
    ALTER TABLE medical_records 
    ADD CONSTRAINT fk_medical_records_clinic
    FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE;
    RAISE NOTICE 'Added FK constraint: fk_medical_records_clinic';
  END IF;

EXCEPTION
  WHEN others THEN
    RAISE NOTICE 'Error adding constraint: %', SQLERRM;
END $$;

-- Verify constraints were added
SELECT 
    tc.constraint_name, 
    tc.table_name
FROM information_schema.table_constraints AS tc 
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.constraint_name LIKE 'fk_%_clinic';
