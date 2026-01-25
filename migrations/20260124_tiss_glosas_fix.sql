-- Migration: TISS - Sistema de Gestão de Glosas (FIX)
-- Data: 2026-01-24
-- Descrição: Correção - Drop e recria tabelas para resolver conflitos de schema

-- Habilitar extensão UUID (se ainda não estiver habilitada)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- DROP TABELAS EXISTENTES (se houver)
-- ==========================================
DROP VIEW IF EXISTS vw_glosa_metrics CASCADE;
DROP TABLE IF EXISTS tiss_glosa_contest_attachments CASCADE;
DROP TABLE IF EXISTS tiss_glosa_contests CASCADE;
DROP TABLE IF EXISTS tiss_glosas CASCADE;

-- ==========================================
-- GLOSAS RECEBIDAS
-- ==========================================
CREATE TABLE tiss_glosas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  guide_id UUID REFERENCES tiss_guides(id) ON DELETE SET NULL,
  batch_id UUID REFERENCES tiss_batches(id) ON DELETE SET NULL,
  
  -- Dados da glosa
  glosa_code VARCHAR(10) NOT NULL,
  glosa_description TEXT NOT NULL,
  glosa_value DECIMAL(10,2) NOT NULL,
  
  -- Informações adicionais
  guide_number VARCHAR(20),
  operator_note TEXT,
  
  -- Controle de datas
  received_at DATE NOT NULL,
  
  -- Auditoria
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_glosas_clinic ON tiss_glosas(clinic_id);
CREATE INDEX idx_glosas_received ON tiss_glosas(received_at DESC);
CREATE INDEX idx_glosas_guide ON tiss_glosas(guide_id);
CREATE INDEX idx_glosas_batch ON tiss_glosas(batch_id);
CREATE INDEX idx_glosas_code ON tiss_glosas(glosa_code);

-- ==========================================
-- CONTESTAÇÕES DE GLOSAS
-- ==========================================
CREATE TABLE tiss_glosa_contests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  glosa_id UUID NOT NULL REFERENCES tiss_glosas(id) ON DELETE CASCADE,
  
  contest_reason TEXT NOT NULL,
  contest_protocol VARCHAR(20),
  contest_status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  
  response_text TEXT,
  approved_value DECIMAL(10,2),
  
  submitted_at TIMESTAMP,
  responded_at TIMESTAMP,
  
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_contests_glosa ON tiss_glosa_contests(glosa_id);
CREATE INDEX idx_contests_status ON tiss_glosa_contests(contest_status);
CREATE INDEX idx_contests_submitted ON tiss_glosa_contests(submitted_at DESC);

-- ==========================================
-- ANEXOS DE CONTESTAÇÃO
-- ==========================================
CREATE TABLE tiss_glosa_contest_attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contest_id UUID NOT NULL REFERENCES tiss_glosa_contests(id) ON DELETE CASCADE,
  
  file_name VARCHAR(255) NOT NULL,
  file_url TEXT NOT NULL,
  file_type VARCHAR(50),
  file_size INTEGER,
  description TEXT,
  
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_contest_attach_contest ON tiss_glosa_contest_attachments(contest_id);

-- ==========================================
-- TRIGGERS
-- ==========================================
CREATE TRIGGER update_tiss_glosas_updated_at 
  BEFORE UPDATE ON tiss_glosas
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tiss_glosa_contests_updated_at 
  BEFORE UPDATE ON tiss_glosa_contests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- VIEW: Métricas de Glosas
-- ==========================================
CREATE OR REPLACE VIEW vw_glosa_metrics AS
SELECT 
  clinic_id,
  COUNT(*)::INTEGER AS total_glosas,
  SUM(glosa_value)::DECIMAL(10,2) AS total_value_glosado,
  COUNT(CASE WHEN EXISTS (
    SELECT 1 FROM tiss_glosa_contests c 
    WHERE c.glosa_id = tiss_glosas.id
  ) THEN 1 END)::INTEGER AS total_contestacoes,
  COUNT(CASE WHEN EXISTS (
    SELECT 1 FROM tiss_glosa_contests c 
    WHERE c.glosa_id = tiss_glosas.id 
    AND c.contest_status = 'APPROVED'
  ) THEN 1 END)::INTEGER AS contestacoes_aprovadas,
  ROUND(
    (COUNT(*)::DECIMAL / NULLIF(
      (SELECT COUNT(*) FROM tiss_guides g WHERE g.clinic_id = tiss_glosas.clinic_id), 
      0
    )) * 100, 
    2
  ) AS taxa_glosa_percent
FROM tiss_glosas
GROUP BY clinic_id;

-- ==========================================
-- COMENTÁRIOS
-- ==========================================
COMMENT ON TABLE tiss_glosas IS 'Glosas recebidas das operadoras de saúde';
COMMENT ON TABLE tiss_glosa_contests IS 'Contestações/Recursos de glosas';
COMMENT ON TABLE tiss_glosa_contest_attachments IS 'Documentação anexada às contestações';
COMMENT ON VIEW vw_glosa_metrics IS 'Métricas agregadas de glosas por clínica';

COMMENT ON COLUMN tiss_glosas.glosa_code IS 'Código do motivo da glosa (Tabela ANS 4.13)';
COMMENT ON COLUMN tiss_glosas.glosa_value IS 'Valor glosado em reais';
COMMENT ON COLUMN tiss_glosa_contests.contest_status IS 'PENDING, SENT, IN_ANALYSIS, APPROVED, REJECTED';
COMMENT ON COLUMN tiss_glosa_contests.approved_value IS 'Valor aprovado após contestação (se aprovação parcial)';
