-- ==========================================
-- FIX DEMO DATA ALIGNMENT
-- ==========================================
-- Purpose: Fix "Patient does not belong to this clinic" errors by ensuring
-- all demo data points to the active 'demo' clinic.
-- This handles cases where the demo setup was run multiple times, leaving 
-- orphaned records or IDs from deleted clinics.

DO $$
DECLARE
    v_demo_clinic_id UUID;
BEGIN
    -- 1. Get the authoritative 'demo' clinic ID
    SELECT id INTO v_demo_clinic_id 
    FROM clinics 
    WHERE slug = 'demo' 
    LIMIT 1;

    IF v_demo_clinic_id IS NOT NULL THEN
        RAISE NOTICE 'Aligning demo data to Clinic ID: %', v_demo_clinic_id;

        -- 2. Update Users (Admin/Doctor/Receptionist)
        UPDATE users 
        SET clinic_id = v_demo_clinic_id 
        WHERE email LIKE '%@demo.clinigo.app' 
        AND clinic_id != v_demo_clinic_id;

        -- 3. Update Doctors
        UPDATE doctors 
        SET clinic_id = v_demo_clinic_id 
        WHERE user_id IN (
            SELECT id FROM users WHERE email LIKE '%@demo.clinigo.app'
        )
        AND clinic_id != v_demo_clinic_id;

        -- 4. Update Demo Patients (emails ending in @exemplo.com)
        UPDATE patients 
        SET clinic_id = v_demo_clinic_id 
        WHERE email LIKE '%@exemplo.com'
        AND clinic_id != v_demo_clinic_id;

        -- 5. Update Appointments for these patients
        UPDATE appointments 
        SET clinic_id = v_demo_clinic_id 
        WHERE patient_id IN (
            SELECT id FROM patients WHERE clinic_id = v_demo_clinic_id
        )
        AND clinic_id != v_demo_clinic_id;

        -- 6. Update Financial Entries
        UPDATE financial_entries
        SET clinic_id = v_demo_clinic_id
        WHERE created_by IN (
             SELECT id FROM users WHERE email LIKE '%@demo.clinigo.app'
        )
        AND clinic_id != v_demo_clinic_id;

        RAISE NOTICE 'Data alignment complete.';
    ELSE
        RAISE WARNING 'No clinic found with slug=demo';
    END IF;
END $$;
