-- Migration: TISS - Sistema de Integração via Webservice
-- Data: 2026-01-24
-- Descrição: Cria tabelas para configuração e logging de webservices TISS
--            para integração com operadoras de saúde

-- Habilitar extensão UUID (se ainda não estiver habilitada)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
-- Extensão para criptografia (armazenar credenciais)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==========================================
-- CONFIGURAÇÕES DE WEBSERVICE
-- ==========================================
CREATE TABLE IF NOT EXISTS tiss_webservice_configs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  operator_id UUID REFERENCES health_insurances(id) ON DELETE SET NULL, -- Operadora (null = config genérica)
  
  -- Tipo de webservice
  webservice_type VARCHAR(10) NOT NULL CHECK (webservice_type IN ('SOAP', 'REST')),
  
  -- Endpoint e autenticação
  url TEXT NOT NULL, -- URL do webservice
  username VARCHAR(255), -- Username (opcional)
  password_encrypted TEXT, -- Senha criptografada com pgcrypto
  
  -- Certificado digital (A1/A3)
  certificate_encrypted TEXT, -- Certificado em Base64 criptografado
  certificate_password_encrypted TEXT, -- Senha do certificado (se houver)
  
  -- Configurações adicionais
  timeout_seconds INTEGER DEFAULT 30, -- Timeout em segundos
  retry_attempts INTEGER DEFAULT 3, -- Número de tentativas em caso de falha
  retry_delay_ms INTEGER DEFAULT 1000, -- Delay entre tentativas (ms)
  
  -- Headers customizados (JSON)
  custom_headers JSONB, -- Headers HTTP adicionais
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  last_test_at TIMESTAMP, -- Última vez que teste de conexão foi executado
  last_test_status VARCHAR(20), -- SUCCESS, FAILED
  
  -- Auditoria
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  
  -- Constraint: Apenas uma config ativa por operadora por clínica
  UNIQUE(clinic_id, operator_id, is_active)
);

-- Índices
CREATE INDEX idx_webservice_clinic ON tiss_webservice_configs(clinic_id);
CREATE INDEX idx_webservice_operator ON tiss_webservice_configs(operator_id);
CREATE INDEX idx_webservice_active ON tiss_webservice_configs(is_active) WHERE is_active = true;

-- ==========================================
-- LOGS DE COMUNICAÇÃO WEBSERVICE
-- ==========================================
CREATE TABLE IF NOT EXISTS tiss_webservice_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  config_id UUID REFERENCES tiss_webservice_configs(id) ON DELETE SET NULL,
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  
  -- Operação executada
  operation VARCHAR(50) NOT NULL, 
  -- Operações: enviar_lote, consultar_protocolo, baixar_retorno, enviar_autorizacao, test_connection
  
  -- Payloads (podem ser grandes, limitar a 50KB cada)
  request_payload TEXT, -- XML/JSON enviado (limitado)
  response_payload TEXT, -- XML/JSON recebido (limitado)
  
  -- Resultado HTTP
  status_code INTEGER, -- HTTP status code (200, 500, etc)
  response_time_ms INTEGER, -- Tempo de resposta em milissegundos
  
  -- Erro (se houver)
  error_message TEXT,
  error_type VARCHAR(50), -- TIMEOUT, NETWORK, SERVER_ERROR, VALIDATION_ERROR
  
  -- Dados adicionais
  protocol_number VARCHAR(20), -- Número de protocolo (se aplicável)
  batch_id UUID, -- ID do lote (se aplicável)
  
  -- Auditoria
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_webservice_logs_config ON tiss_webservice_logs(config_id);
CREATE INDEX idx_webservice_logs_clinic ON tiss_webservice_logs(clinic_id);
CREATE INDEX idx_webservice_logs_operation ON tiss_webservice_logs(operation);
CREATE INDEX idx_webservice_logs_created ON tiss_webservice_logs(created_at DESC);
CREATE INDEX idx_webservice_logs_status ON tiss_webservice_logs(status_code);

-- ==========================================
-- FUNÇÕES: Criptografia de Credenciais
-- ==========================================

-- Função para criptografar senha
CREATE OR REPLACE FUNCTION encrypt_credential(credential TEXT, key TEXT DEFAULT 'clinigo-tiss-key-2026')
RETURNS TEXT AS $$
BEGIN
  RETURN encode(pgp_sym_encrypt(credential, key), 'base64');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para descriptografar senha (uso interno apenas)
CREATE OR REPLACE FUNCTION decrypt_credential(encrypted_credential TEXT, key TEXT DEFAULT 'clinigo-tiss-key-2026')
RETURNS TEXT AS $$
BEGIN
  RETURN pgp_sym_decrypt(decode(encrypted_credential, 'base64'), key);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- TRIGGER: Auto-update updated_at
-- ==========================================
CREATE TRIGGER update_tiss_webservice_configs_updated_at 
  BEFORE UPDATE ON tiss_webservice_configs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- VIEW: Health Check de Webservices
-- ==========================================
CREATE OR REPLACE VIEW vw_webservice_health AS
SELECT 
  c.id AS config_id,
  c.clinic_id,
  c.operator_id,
  hi.name AS operator_name,
  c.webservice_type,
  c.url,
  c.is_active,
  c.last_test_at,
  c.last_test_status,
  (
    SELECT COUNT(*)::INTEGER 
    FROM tiss_webservice_logs l 
    WHERE l.config_id = c.id 
    AND l.created_at > NOW() - INTERVAL '24 hours'
  ) AS requests_last_24h,
  (
    SELECT COUNT(*)::INTEGER 
    FROM tiss_webservice_logs l 
    WHERE l.config_id = c.id 
    AND l.status_code >= 200 AND l.status_code < 300
    AND l.created_at > NOW() - INTERVAL '24 hours'
  ) AS successful_requests_last_24h,
  (
    SELECT AVG(response_time_ms)::INTEGER 
    FROM tiss_webservice_logs l 
    WHERE l.config_id = c.id 
    AND l.status_code >= 200 AND l.status_code < 300
    AND l.created_at > NOW() - INTERVAL '24 hours'
  ) AS avg_response_time_ms
FROM tiss_webservice_configs c
LEFT JOIN health_insurances hi ON hi.id = c.operator_id
WHERE c.is_active = true;

-- ==========================================
-- POLÍTICA DE RETENÇÃO: Auto-limpeza de logs antigos
-- ==========================================
-- Manter apenas logs dos últimos 90 dias
CREATE OR REPLACE FUNCTION cleanup_old_webservice_logs()
RETURNS void AS $$
BEGIN
  DELETE FROM tiss_webservice_logs 
  WHERE created_at < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- COMENTÁRIOS NAS TABELAS (Documentação)
-- ==========================================
COMMENT ON TABLE tiss_webservice_configs IS 'Configurações de webservices TISS por operadora';
COMMENT ON TABLE tiss_webservice_logs IS 'Logs de comunicação com webservices (retenção: 90 dias)';
COMMENT ON VIEW vw_webservice_health IS 'Health check e métricas de webservices ativos';

COMMENT ON COLUMN tiss_webservice_configs.webservice_type IS 'SOAP ou REST';
COMMENT ON COLUMN tiss_webservice_configs.password_encrypted IS 'Senha criptografada com pgcrypto';
COMMENT ON COLUMN tiss_webservice_configs.certificate_encrypted IS 'Certificado A1/A3 em Base64 criptografado';
COMMENT ON COLUMN tiss_webservice_configs.timeout_seconds IS 'Timeout para requisições (padrão: 30s)';
COMMENT ON COLUMN tiss_webservice_configs.retry_attempts IS 'Número de tentativas em caso de falha (padrão: 3)';
COMMENT ON COLUMN tiss_webservice_logs.operation IS 'enviar_lote, consultar_protocolo, baixar_retorno, enviar_autorizacao, test_connection';
COMMENT ON COLUMN tiss_webservice_logs.response_time_ms IS 'Tempo de resposta em milissegundos';
