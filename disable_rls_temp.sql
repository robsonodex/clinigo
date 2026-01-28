-- NUCLEAR OPTION: Temporarily disable RLS for appointments table to test
-- ⚠️ WARNING: Only use this for debugging! Re-enable RLS after testing!

-- Disable RLS temporarily
ALTER TABLE appointments DISABLE ROW LEVEL SECURITY;

-- After testing the "Chamar Paciente" button, re-enable it:
-- ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
