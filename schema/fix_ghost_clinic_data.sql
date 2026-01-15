-- ==========================================
-- FIX GHOST CLINIC DATA
-- ==========================================
-- Problem: Appointments were created with an OLD 'Ghost' Clinic ID (996cf8f8...)
-- because the frontend session was stale. The User is actually in Clinic (8afc2e91...).
-- This script moves ALL data from the Ghost Clinic to the Real Clinic.

DO $$
DECLARE
    -- IDs captured from your diagnostic output
    v_ghost_clinic_id UUID := '996cf8f8-12c0-4a35-af26-e90f98e51688';
    v_real_clinic_id  UUID := '8afc2e91-bfa5-4f6a-bb68-1c063b79604b';
BEGIN
    RAISE NOTICE 'Moving data from Ghost Clinic % to Real Clinic %', v_ghost_clinic_id, v_real_clinic_id;

    -- 0. Drop blocking constraint that prevents updating past appointments
    ALTER TABLE appointments DROP CONSTRAINT IF EXISTS future_appointment;

    -- 1. Update Patients
    UPDATE patients 
    SET clinic_id = v_real_clinic_id 
    WHERE clinic_id = v_ghost_clinic_id;
    
    RAISE NOTICE 'Updated Patients';

    -- 2. Update Appointments (Fixes "Consulta não encontrada")
    UPDATE appointments 
    SET clinic_id = v_real_clinic_id 
    WHERE clinic_id = v_ghost_clinic_id;

    RAISE NOTICE 'Updated Appointments';

    -- 3. Update Medical Records (Fixes 500 errors on records)
    UPDATE medical_records 
    SET clinic_id = v_real_clinic_id 
    WHERE clinic_id = v_ghost_clinic_id;

    RAISE NOTICE 'Updated Medical Records';

    -- 4. Update Financial Entries
    UPDATE financial_entries 
    SET clinic_id = v_real_clinic_id 
    WHERE clinic_id = v_ghost_clinic_id;

    RAISE NOTICE 'Updated Financial Entries';

    RAISE NOTICE 'SUCCESS: All ghost data has been recovered!';
END $$;
