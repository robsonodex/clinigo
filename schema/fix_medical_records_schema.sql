-- ==========================================
-- FIX MEDICAL RECORDS SCHEMA
-- ==========================================
-- Purpose: Add missing columns to medical_records table and ensure RLS
-- ==========================================

-- 1. Add missing columns
ALTER TABLE medical_records 
ADD COLUMN IF NOT EXISTS chief_complaint TEXT,
ADD COLUMN IF NOT EXISTS present_illness TEXT,
ADD COLUMN IF NOT EXISTS physical_exam TEXT,
ADD COLUMN IF NOT EXISTS treatment_plan TEXT;

-- 2. Ensure clinic_id is present (it should be, but just in case)
-- ALTER TABLE medical_records ADD COLUMN IF NOT EXISTS clinic_id UUID REFERENCES clinics(id);

-- 3. Verify RLS
ALTER TABLE medical_records ENABLE ROW LEVEL SECURITY;

-- Policy for reading (Users can view records from their clinic)
DROP POLICY IF EXISTS "Users can view clinic records" ON medical_records;
CREATE POLICY "Users can view clinic records" ON medical_records
    FOR SELECT
    USING (clinic_id = (auth.jwt() -> 'app_metadata' ->> 'clinic_id')::uuid);

-- Policy for inserting (Doctors can create records)
DROP POLICY IF EXISTS "Doctors can create records" ON medical_records;
CREATE POLICY "Doctors can create records" ON medical_records
    FOR INSERT
    WITH CHECK (
        clinic_id = (auth.jwt() -> 'app_metadata' ->> 'clinic_id')::uuid
        AND 
        (auth.jwt() -> 'app_metadata' ->> 'role') = 'DOCTOR'
    );

-- Policy for updating (Doctors can update their own records)
DROP POLICY IF EXISTS "Doctors can update own records" ON medical_records;
CREATE POLICY "Doctors can update own records" ON medical_records
    FOR UPDATE
    USING (doctor_id IN (
        SELECT id FROM doctors WHERE user_id = auth.uid()
    ));
