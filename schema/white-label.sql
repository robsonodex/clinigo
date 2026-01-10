-- Add White-Label columns to clinics table (Idempotent)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clinics' AND column_name = 'logo_url') THEN
        ALTER TABLE public.clinics ADD COLUMN logo_url text;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clinics' AND column_name = 'primary_color') THEN
        ALTER TABLE public.clinics ADD COLUMN primary_color text DEFAULT '#10b981';
    END IF;
END $$;

-- Create storage bucket for clinic assets
INSERT INTO storage.buckets (id, name, public)
VALUES ('clinic-assets', 'clinic-assets', true)
ON CONFLICT (id) DO NOTHING;

-- RLS Policies for Storage
-- We drop existing policies first to ensure we can re-run this script without errors

DROP POLICY IF EXISTS "Allow authenticated upload" ON storage.objects;
CREATE POLICY "Allow authenticated upload"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'clinic-assets' AND
  (storage.foldername(name))[1] = (
    SELECT clinic_id::text 
    FROM public.users 
    WHERE id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Allow authenticated update/delete" ON storage.objects;
CREATE POLICY "Allow authenticated update/delete"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'clinic-assets' AND
  (storage.foldername(name))[1] = (
    SELECT clinic_id::text 
    FROM public.users 
    WHERE id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Allow authenticated delete" ON storage.objects;
CREATE POLICY "Allow authenticated delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'clinic-assets' AND
  (storage.foldername(name))[1] = (
    SELECT clinic_id::text 
    FROM public.users 
    WHERE id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Allow public read" ON storage.objects;
CREATE POLICY "Allow public read"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'clinic-assets');
