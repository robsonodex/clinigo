-- Test if the appointment can be updated to IN_PROGRESS
-- Execute this in Supabase SQL Editor

-- 1. Check current status
SELECT 
    id,
    status,
    patient_id,
    clinic_id
FROM appointments 
WHERE id = '8338ec19-0f6c-413c-9bec-3080881b5576';

-- 2. Try to update (this will fail if RLS blocks it)
UPDATE appointments 
SET status = 'IN_PROGRESS'
WHERE id = '8338ec19-0f6c-413c-9bec-3080881b5576';

-- 3. Check if updated
SELECT 
    id,
    status,
    patient_id,
    clinic_id
FROM appointments 
WHERE id = '8338ec19-0f6c-413c-9bec-3080881b5576';
