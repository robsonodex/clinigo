-- 1. Check if the clinic exists (matches your log ID)
SELECT * FROM public.clinics WHERE id = 'd402f86d-7d5e-489c-923e-1bfbfa1c30e6';

-- 2. Check if the user is linked to it (matches your log ID)
SELECT id, email, role, clinic_id 
FROM public.users 
WHERE id = 'f3e819dc-14a7-4b9f-8b16-1d6f11c376c4';

-- 3. Check if there are any RLS policies blocking view (optional)
-- SELECT * FROM pg_policies WHERE tablename = 'clinics';
