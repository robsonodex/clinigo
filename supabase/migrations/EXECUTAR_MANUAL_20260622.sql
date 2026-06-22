-- =============================================
-- MIGRATION CONSOLIDADA: Fila de Espera + Documentos
-- Execute este SQL no Supabase Dashboard → SQL Editor
-- Data: 2026-06-22
-- Solicitado por: Espaço Incluir (Jeferson)
-- =============================================

-- ======= PARTE 1: FILA DE ESPERA - Novos campos =======

-- Coluna de responsável como campo próprio
ALTER TABLE waiting_list ADD COLUMN IF NOT EXISTS responsible_name VARCHAR(255);

-- Array de terapias com quantidade [{name: "Fonoaudiologia", qty: 2}, ...]
ALTER TABLE waiting_list ADD COLUMN IF NOT EXISTS therapies JSONB DEFAULT '[]'::jsonb;

-- Campos financeiros
ALTER TABLE waiting_list ADD COLUMN IF NOT EXISTS financial_contact_date DATE;
ALTER TABLE waiting_list ADD COLUMN IF NOT EXISTS financial_result VARCHAR(50);
ALTER TABLE waiting_list ADD COLUMN IF NOT EXISTS financial_notes TEXT;

-- Observação comercial separada
ALTER TABLE waiting_list ADD COLUMN IF NOT EXISTS commercial_notes TEXT;

-- Índice para consulta por resultado financeiro
CREATE INDEX IF NOT EXISTS idx_waiting_list_financial_result ON waiting_list(financial_result);

-- ======= PARTE 2: DOCUMENTOS - Grupo Saúde/Administrativo =======

-- Grupo do documento: 'health' (saúde) ou 'admin' (administrativo)
ALTER TABLE patient_documents ADD COLUMN IF NOT EXISTS doc_group VARCHAR(20) DEFAULT 'admin';

-- Atualizar documentos existentes baseado no category
UPDATE patient_documents SET doc_group = 'health'
WHERE category IN ('EXAM', 'exam', 'PRESCRIPTION', 'prescription', 'report', 'referral', 'certificate');

UPDATE patient_documents SET doc_group = 'admin'
WHERE category IN ('CONVENIO_CARD', 'CONSENT_TERM', 'consent', 'personal', 'OTHER', 'other')
   OR doc_group IS NULL;

-- Índice para filtro por grupo
CREATE INDEX IF NOT EXISTS idx_patient_documents_doc_group ON patient_documents(doc_group);

-- ======= PRONTO! =======
-- Verifique executando:
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'waiting_list' ORDER BY ordinal_position;
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'patient_documents' ORDER BY ordinal_position;
