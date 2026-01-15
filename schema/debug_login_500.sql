-- ==========================================
-- DIAGNOSE LOGIN 500 ERROR
-- ==========================================
-- Run this in Supabase SQL Editor to see what triggers are running on auth.users

SELECT 
    tgname as trigger_name,
    tgtype,
    proname as function_name,
    nspname as schema_name
FROM pg_trigger
JOIN pg_proc ON pg_trigger.tgfoid = pg_proc.oid
JOIN pg_namespace ON pg_proc.pronamespace = pg_namespace.oid
WHERE tgrelid = 'auth.users'::regclass;
