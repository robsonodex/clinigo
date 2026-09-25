-- Migration: 20260925164500_restore_clinic_assets_public_bucket.sql
-- Description: Restores clinic-assets storage bucket to public = true.
-- Clinic logos and visual brand identity are public institutional assets
-- required by booking pages, email headers, invoices, and UI navigation.

UPDATE storage.buckets
SET public = true
WHERE id = 'clinic-assets';

DROP POLICY IF EXISTS "Allow public read clinic-assets" ON storage.objects;
CREATE POLICY "Allow public read clinic-assets"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'clinic-assets');
