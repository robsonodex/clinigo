-- ==========================================
-- FIX LOGIN 500 ERROR (DROP BAD TRIGGER)
-- ==========================================
-- The trigger 'trigger_create_user_preferences' is failing and blocking login.
-- The application code (route.ts) already handles creating preferences if they don't exist.
-- Therefore, this trigger is redundant and safe to remove to restore access.

DROP TRIGGER IF EXISTS trigger_create_user_preferences ON auth.users;

-- Drop the function if it exists as well
DROP FUNCTION IF EXISTS public.create_default_user_preferences();
