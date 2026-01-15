-- ==========================================
-- FINAL MASTER FIX (SCHEMA + DATA)
-- ==========================================
-- Run this script to resolve 500 Errors in Medical Records and Appointments.

-- 1. FIX MEDICAL RECORDS (Column Mismatch)
-- ==========================================
DO $$
BEGIN
    -- Rename 'diagnoses' -> 'diagnosis' if mismatch exists
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'medical_records' AND column_name = 'diagnoses') THEN
        ALTER TABLE medical_records RENAME COLUMN diagnoses TO diagnosis;
    END IF;

    -- Add possibly missing columns (idempotent)
    ALTER TABLE medical_records ADD COLUMN IF NOT EXISTS chief_complaint TEXT;
    ALTER TABLE medical_records ADD COLUMN IF NOT EXISTS present_illness TEXT;
    ALTER TABLE medical_records ADD COLUMN IF NOT EXISTS physical_exam TEXT;
    ALTER TABLE medical_records ADD COLUMN IF NOT EXISTS treatment_plan TEXT;
    ALTER TABLE medical_records ADD COLUMN IF NOT EXISTS prescription TEXT; -- Just in case
    ALTER TABLE medical_records ADD COLUMN IF NOT EXISTS diagnosis TEXT;
END $$;

-- 2. FIX FINANCIAL ENTRIES (Missing Columns for Appointments)
-- ==========================================
ALTER TABLE financial_entries ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50);
ALTER TABLE financial_entries ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;
ALTER TABLE financial_entries ADD COLUMN IF NOT EXISTS reference_type VARCHAR(50);
ALTER TABLE financial_entries ADD COLUMN IF NOT EXISTS reference_id UUID;
ALTER TABLE financial_entries ADD COLUMN IF NOT EXISTS created_by UUID;

-- 3. FIX APPOINTMENT LOCKS (Missing Table?)
-- ==========================================
CREATE TABLE IF NOT EXISTS appointment_slot_locks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doctor_id UUID NOT NULL, -- REFERENCES doctors(id)
    slot_datetime TIMESTAMPTZ NOT NULL,
    locked_by UUID NOT NULL, -- REFERENCES auth.users(id)
    lock_status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS appointment_lock_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lock_id UUID NOT NULL,
    action VARCHAR(50) NOT NULL,
    user_id UUID NOT NULL,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. RE-RUN DATA ALIGNMENT (Demo Clinic)
-- ==========================================
DO $$
DECLARE
    v_demo_clinic_id UUID;
BEGIN
    SELECT id INTO v_demo_clinic_id FROM clinics WHERE slug = 'demo' LIMIT 1;

    IF v_demo_clinic_id IS NOT NULL THEN
        -- Align Patients
        UPDATE patients 
        SET clinic_id = v_demo_clinic_id 
        WHERE email LIKE '%@exemplo.com' 
        AND clinic_id != v_demo_clinic_id;

        -- Align Appointments
        UPDATE appointments 
        SET clinic_id = v_demo_clinic_id 
        WHERE patient_id IN (SELECT id FROM patients WHERE clinic_id = v_demo_clinic_id)
        AND clinic_id != v_demo_clinic_id;
        
        -- Align Doctors
        UPDATE doctors
        SET clinic_id = v_demo_clinic_id 
        WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@demo.clinigo.app')
        AND clinic_id != v_demo_clinic_id;
    END IF;
END $$;

-- 5. FIX PERMISSIONS (RLS)
-- ==========================================
ALTER TABLE medical_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

-- Policy: Allow authenticated users to view/create/update if they belong to the clinic
DROP POLICY IF EXISTS "Users can view records from their clinic" ON medical_records;
CREATE POLICY "Users can view records from their clinic" ON medical_records
    FOR SELECT USING (
        clinic_id = (auth.jwt() -> 'app_metadata' ->> 'clinic_id')::uuid
    );

DROP POLICY IF EXISTS "Doctors can create records" ON medical_records;
CREATE POLICY "Doctors can create records" ON medical_records
    FOR INSERT WITH CHECK (
        auth.role() = 'authenticated' -- Simplification for demo
    );

DROP POLICY IF EXISTS "Doctors can update records" ON medical_records;
CREATE POLICY "Doctors can update records" ON medical_records
    FOR UPDATE USING (
        auth.role() = 'authenticated'
    );
