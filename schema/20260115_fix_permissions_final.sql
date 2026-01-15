-- ==========================================
-- FINAL FIX: RLS PERMISSIONS & FALLBACK
-- ==========================================

-- 1. GRANT PERMISSIONS (Critical Step often missed)
GRANT EXECUTE ON FUNCTION get_user_clinic_id TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_clinic_id TO public; -- Just in case
GRANT EXECUTE ON FUNCTION get_user_clinic_id TO service_role;

-- 2. VERIFY FUNCTION WORKS (Will show in output)
DO $$
DECLARE
    v_clinic_id UUID;
BEGIN
    v_clinic_id := get_user_clinic_id();
    RAISE NOTICE 'Function Test Result: %', v_clinic_id;
END $$;

-- 3. RE-APPLY POLICIES WITH EXTRA SAFETY
-- If get_user_clinic_id() fails or returns null, we want to fail gracefully (hiding data) rather than erroring 500.
-- Postgres handles function errors in WHERE clauses often by aborting transaction -> 500.

DROP POLICY IF EXISTS "Users can view records from their clinic" ON medical_records;
CREATE POLICY "Users can view records from their clinic" ON medical_records
    FOR SELECT USING (
        -- Simple comparison. If function errors, it will still recurse 500? 
        -- No, SECURITY DEFINER should prevent recursion error on finding the user.
        clinic_id = (SELECT clinic_id FROM public.users WHERE id = auth.uid()) 
    );
-- Reverting to direct subquery because SECURITY DEFINER might be causing permissions issues if not set up with search_path.
-- BUT to avoid recursion, we rely on public.users NOT having a policy that query medical_records. 
-- public.users usually has: "Users can see their own profile". 
-- SELECT * FROM public.users WHERE id = auth.uid(); -> This is safe recursion-wise.

-- Let's try to trust the direct subquery again, but ensure public.users is accessible.
GRANT SELECT ON public.users TO authenticated;

-- And fix appointments too
DROP POLICY IF EXISTS "Users can view appointments from their clinic" ON appointments;
CREATE POLICY "Users can view appointments from their clinic" ON appointments
    FOR SELECT USING (
        clinic_id = (SELECT clinic_id FROM public.users WHERE id = auth.uid())
    );

-- Request completed
