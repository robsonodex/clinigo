-- Add 'addons' column to clinics table if it doesn't exist
ALTER TABLE public.clinics 
ADD COLUMN IF NOT EXISTS addons JSONB DEFAULT '{}'::jsonb;

-- Comment on column
COMMENT ON COLUMN public.clinics.addons IS 'Stores active addons for the clinic (e.g. { "extra_doctors": 2 })';
