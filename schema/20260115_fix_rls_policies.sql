-- ==========================================
-- FIX RLS POLICIES (Medical Records & Appointments)
-- ==========================================

-- 1. ENABLE RLS
ALTER TABLE medical_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

-- 2. DROP EXISTING POLICIES (To avoid conflicts/duplication)
DROP POLICY IF EXISTS "Users can view records from their clinic" ON medical_records;
DROP POLICY IF EXISTS "Doctors can create records" ON medical_records;
DROP POLICY IF EXISTS "Doctors can update records" ON medical_records;
DROP POLICY IF EXISTS "Users can view appointments from their clinic" ON appointments;
DROP POLICY IF EXISTS "Doctors can create appointments" ON appointments;

-- 3. CREATE ALLOW-ALL POLICIES FOR DEMO SIMPLICITY (Or Correct Scoped Ones)

-- Medical Records: View based on Clinic ID mapping in JWT or Profile
CREATE POLICY "Users can view records from their clinic" ON medical_records
    FOR SELECT USING (
        clinic_id IN (
            SELECT clinic_id FROM public.users WHERE id = auth.uid()
        )
    );

-- Medical Records: Insert/Update (Doctors & Admins)
CREATE POLICY "Authorized users can create records" ON medical_records
    FOR INSERT WITH CHECK (
        auth.role() = 'authenticated' AND
        (
            EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('DOCTOR', 'CLINIC_ADMIN', 'SUPER_ADMIN'))
        )
    );

CREATE POLICY "Authorized users can update records" ON medical_records
    FOR UPDATE USING (
        auth.role() = 'authenticated' AND
        (
            EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('DOCTOR', 'CLINIC_ADMIN', 'SUPER_ADMIN'))
        )
    );

-- Appointments: View based on Clinic ID
CREATE POLICY "Users can view appointments from their clinic" ON appointments
    FOR SELECT USING (
        clinic_id IN (
            SELECT clinic_id FROM public.users WHERE id = auth.uid()
        )
    );

-- Appointments: Insert/Update
CREATE POLICY "Authorized users can manage appointments" ON appointments
    FOR ALL USING (
        auth.role() = 'authenticated'
    );

-- 4. GRANT PERMISSIONS (Just in case)
GRANT ALL ON medical_records TO authenticated;
GRANT ALL ON appointments TO authenticated;
GRANT ALL ON financial_entries TO authenticated;
