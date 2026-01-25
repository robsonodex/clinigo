-- Migration: Plan Management System
-- Data: 2026-01-24
-- Descrição: Sistema completo de gestão de planos com feature gates,
--            histórico de mudanças e tracking de uso

-- Habilitar extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- TABELA: FEATURES POR PLANO
-- ==========================================
-- Define quais features cada plano possui e seus limites

CREATE TABLE IF NOT EXISTS plan_features (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plan_type VARCHAR(20) NOT NULL,
  feature_key VARCHAR(50) NOT NULL,
  enabled BOOLEAN DEFAULT TRUE,
  limit_value INTEGER, -- NULL = ilimitado
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_plan_feature UNIQUE(plan_type, feature_key)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_plan_features_plan ON plan_features(plan_type);
CREATE INDEX IF NOT EXISTS idx_plan_features_key ON plan_features(feature_key);
CREATE INDEX IF NOT EXISTS idx_plan_features_enabled ON plan_features(enabled);

-- ==========================================
-- TABELA: HISTÓRICO DE MUDANÇAS DE PLANO
-- ==========================================
-- Registra todas as mudanças de plano (upgrade/downgrade)

CREATE TABLE IF NOT EXISTS clinic_plan_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  previous_plan VARCHAR(20),
  new_plan VARCHAR(20) NOT NULL,
  change_type VARCHAR(20) NOT NULL, -- UPGRADE, DOWNGRADE, RENEWAL
  change_method VARCHAR(20) NOT NULL, -- SELF_SERVICE, MANUAL_ADMIN, AUTOMATIC
  
  -- Quem fez a mudança
  changed_by_user_id UUID REFERENCES users(id), -- Se self-service
  changed_by_admin_id UUID, -- Se manual por super admin
  
  -- Motivo e justificativa
  reason TEXT,
  
  -- Impacto financeiro
  billing_impact DECIMAL(10,2), -- Diferença de preço mensal
  prorated_amount DECIMAL(10,2), -- Valor proporcional cobrado/creditado
  
  -- Datas
  effective_date TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_plan_history_clinic ON clinic_plan_history(clinic_id);
CREATE INDEX IF NOT EXISTS idx_plan_history_created ON clinic_plan_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_plan_history_change_type ON clinic_plan_history(change_type);
CREATE INDEX IF NOT EXISTS idx_plan_history_change_method ON clinic_plan_history(change_method);

-- ==========================================
-- TABELA: TRACKING DE USO DE FEATURES
-- ==========================================
-- Rastreia uso de features para analytics e limites

CREATE TABLE IF NOT EXISTS feature_usage_tracking (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  feature_key VARCHAR(50) NOT NULL,
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  metadata JSONB, -- Dados adicionais contextuais
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_feature_usage_clinic ON feature_usage_tracking(clinic_id);
CREATE INDEX IF NOT EXISTS idx_feature_usage_key ON feature_usage_tracking(feature_key);
CREATE INDEX IF NOT EXISTS idx_feature_usage_last_used ON feature_usage_tracking(last_used_at DESC);

-- ==========================================
-- TRIGGER: Auto-update updated_at
-- ==========================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_plan_features_updated_at
  BEFORE UPDATE ON plan_features
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_feature_usage_updated_at
  BEFORE UPDATE ON feature_usage_tracking
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- SEED DATA: FEATURES POR PLANO
-- ==========================================

-- STARTER (R$ 149/mês)
INSERT INTO plan_features (plan_type, feature_key, enabled, limit_value) VALUES
('STARTER', 'max_doctors', true, 1),
('STARTER', 'max_units', true, 1),
('STARTER', 'basic_scheduling', true, NULL),
('STARTER', 'basic_patients', true, NULL),
('STARTER', 'basic_medical_records', true, NULL),
('STARTER', 'tiss', false, NULL),
('STARTER', 'whatsapp_auto', false, NULL),
('STARTER', 'multi_unit', false, NULL),
('STARTER', 'marketplace', false, NULL),
('STARTER', 'crm', false, NULL),
('STARTER', 'api_access', false, NULL)
ON CONFLICT (plan_type, feature_key) DO NOTHING;

-- BASIC (R$ 299/mês)
INSERT INTO plan_features (plan_type, feature_key, enabled, limit_value) VALUES
('BASIC', 'max_doctors', true, 3),
('BASIC', 'max_units', true, 1),
('BASIC', 'basic_scheduling', true, NULL),
('BASIC', 'basic_patients', true, NULL),
('BASIC', 'basic_medical_records', true, NULL),
('BASIC', 'whatsapp_auto', true, NULL),
('BASIC', 'marketplace', true, NULL),
('BASIC', 'financial_basic', true, NULL),
('BASIC', 'tiss', false, NULL),
('BASIC', 'multi_unit', false, NULL),
('BASIC', 'crm', false, NULL),
('BASIC', 'api_access', false, NULL)
ON CONFLICT (plan_type, feature_key) DO NOTHING;

-- PROFESSIONAL (R$ 549/mês)
INSERT INTO plan_features (plan_type, feature_key, enabled, limit_value) VALUES
('PROFESSIONAL', 'max_doctors', true, 10),
('PROFESSIONAL', 'max_units', true, 3),
('PROFESSIONAL', 'basic_scheduling', true, NULL),
('PROFESSIONAL', 'basic_patients', true, NULL),
('PROFESSIONAL', 'basic_medical_records', true, NULL),
('PROFESSIONAL', 'whatsapp_auto', true, NULL),
('PROFESSIONAL', 'marketplace', true, NULL),
('PROFESSIONAL', 'financial_basic', true, NULL),
('PROFESSIONAL', 'tiss', true, NULL),
('PROFESSIONAL', 'multi_unit', true, NULL),
('PROFESSIONAL', 'crm', true, NULL),
('PROFESSIONAL', 'advanced_reports', true, NULL),
('PROFESSIONAL', 'telemedicine', true, NULL),
('PROFESSIONAL', 'api_access', false, NULL),
('PROFESSIONAL', 'sso', false, NULL)
ON CONFLICT (plan_type, feature_key) DO NOTHING;

-- ENTERPRISE (R$ 799+/mês)
INSERT INTO plan_features (plan_type, feature_key, enabled, limit_value) VALUES
('ENTERPRISE', 'max_doctors', true, 999999),
('ENTERPRISE', 'max_units', true, 999999),
('ENTERPRISE', 'basic_scheduling', true, NULL),
('ENTERPRISE', 'basic_patients', true, NULL),
('ENTERPRISE', 'basic_medical_records', true, NULL),
('ENTERPRISE', 'whatsapp_auto', true, NULL),
('ENTERPRISE', 'marketplace', true, NULL),
('ENTERPRISE', 'financial_basic', true, NULL),
('ENTERPRISE', 'tiss', true, NULL),
('ENTERPRISE', 'multi_unit', true, NULL),
('ENTERPRISE', 'crm', true, NULL),
('ENTERPRISE', 'advanced_reports', true, NULL),
('ENTERPRISE', 'telemedicine', true, NULL),
('ENTERPRISE', 'api_access', true, NULL),
('ENTERPRISE', 'sso', true, NULL),
('ENTERPRISE', 'white_label', true, NULL),
('ENTERPRISE', 'custom_integrations', true, NULL),
('ENTERPRISE', 'priority_support', true, NULL)
ON CONFLICT (plan_type, feature_key) DO NOTHING;

-- ==========================================
-- COMENTÁRIOS (Documentação)
-- ==========================================

COMMENT ON TABLE plan_features IS 'Define features e limites de cada plano';
COMMENT ON TABLE clinic_plan_history IS 'Histórico completo de mudanças de plano';
COMMENT ON TABLE feature_usage_tracking IS 'Tracking de uso de features para analytics';

COMMENT ON COLUMN plan_features.plan_type IS 'STARTER, BASIC, PROFESSIONAL, ENTERPRISE';
COMMENT ON COLUMN plan_features.limit_value IS 'Limite numérico. NULL = ilimitado';
COMMENT ON COLUMN clinic_plan_history.change_type IS 'UPGRADE, DOWNGRADE, RENEWAL';
COMMENT ON COLUMN clinic_plan_history.change_method IS 'SELF_SERVICE, MANUAL_ADMIN, AUTOMATIC';
COMMENT ON COLUMN clinic_plan_history.prorated_amount IS 'Valor proporcional cobrado na mudança';
