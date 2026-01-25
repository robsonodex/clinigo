-- Migration: TISS - Sistema de Solicitação de Autorização
-- Data: 2026-01-24
-- Descrição: Cria tabelas para gerenciar solicitações de autorização (guias SP/SADT)
--            conforme padrão TISS 3.05.00 ANS

-- Habilitar extensão UUID (se ainda não estiver habilitada)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- SOLICITAÇÕES DE AUTORIZAÇÃO
-- ==========================================
CREATE TABLE IF NOT EXISTS tiss_authorization_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  health_insurance_id UUID NOT NULL REFERENCES health_insurances(id) ON DELETE CASCADE,
  
  -- Números de controle
  request_number VARCHAR(20) UNIQUE NOT NULL, -- Número da solicitação (gerado automaticamente)
  authorization_number VARCHAR(20), -- Número de autorização retornado pela operadora
  
  -- Tipo e justificativa
  request_type VARCHAR(20) NOT NULL DEFAULT 'SP_SADT', -- SP_SADT, INTERNACAO, CONSULTA
  clinical_indication TEXT NOT NULL, -- Justificativa clínica (obrigatória ANS)
  
  -- Status do fluxo
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING', 
  -- Status possíveis: PENDING, SENT, APPROVED, REJECTED, CANCELLED
  rejection_reason TEXT, -- Motivo da negação (se rejeitado)
  
  -- Datas de controle
  sent_at TIMESTAMP, -- Data de envio para operadora
  approved_at TIMESTAMP, -- Data de aprovação
  expires_at TIMESTAMP, -- Data de expiração da autorização
  
  -- Auditoria
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Índices para otimização
CREATE INDEX idx_auth_req_clinic ON tiss_authorization_requests(clinic_id);
CREATE INDEX idx_auth_req_status ON tiss_authorization_requests(status);
CREATE INDEX idx_auth_req_patient ON tiss_authorization_requests(patient_id);
CREATE INDEX idx_auth_req_health_insurance ON tiss_authorization_requests(health_insurance_id);
CREATE INDEX idx_auth_req_created ON tiss_authorization_requests(created_at DESC);
CREATE INDEX idx_auth_req_number ON tiss_authorization_requests(request_number);

-- ==========================================
-- PROCEDIMENTOS DA SOLICITAÇÃO
-- ==========================================
CREATE TABLE IF NOT EXISTS tiss_authorization_procedures (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  authorization_request_id UUID NOT NULL REFERENCES tiss_authorization_requests(id) ON DELETE CASCADE,
  
  -- Dados do procedimento (Tabela TUSS)
  procedure_code VARCHAR(10) NOT NULL, -- Código TUSS do procedimento
  procedure_description TEXT NOT NULL, -- Descrição do procedimento
  quantity INTEGER NOT NULL DEFAULT 1, -- Quantidade solicitada
  
  -- Auditoria
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_auth_proc_request ON tiss_authorization_procedures(authorization_request_id);

-- ==========================================
-- ANEXOS DA SOLICITAÇÃO
-- ==========================================
CREATE TABLE IF NOT EXISTS tiss_authorization_attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  authorization_request_id UUID NOT NULL REFERENCES tiss_authorization_requests(id) ON DELETE CASCADE,
  
  -- Dados do arquivo (Supabase Storage)
  file_name VARCHAR(255) NOT NULL,
  file_url TEXT NOT NULL, -- URL do Supabase Storage
  file_type VARCHAR(50), -- pdf, jpg, png, dicom
  file_size INTEGER, -- Tamanho em bytes
  
  -- Auditoria
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_auth_attach_request ON tiss_authorization_attachments(authorization_request_id);

-- ==========================================
-- FUNÇÃO: Auto-update updated_at
-- ==========================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para auto-atualizar updated_at
CREATE TRIGGER update_tiss_authorization_requests_updated_at 
  BEFORE UPDATE ON tiss_authorization_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- COMENTÁRIOS NAS TABELAS (Documentação)
-- ==========================================
COMMENT ON TABLE tiss_authorization_requests IS 'Solicitações de autorização TISS (SP/SADT) conforme padrão ANS 3.05.00';
COMMENT ON TABLE tiss_authorization_procedures IS 'Procedimentos solicitados em cada autorização';
COMMENT ON TABLE tiss_authorization_attachments IS 'Anexos da solicitação (laudos, exames, documentos)';

COMMENT ON COLUMN tiss_authorization_requests.request_number IS 'Número único da solicitação (gerado automaticamente)';
COMMENT ON COLUMN tiss_authorization_requests.authorization_number IS 'Número de autorização retornado pela operadora';
COMMENT ON COLUMN tiss_authorization_requests.clinical_indication IS 'Justificativa clínica obrigatória (min 50 caracteres)';
COMMENT ON COLUMN tiss_authorization_requests.status IS 'PENDING, SENT, APPROVED, REJECTED, CANCELLED';
