-- Add 'observations' column to patients table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'patients' AND column_name = 'observations') THEN
        ALTER TABLE public.patients ADD COLUMN observations text;
    END IF;
END $$;

-- Reload Schema Cache (This is handled automatically by Supabase Dashboard usually, but good to note)
NOTIFY pgrst, 'reload config';
