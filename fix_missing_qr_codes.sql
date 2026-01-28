-- Fix existing appointments without QR codes
-- Execute this in Supabase SQL Editor

-- Get appointments without QR codes and create them
INSERT INTO appointment_qr_codes (appointment_id, clinic_id, qr_token, expires_at)
SELECT 
    a.id as appointment_id,
    a.clinic_id,
    'clinigo_' || substring(a.id::text from 1 for 8) || '_' || substring(md5(random()::text)::text from 1 for 8) || '_' || extract(epoch from now())::bigint::text as qr_token,
    (now() + interval '24 hours') as expires_at
FROM appointments a
LEFT JOIN appointment_qr_codes qr ON qr.appointment_id = a.id
WHERE qr.id IS NULL
  AND a.appointment_date >= CURRENT_DATE; -- Only future appointments


-- Verify
SELECT 
    a.id,
    a.appointment_date,
    a.appointment_time,
    qr.qr_token,
    qr.created_at
FROM appointments a
JOIN appointment_qr_codes qr ON qr.appointment_id = a.id
ORDER BY a.appointment_date, a.appointment_time;
