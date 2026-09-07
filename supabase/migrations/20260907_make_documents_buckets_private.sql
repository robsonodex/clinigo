-- ==============================================================================
-- Migration: 20260907_make_documents_buckets_private.sql
-- Descrição: Converte os buckets de documentos de pacientes, checkin e assets
--            em buckets 100% PRIVADOS para prevenir vazamento e acesso não-autorizado.
--            Revoga políticas públicas de leitura em storage.objects.
-- ==============================================================================

-- 1. Definir os buckets como PRIVADOS na tabela storage.buckets
UPDATE storage.buckets 
SET public = false 
WHERE id IN ('patient-documents', 'checkin-docs', 'clinic-assets');

-- 2. Revogar políticas de leitura pública irrestrita em storage.objects
DROP POLICY IF EXISTS "Allow public checkin document read" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read" ON storage.objects;

-- 3. Garantir políticas de leitura para usuários autenticados
DROP POLICY IF EXISTS "Allow authenticated read checkin-docs" ON storage.objects;
CREATE POLICY "Allow authenticated read checkin-docs"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'checkin-docs');

DROP POLICY IF EXISTS "Allow authenticated read clinic-assets" ON storage.objects;
CREATE POLICY "Allow authenticated read clinic-assets"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'clinic-assets');

-- 4. Assegurar que patient-documents tenha política de leitura autenticada
DROP POLICY IF EXISTS "Allow authenticated read patient-documents" ON storage.objects;
CREATE POLICY "Allow authenticated read patient-documents"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'patient-documents');
