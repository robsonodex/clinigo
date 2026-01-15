-- ==========================================
-- FIX DEMO DATA ALIGNMENT (UPDATED)
-- ==========================================
-- Purpose: Fix "Patient does not belong to this clinic" and "404 Not Found" errors.
-- Ensures all demo data (Patients, Appointments, Medical Records) belongs to the active 'demo' clinic.

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

        -- 6. Update Medical Records [NEW: Critical for 500/404 errors]
        UPDATE medical_records
        SET clinic_id = v_demo_clinic_id
        WHERE patient_id IN (
            SELECT id FROM patients WHERE clinic_id = v_demo_clinic_id
        )
        AND clinic_id != v_demo_clinic_id;

        -- 7. Update Financial Entries
        UPDATE financial_entries
        SET clinic_id = v_demo_clinic_id
        WHERE created_by IN (
             SELECT id FROM users WHERE email LIKE '%@demo.clinigo.app'
        )
        AND clinic_id != v_demo_clinic_id;

        RAISE NOTICE 'Data alignment complete. All demo data now belongs to Clinic %', v_demo_clinic_id;
    ELSE
        RAISE WARNING 'No clinic found with slug=demo';
    END IF;
END $$;
