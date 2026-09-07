-- Migration: 20260906_storage_biometric_photos_policies.sql
-- Descrição: Adiciona políticas de INSERT e UPDATE no bucket biometric-photos para membros autenticados da clínica

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname = 'Clinic members can upload biometric photos'
    ) THEN
        CREATE POLICY "Clinic members can upload biometric photos" ON storage.objects
            FOR INSERT TO authenticated WITH CHECK (
                bucket_id = 'biometric-photos' AND
                (storage.foldername(name))[1] IN (
                    SELECT users.clinic_id::text FROM users WHERE users.id = auth.uid()
                )
            );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname = 'Clinic members can update biometric photos'
    ) THEN
        CREATE POLICY "Clinic members can update biometric photos" ON storage.objects
            FOR UPDATE TO authenticated USING (
                bucket_id = 'biometric-photos' AND
                (storage.foldername(name))[1] IN (
                    SELECT users.clinic_id::text FROM users WHERE users.id = auth.uid()
                )
            );
    END IF;
END $$;
