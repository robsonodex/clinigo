-- =============================================
-- Migration: Document Categories - Saúde vs Administrativo
-- Description: Adiciona coluna doc_group para segregar documentos entre saúde e administrativo
-- Date: 2026-06-22
-- Solicitado por: Espaço Incluir (Jeferson)
-- =============================================

-- Grupo do documento: 'health' (saúde) ou 'admin' (administrativo)
ALTER TABLE patient_documents ADD COLUMN IF NOT EXISTS doc_group VARCHAR(20) DEFAULT 'admin';

-- Atualizar documentos existentes baseado no category/document_type atual
-- Saúde: exame, receita, laudo, encaminhamento, atestado
UPDATE patient_documents SET doc_group = 'health'
WHERE category IN ('EXAM', 'exam', 'PRESCRIPTION', 'prescription', 'report', 'referral', 'certificate')
   OR document_type IN ('EXAM', 'exam', 'PRESCRIPTION', 'prescription', 'report', 'referral', 'certificate');

-- Administrativo: convênio, consentimento, pessoal, outros
UPDATE patient_documents SET doc_group = 'admin'
WHERE category IN ('CONVENIO_CARD', 'CONSENT_TERM', 'consent', 'personal', 'OTHER', 'other')
   OR document_type IN ('CONVENIO_CARD', 'CONSENT_TERM', 'consent', 'personal', 'OTHER', 'other');

-- Índice para filtro por grupo
CREATE INDEX IF NOT EXISTS idx_patient_documents_doc_group ON patient_documents(doc_group);

COMMENT ON COLUMN patient_documents.doc_group IS 'Grupo do documento: health (saúde - visível para terapeutas) ou admin (administrativo - apenas recepção/admin)';
