-- Migration: Resolve Duplicate Clinic Registration Conflicts
-- Description: Replaces strict UNIQUE constraints on clinics(slug) and clinics(cnpj) 
-- with Partial Unique Indexes that only apply when is_active = true.
-- This allows reuse of slugs and CNPJs after a clinic is deactivated/deleted.

-- Start transaction
BEGIN;

-- 1. Remove old constraints
-- Note: Supabase might name these differently, usually 'clinics_slug_key' and 'clinics_cnpj_key'
ALTER TABLE clinics DROP CONSTRAINT IF EXISTS clinics_slug_key;
ALTER TABLE clinics DROP CONSTRAINT IF EXISTS clinics_cnpj_key;

-- 2. Create Partial Unique Indexes
-- Allow multiple inactive clinics to have the same slug, but only one active one.
CREATE UNIQUE INDEX IF NOT EXISTS idx_clinics_slug_unique_active 
ON clinics(slug) 
WHERE (is_active = true);

-- Allow multiple inactive clinics to have the same CNPJ, but only one active one.
-- Also ensure CNPJ is not null for this index.
CREATE UNIQUE INDEX IF NOT EXISTS idx_clinics_cnpj_unique_active 
ON clinics(cnpj) 
WHERE (is_active = true AND cnpj IS NOT NULL);

-- 3. Update existing inactive clinics to have a unique-ish slug if they collide
-- (Optional but good for data integrity if many exist)
-- For now, we just rely on the fact that if we create a new one, the index won't block it 
-- because the old ones are is_active = false.

COMMIT;
