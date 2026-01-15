-- CliniGo - Demo User Verification Script
-- Execute in Supabase SQL Editor

-- 1. Check if demo user exists in auth.users
SELECT id, email, email_confirmed_at, created_at
FROM auth.users 
WHERE email = 'admin@demo.clinigo.app';

-- 2. Check if demo clinic exists
SELECT id, name, slug, plan_type, is_active
FROM clinics 
WHERE slug = 'demo-clinic' OR name ILIKE '%demo%';

-- 3. Check if demo user exists in public.users
SELECT u.id, u.email, u.full_name, u.role, u.clinic_id, c.name as clinic_name
FROM users u
LEFT JOIN clinics c ON u.clinic_id = c.id
WHERE u.email = 'admin@demo.clinigo.app';

-- ============================================
-- IF USER DOES NOT EXIST, RUN THE FOLLOWING:
-- ============================================

-- NOTE: The auth.users entry MUST be created via Supabase Dashboard
-- Go to: Dashboard > Authentication > Users > Add User
-- Email: admin@demo.clinigo.app
-- Password: Demo@2026

-- After creating in Dashboard, run this to ensure public.users entry:
/*
INSERT INTO users (id, email, full_name, role, clinic_id)
SELECT 
  id,
  'admin@demo.clinigo.app',
  'Admin Demo',
  'CLINIC_ADMIN',
  (SELECT id FROM clinics WHERE slug = 'demo-clinic' LIMIT 1)
FROM auth.users 
WHERE email = 'admin@demo.clinigo.app'
ON CONFLICT (id) DO UPDATE SET
  role = 'CLINIC_ADMIN',
  full_name = 'Admin Demo',
  clinic_id = EXCLUDED.clinic_id;
*/

-- ============================================
-- VERIFY DEMO CLINIC EXISTS
-- ============================================

-- If no demo clinic exists, create one:
/*
INSERT INTO clinics (
  name, 
  slug, 
  plan_type, 
  is_active,
  is_trial,
  subscription_starts_at,
  subscription_ends_at
)
VALUES (
  'Clínica Demo',
  'demo-clinic',
  'PROFESSIONAL',
  true,
  false,
  NOW(),
  NOW() + INTERVAL '1 year'
)
ON CONFLICT (slug) DO NOTHING
RETURNING id, name, slug;
*/
