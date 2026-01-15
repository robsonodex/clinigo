-- ==========================================
-- DIAGNOSE SPECIFIC APPOINTMENT
-- ==========================================
-- Finds appointment eef37588-d8d3-4d44-aecf-653f439bf0d8

DO $$
DECLARE
    v_appt_id UUID := 'eef37588-d8d3-4d44-aecf-653f439bf0d8';
    v_record RECORD;
    v_user_email TEXT := 'admin@demo.clinigo.app';
    v_user_clinic_id UUID;
BEGIN
    SELECT clinic_id INTO v_user_clinic_id FROM users WHERE email = v_user_email;
    RAISE NOTICE 'Demo Admin Clinic ID: %', v_user_clinic_id;

    SELECT * INTO v_record FROM appointments WHERE id = v_appt_id;

    IF v_record.id IS NOT NULL THEN
        RAISE NOTICE 'FOUND Appointment!';
        RAISE NOTICE 'Appt Clinic ID: %', v_record.clinic_id;
        RAISE NOTICE 'Appt Doctor ID: %', v_record.doctor_id;
        RAISE NOTICE 'Appt Patient ID: %', v_record.patient_id;
        RAISE NOTICE 'Appt Created At: %', v_record.created_at;
        
        IF v_record.clinic_id != v_user_clinic_id THEN
            RAISE NOTICE 'MISMATCH DETECTED: Appointment is in Clinic %, but Admin is in %', v_record.clinic_id, v_user_clinic_id;
        ELSE
            RAISE NOTICE 'Clinic IDs MATCH. RLS or permissions issue?';
        END IF;
    ELSE
        RAISE NOTICE 'Appointment NOT FOUND in database (Deleted or ID wrong).';
    END IF;
END $$;
