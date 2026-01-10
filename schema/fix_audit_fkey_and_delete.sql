-- 1. Drop the strict constraint that blocks deletion
ALTER TABLE public.audit_logs 
DROP CONSTRAINT IF EXISTS audit_logs_user_id_fkey;

-- 2. Modify user_id column to allow NULLs (if not already)
ALTER TABLE public.audit_logs 
ALTER COLUMN user_id DROP NOT NULL;

-- 3. Re-add the constraint with ON DELETE SET NULL
-- This ensures that when a user is deleted, their audit logs remain (but user_id becomes NULL)
ALTER TABLE public.audit_logs 
ADD CONSTRAINT audit_logs_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES public.users(id) 
ON DELETE SET NULL;

-- 4. Now, try deleting the users again
DELETE FROM auth.users 
WHERE id IN (
  '30f373fc-77d5-4503-a2d0-bb5abfe9551c',
  'e6e4ae32-942f-4306-9803-c78ab2e4e3d2',
  'f3e819dc-14a7-4b9f-8b16-1d6f11c376c4',
  'ff60ceed-f580-40d6-90e9-4b6d87181251'
);

DELETE FROM public.users 
WHERE id IN (
  '30f373fc-77d5-4503-a2d0-bb5abfe9551c',
  'e6e4ae32-942f-4306-9803-c78ab2e4e3d2',
  'f3e819dc-14a7-4b9f-8b16-1d6f11c376c4',
  'ff60ceed-f580-40d6-90e9-4b6d87181251'
);
