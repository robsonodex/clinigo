CREATE TABLE import_jobs (
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

CREATE INDEX idx_import_jobs_clinic ON import_jobs(clinic_id);
CREATE INDEX idx_import_jobs_status ON import_jobs(status);
CREATE INDEX idx_import_jobs_type ON import_jobs(clinic_id, import_type);

-- RLS
ALTER TABLE import_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own clinic imports" ON import_jobs
  FOR SELECT
  USING (clinic_id = (auth.jwt() -> 'app_metadata' ->> 'clinic_id')::uuid);

CREATE POLICY "Admins can manage imports" ON import_jobs
  FOR ALL
  USING (
    clinic_id = (auth.jwt() -> 'app_metadata' ->> 'clinic_id')::uuid
    AND auth.jwt() -> 'app_metadata' ->> 'role' IN ('CLINIC_ADMIN', 'SUPER_ADMIN')
  );

CREATE TABLE import_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  import_job_id UUID NOT NULL REFERENCES import_jobs(id) ON DELETE CASCADE,
  row_number INTEGER NOT NULL,
  action VARCHAR(50) NOT NULL, -- 'validated', 'imported', 'skipped', 'failed'
  entity_id UUID, -- ID da entidade criada (se sucesso)
  error_message TEXT,
  row_data JSONB, -- Dados originais da linha
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_import_logs_job ON import_logs(import_job_id);
