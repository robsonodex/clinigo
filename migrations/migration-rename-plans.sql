-- Migration: Rename Plan Types
-- STARTER -> BASICO, BASIC -> AVANCADO
-- Run this in order - each step depends on the previous

-- STEP 1: Add new ENUM values (if they don't exist)
-- PostgreSQL requires adding values to existing ENUMs

ALTER TYPE plan_type ADD VALUE IF NOT EXISTS 'BASICO';
ALTER TYPE plan_type ADD VALUE IF NOT EXISTS 'AVANCADO';

-- IMPORTANT: After running STEP 1, you need to COMMIT and then run STEP 2 in a new transaction
-- PostgreSQL doesn't allow using new ENUM values in the same transaction they were added

-- STEP 2: Update existing clinics (run in a separate query after STEP 1 commits)
-- UPDATE clinics SET plan_type = 'BASICO' WHERE plan_type = 'STARTER';
-- UPDATE clinics SET plan_type = 'AVANCADO' WHERE plan_type = 'BASIC';
-- UPDATE clinics SET plan_type = 'ENTERPRISE' WHERE plan_type = 'NETWORK';

-- STEP 3: Verification query
-- SELECT plan_type, COUNT(*) as count FROM clinics GROUP BY plan_type ORDER BY plan_type;
