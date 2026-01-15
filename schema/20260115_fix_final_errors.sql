-- ==========================================
-- FINAL FIX FOR REMAINING ERRORS
-- ==========================================

-- 1. FIX COLUMN NAME MISMATCH (Medical Records)
-- ==========================================
-- Error: column medical_records.diagnosis does not exist
-- Fix: Rename 'diagnoses' to 'diagnosis' if it exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'medical_records' 
        AND column_name = 'diagnoses'
    ) THEN
        ALTER TABLE medical_records RENAME COLUMN diagnoses TO diagnosis;
    END IF;
END $$;

-- 2. FIX DEMO DATA ALIGNMENT (P0001 Error)
-- ==========================================
-- Re-running the alignment logic to ensure patients belong to the correct clinic
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
