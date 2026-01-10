-- 1. Try deleting from auth.users (This is the Source of Truth)
-- Often configured to cascade to public.users
DELETE FROM auth.users 
WHERE id IN (
  '30f373fc-77d5-4503-a2d0-bb5abfe9551c',
  'e6e4ae32-942f-4306-9803-c78ab2e4e3d2',
  'f3e819dc-14a7-4b9f-8b16-1d6f11c376c4',
  'ff60ceed-f580-40d6-90e9-4b6d87181251'
);

-- 2. Explicitly delete from public.users if they still exist
-- (Useful if CASCADE is missing or if they are orphaned)
DELETE FROM public.users 
WHERE id IN (
  '30f373fc-77d5-4503-a2d0-bb5abfe9551c',
  'e6e4ae32-942f-4306-9803-c78ab2e4e3d2',
  'f3e819dc-14a7-4b9f-8b16-1d6f11c376c4',
  'ff60ceed-f580-40d6-90e9-4b6d87181251'
);
