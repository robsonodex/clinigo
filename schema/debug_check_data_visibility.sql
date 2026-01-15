-- ==========================================
-- DIAGNOSE RLS VISIBILITY
-- ==========================================
-- Run this in Supabase SQL Editor.

DO $$
DECLARE
    v_user_email TEXT := 'admin@demo.clinigo.app';
    v_user_id UUID;
    v_clinic_id UUID;
    v_count_all_patients INTEGER;
    v_count_visible_patients INTEGER;
    v_count_all_records INTEGER;
    v_count_visible_records INTEGER;
BEGIN
    -- 1. Get User Context
    SELECT id INTO v_user_id FROM auth.users WHERE email = v_user_email;
    SELECT clinic_id INTO v_clinic_id FROM public.users WHERE email = v_user_email;

    RAISE NOTICE 'Debugging User: % (ID: %, Clinic: %)', v_user_email, v_user_id, v_clinic_id;

    -- 2. Count TOTAL Patients (Ignoring RLS by querying as postgres/superuser role of this script)
    SELECT COUNT(*) INTO v_count_all_patients FROM patients;
    
    -- 3. Count TOTAL Medical Records
    SELECT COUNT(*) INTO v_count_all_records FROM medical_records;

    -- 4. SIMULATE RLS CONTEXT
    -- We cannot easily simulate auth.uid() in a simple DO block without setting session variables that might not stick.
    -- However, we can inspect the rows to see if their clinic_id matches the user's clinic_id.

    RAISE NOTICE '--- Data Consistency Check ---';
    
    -- Check Patients with WRONG Clinic ID
    SELECT COUNT(*) INTO v_count_visible_patients 
    FROM patients 
    WHERE clinic_id = v_clinic_id;

    RAISE NOTICE 'Total Patients in DB: %', v_count_all_patients;
    RAISE NOTICE 'Patients linked to User Clinic (%): %', v_clinic_id, v_count_visible_patients;
    
    IF v_count_all_patients > v_count_visible_patients THEN
        RAISE NOTICE 'WARNING: % Patients are NOT linked to this clinic!', (v_count_all_patients - v_count_visible_patients);
    END IF;

    -- Check Medical Records with WRONG Clinic ID
    SELECT COUNT(*) INTO v_count_visible_records
    FROM medical_records 
    WHERE clinic_id = v_clinic_id;

    RAISE NOTICE 'Total Medical Records in DB: %', v_count_all_records;
    RAISE NOTICE 'Records linked to User Clinic (%): %', v_clinic_id, v_count_visible_records;

    -- 5. Check specific policies exist
    RAISE NOTICE '--- Checking Policies ---';
    
    PERFORM * FROM pg_policies WHERE tablename = 'medical_records';
    IF FOUND THEN
        RAISE NOTICE 'RLS Policies found on medical_records.';
    ELSE
        RAISE NOTICE 'NO RLS POLICIES found on medical_records (If enabled, table is empty for non-superusers).';
    END IF;

END $$;
