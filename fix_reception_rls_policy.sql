-- Fix RLS policy to allow reception to update appointment status to IN_PROGRESS
-- Execute this in Supabase SQL Editor

-- Drop existing policy if needed
DROP POLICY IF EXISTS "Reception can update appointment status" ON appointments;

-- Create policy allowing users to update appointments from their clinic
CREATE POLICY "Reception can update appointment status" ON appointments
FOR UPDATE
USING (
    clinic_id IN (
        SELECT clinic_id 
        FROM users 
        WHERE id = auth.uid()
    )
)
WITH CHECK (
    clinic_id IN (
        SELECT clinic_id 
        FROM users 
        WHERE id = auth.uid()
    )
);

-- Verify policy was created
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies 
WHERE tablename = 'appointments' 
  AND policyname = 'Reception can update appointment status';
