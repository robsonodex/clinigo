-- =============================================
-- Migration: Patient Documents
-- Description: Document storage for patients (without OCR)
-- Date: 2026-01-24
-- =============================================

-- Versão simplificada sem clinic_id (já executada com sucesso)
CREATE TABLE IF NOT EXISTS patient_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE NOT NULL,
  
  file_name VARCHAR(255) NOT NULL,
  file_url TEXT NOT NULL,
  file_type VARCHAR(100),
  file_size_bytes INTEGER,
  document_type VARCHAR(50) DEFAULT 'OTHER',
  
  uploaded_by UUID REFERENCES users(id),
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_patient_documents_patient ON patient_documents(patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_documents_type ON patient_documents(document_type);
CREATE INDEX IF NOT EXISTS idx_patient_documents_uploaded_at ON patient_documents(uploaded_at DESC);

-- Comments
COMMENT ON TABLE patient_documents IS 'Patient uploaded documents storage';
COMMENT ON COLUMN patient_documents.document_type IS 'CONVENIO_CARD, EXAM, CONSENT_TERM, PRESCRIPTION, OTHER';

-- RLS Policies
ALTER TABLE patient_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view documents" ON patient_documents;
CREATE POLICY "Authenticated users can view documents"
  ON patient_documents FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can upload documents" ON patient_documents;
CREATE POLICY "Authenticated users can upload documents"
  ON patient_documents FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can update documents" ON patient_documents;
CREATE POLICY "Authenticated users can update documents"
  ON patient_documents FOR UPDATE
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can delete documents" ON patient_documents;
CREATE POLICY "Authenticated users can delete documents"
  ON patient_documents FOR DELETE
  TO authenticated
  USING (true);

-- Trigger: Update updated_at
CREATE OR REPLACE FUNCTION update_patient_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_patient_documents_updated_at ON patient_documents;

CREATE TRIGGER trg_patient_documents_updated_at
  BEFORE UPDATE ON patient_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_patient_documents_updated_at();
