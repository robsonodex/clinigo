-- Create storage bucket for documents (import files, etc.)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('documents', 'documents', false, 52428800, ARRAY['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel', 'text/csv', 'application/xml', 'text/xml'])
ON CONFLICT (id) DO NOTHING;

-- Storage policies for documents bucket
DROP POLICY IF EXISTS "Authenticated users can upload documents" ON storage.objects;
CREATE POLICY "Authenticated users can upload documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'documents');

DROP POLICY IF EXISTS "Authenticated users can view own clinic documents" ON storage.objects;
CREATE POLICY "Authenticated users can view own clinic documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'documents' AND
  (storage.foldername(name))[2] = (
    SELECT clinic_id::text FROM public.users WHERE id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Authenticated users can delete own clinic documents" ON storage.objects;
CREATE POLICY "Authenticated users can delete own clinic documents"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'documents' AND
  (storage.foldername(name))[2] = (
    SELECT clinic_id::text FROM public.users WHERE id = auth.uid()
  )
);

-- Create import_jobs table
CREATE TABLE IF NOT EXISTS import_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  import_type VARCHAR(50) NOT NULL, -- 'patients', 'doctors', 'insurances', 'financial', 'appointments'
  status VARCHAR(50) NOT NULL DEFAULT 'pending', -- 'pending', 'validating', 'processing', 'completed', 'failed', 'partial'
  file_url TEXT NOT NULL, -- URL no Supabase Storage
  total_rows INTEGER DEFAULT 0,
  processed_rows INTEGER DEFAULT 0,
  successful_rows INTEGER DEFAULT 0,
  failed_rows INTEGER DEFAULT 0,
  validation_errors JSONB DEFAULT '[]'::jsonb,
  processing_errors JSONB DEFAULT '[]'::jsonb,
  field_mapping JSONB DEFAULT '{}'::jsonb, -- De-Para configurado pelo usuário
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_import_jobs_clinic ON import_jobs(clinic_id);
CREATE INDEX IF NOT EXISTS idx_import_jobs_status ON import_jobs(status);
CREATE INDEX IF NOT EXISTS idx_import_jobs_type ON import_jobs(clinic_id, import_type);

-- RLS
ALTER TABLE import_jobs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own clinic imports" ON import_jobs;
DROP POLICY IF EXISTS "Admins can manage imports" ON import_jobs;
DROP POLICY IF EXISTS "Users can select own clinic imports" ON import_jobs;
DROP POLICY IF EXISTS "Admins can insert imports" ON import_jobs;
DROP POLICY IF EXISTS "Admins can update imports" ON import_jobs;
DROP POLICY IF EXISTS "Admins can delete imports" ON import_jobs;

-- Policy for SELECT: Users can view their clinic's imports
CREATE POLICY "Users can select own clinic imports" ON import_jobs
  FOR SELECT
  USING (
    clinic_id IN (SELECT clinic_id FROM public.users WHERE id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'SUPER_ADMIN')
  );

-- Policy for INSERT: Admins can create imports
CREATE POLICY "Admins can insert imports" ON import_jobs
  FOR INSERT
  WITH CHECK (
    clinic_id IN (SELECT clinic_id FROM public.users WHERE id = auth.uid() AND role IN ('CLINIC_ADMIN', 'SUPER_ADMIN'))
  );

-- Policy for UPDATE: Admins can update their clinic's imports
CREATE POLICY "Admins can update imports" ON import_jobs
  FOR UPDATE
  USING (
    clinic_id IN (SELECT clinic_id FROM public.users WHERE id = auth.uid() AND role IN ('CLINIC_ADMIN', 'SUPER_ADMIN'))
  );

-- Policy for DELETE: Admins can delete their clinic's imports
CREATE POLICY "Admins can delete imports" ON import_jobs
  FOR DELETE
  USING (
    clinic_id IN (SELECT clinic_id FROM public.users WHERE id = auth.uid() AND role IN ('CLINIC_ADMIN', 'SUPER_ADMIN'))
  );

-- Create import_logs table
CREATE TABLE IF NOT EXISTS import_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  import_job_id UUID NOT NULL REFERENCES import_jobs(id) ON DELETE CASCADE,
  row_number INTEGER NOT NULL,
  action VARCHAR(50) NOT NULL, -- 'validated', 'imported', 'skipped', 'failed'
  entity_id UUID, -- ID da entidade criada (se sucesso)
  error_message TEXT,
  row_data JSONB, -- Dados originais da linha
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_import_logs_job ON import_logs(import_job_id);

