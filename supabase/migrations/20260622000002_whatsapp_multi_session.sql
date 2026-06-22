-- =============================================
-- Migration: WhatsApp Multi-Sessão por Setor
-- Description: Permite múltiplas sessões WhatsApp por clínica (1 por setor)
-- Date: 2026-06-22
-- Solicitado por: Espaço Incluir (Jeferson)
-- =============================================

-- Adicionar coluna de setor na tabela whatsapp_sessions
ALTER TABLE whatsapp_sessions ADD COLUMN IF NOT EXISTS sector VARCHAR(50) DEFAULT 'default';

-- Remover constraint unique anterior (clinic_id) e criar nova (clinic_id + sector)
-- Primeiro, verificar se a constraint existe
DO $$
BEGIN
  -- Tentar dropar a constraint de unicidade em clinic_id
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'whatsapp_sessions_clinic_id_key'
  ) THEN
    ALTER TABLE whatsapp_sessions DROP CONSTRAINT whatsapp_sessions_clinic_id_key;
  END IF;
END $$;

-- Criar unique constraint composta: 1 sessão por clínica+setor
ALTER TABLE whatsapp_sessions DROP CONSTRAINT IF EXISTS whatsapp_sessions_clinic_sector_unique;
ALTER TABLE whatsapp_sessions ADD CONSTRAINT whatsapp_sessions_clinic_sector_unique UNIQUE (clinic_id, sector);

-- Índice para busca por setor
CREATE INDEX IF NOT EXISTS idx_whatsapp_sessions_sector ON whatsapp_sessions(sector);

COMMENT ON COLUMN whatsapp_sessions.sector IS 'Setor da clínica: default, recepcao, financeiro, comercial, etc.';
