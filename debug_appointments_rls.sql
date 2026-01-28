-- Check all RLS policies on appointments table
-- Execute this in Supabase SQL Editor to see what's blocking

-- 1. List ALL policies on appointments
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,  -- USING clause
    with_check  -- WITH CHECK clause
FROM pg_policies 
WHERE tablename = 'appointments'
ORDER BY cmd, policyname;

-- 2. Check if RLS is enabled
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename = 'appointments';

-- 3. Test if current user can update (run this after above queries)
-- Replace the appointment_id with a real one
SELECT 
    a.id,
    a.status,
    a.clinic_id,
    u.clinic_id as user_clinic_id,
    (a.clinic_id = u.clinic_id) as clinic_match
FROM appointments a
CROSS JOIN users u
WHERE a.id = '8338ec19-0f6c-413c-9bec-3080881b5576'
  AND u.id = auth.uid();
