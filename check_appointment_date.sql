-- Check the most recent appointment date
SELECT 
    id,
    appointment_date,
    appointment_time,
    created_at,
    EXTRACT(TIMEZONE FROM appointment_date::timestamptz) as timezone_offset
FROM appointments 
WHERE patient_id = (
    SELECT id FROM patients WHERE full_name LIKE '%Robson%' LIMIT 1
)
ORDER BY created_at DESC
LIMIT 3;

-- Check QR codes for this appointment
SELECT 
    qr.id,
    qr.appointment_id,
    qr.created_at as qr_created_at,
    a.appointment_date,
    a.appointment_time
FROM appointment_qr_codes qr
JOIN appointments a ON a.id = qr.appointment_id
WHERE a.patient_id = (
    SELECT id FROM patients WHERE full_name LIKE '%Robson%' LIMIT 1
)
ORDER BY qr.created_at DESC
LIMIT 3;
