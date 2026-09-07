-- Migration: 20260906_make_biometric_photos_bucket_public.sql
-- Descrição: Define o bucket biometric-photos como público e adiciona política de leitura pública para permitir exibição de miniaturas nas tags <img> dos prontuários e check-in facial.

UPDATE storage.buckets 
SET public = true 
WHERE id = 'biometric-photos';

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname = 'Public read biometric photos'
    ) THEN
        CREATE POLICY "Public read biometric photos" ON storage.objects
            FOR SELECT TO public USING (
                bucket_id = 'biometric-photos'
            );
    END IF;
END $$;
