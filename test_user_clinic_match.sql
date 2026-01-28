-- Test if current user's clinic_id matches the appointment's clinic_id
-- Execute this while logged in as the reception user

-- 1. Check current user info
SELECT 
    id,
    email,
    clinic_id,
    role
FROM users
WHERE id = auth.uid();

-- 2. Check the appointment
SELECT 
    id,
    clinic_id,
    status,
    patient_id
FROM appointments
WHERE id = '8338ec19-0f6c-413c-9bec-3080881b5576';

-- 3. Check if they match
SELECT 
    u.id as user_id,
    u.email,
    u.clinic_id as user_clinic_id,
    u.role as user_role,
    a.id as appointment_id,
    a.clinic_id as appointment_clinic_id,
    (u.clinic_id = a.clinic_id) as clinic_match,
    CASE 
        WHEN u.clinic_id = a.clinic_id THEN '✅ MATCH - Should work'
        ELSE '❌ NO MATCH - This is the problem!'
    END as diagnosis
FROM users u
CROSS JOIN appointments a
WHERE u.id = auth.uid()
  AND a.id = '8338ec19-0f6c-413c-9bec-3080881b5576';
