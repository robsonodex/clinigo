-- URGENCE FIXES MIGRATION
-- 1. Fix RLS for doctors table to allow DOCTOR role (and CLINIC_ADMIN/SUPER_ADMIN)
DROP POLICY IF EXISTS "Admins can insert doctors" ON doctors;
DROP POLICY IF EXISTS "Clinic staff can manage doctors" ON doctors;

CREATE POLICY "Clinic staff can manage doctors"
ON doctors FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND (
      users.role IN ('SUPER_ADMIN', 'CLINIC_ADMIN') OR
      (users.role = 'DOCTOR' AND users.clinic_id = doctors.clinic_id)
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND (
      users.role IN ('SUPER_ADMIN', 'CLINIC_ADMIN') OR
      (users.role = 'DOCTOR' AND users.clinic_id = doctors.clinic_id)
    )
  )
);

-- 2. Add missing city column to patients table
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'patients' AND column_name = 'city') THEN
        ALTER TABLE patients ADD COLUMN city VARCHAR(100);
    END IF;
END $$;

-- 3. Add appointment_type to appointments if missing
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'appointments' AND column_name = 'appointment_type') THEN
        ALTER TABLE appointments ADD COLUMN appointment_type VARCHAR(20) DEFAULT 'online';
    END IF;
END $$;

-- 4. Reload schema cache
NOTIFY pgrst, 'reload schema';
