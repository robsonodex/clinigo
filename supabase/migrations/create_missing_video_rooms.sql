-- Migration: Create missing video_rooms for existing TELEMEDICINA appointments
-- Date: 2026-01-28
-- Purpose: Retroactively create video_rooms for teleconsulta appointments that don't have one

-- First, let's see what columns exist (run this to debug)
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'appointments';

-- Insert video_rooms for all TELEMEDICINA appointments that don't have a room yet
INSERT INTO video_rooms (appointment_id, room_id, patient_token, doctor_token)
SELECT 
    a.id as appointment_id,
    'room_' || substring(a.id::text, 1, 8) || '_' || extract(epoch from now())::bigint as room_id,
    'patient_' || md5(random()::text || a.id::text) as patient_token,
    'doctor_' || md5(random()::text || a.id::text) as doctor_token
FROM appointments a
WHERE 
    -- Check 'appointment_type' column for teleconsulta types (type column doesn't exist)
    a.appointment_type IN ('TELEMEDICINA', 'online')
    AND NOT EXISTS (
        SELECT 1 FROM video_rooms vr WHERE vr.appointment_id = a.id
    );

-- Log the result
DO $$
DECLARE
    created_count INTEGER;
BEGIN
    GET DIAGNOSTICS created_count = ROW_COUNT;
    RAISE NOTICE 'Created % video_rooms for existing TELEMEDICINA appointments', created_count;
END $$;
