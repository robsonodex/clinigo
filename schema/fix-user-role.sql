-- 1. First, find your user ID by email (replace with your email)
-- SELECT id, email, role, clinic_id FROM public.users WHERE email = 'YOUR_EMAIL@HERE.COM';

-- 2. Update the user role to SUPER_ADMIN (or CLINIC_ADMIN)
-- Replace 'USER_ID_HERE' with the ID found above
-- UPDATE public.users 
-- SET role = 'SUPER_ADMIN' 
-- WHERE id = 'USER_ID_HERE';

-- SHORTCUT (if you are sure about the email):
UPDATE public.users 
SET role = 'SUPER_ADMIN' 
WHERE email = 'robsonfenriz@gmail.com'; -- Assuming this is your email based on history

-- Verify the change
SELECT id, email, role FROM public.users WHERE email = 'robsonfenriz@gmail.com';
