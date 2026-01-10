-- 1. Check entries in the DOCTORS table (Visual details)
SELECT * FROM public.doctors WHERE clinic_id = 'd402f86d-7d5e-489c-923e-1bfbfa1c30e6';

-- 2. Check entries in the USERS table (Auth details)
SELECT id, full_name, email, role, clinic_id, created_at
FROM public.users
WHERE clinic_id = 'd402f86d-7d5e-489c-923e-1bfbfa1c30e6' AND role = 'DOCTOR';
