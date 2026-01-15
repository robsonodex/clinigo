-- ==========================================
-- FIX RLS RECURSION (Stable Visibility)
-- ==========================================

-- 1. Helper function to get current user's clinic_id without RLS recursion
-- SECURITY DEFINER means it runs with permissions of creator (postgres/admin), bypassing RLS on public.users
CREATE OR REPLACE FUNCTION get_user_clinic_id()
RETURNS UUID AS $$
BEGIN
    RETURN (SELECT clinic_id FROM public.users WHERE id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Update Medical Records Policy to use SAFE function
DROP POLICY IF EXISTS "Users can view records from their clinic" ON medical_records;
CREATE POLICY "Users can view records from their clinic" ON medical_records
    FOR SELECT USING (
        clinic_id = get_user_clinic_id()
    );

-- 3. Update Appointments Policy to use SAFE function
DROP POLICY IF EXISTS "Users can view appointments from their clinic" ON appointments;
CREATE POLICY "Users can view appointments from their clinic" ON appointments
    FOR SELECT USING (
        clinic_id = get_user_clinic_id()
    );

-- 4. Ensure Insert/Update/Delete also use SAFE logic
DROP POLICY IF EXISTS "Authorized users can manage appointments" ON appointments;
CREATE POLICY "Authorized users can manage appointments" ON appointments
    FOR ALL USING (
        clinic_id = get_user_clinic_id()
    );

RAISE NOTICE 'RLS Policies updated to use SECURITY DEFINER function (Fixes 500 Recursion).';
