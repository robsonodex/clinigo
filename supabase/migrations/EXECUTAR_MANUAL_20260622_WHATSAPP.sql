-- =============================================
-- MIGRATION: WhatsApp Multi-Sessão por Setor
-- Execute este SQL no Supabase Dashboard → SQL Editor
-- Data: 2026-06-22
-- =============================================

-- Adicionar coluna de setor
ALTER TABLE whatsapp_sessions ADD COLUMN IF NOT EXISTS sector VARCHAR(50) DEFAULT 'default';

-- Remover constraint unique anterior (clinic_id) para permitir múltiplas sessões
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'whatsapp_sessions_clinic_id_key'
  ) THEN
    ALTER TABLE whatsapp_sessions DROP CONSTRAINT whatsapp_sessions_clinic_id_key;
  END IF;
END $$;

-- Nova constraint: 1 sessão por clínica+setor
ALTER TABLE whatsapp_sessions DROP CONSTRAINT IF EXISTS whatsapp_sessions_clinic_sector_unique;
ALTER TABLE whatsapp_sessions ADD CONSTRAINT whatsapp_sessions_clinic_sector_unique UNIQUE (clinic_id, sector);

-- Índice para busca
CREATE INDEX IF NOT EXISTS idx_whatsapp_sessions_sector ON whatsapp_sessions(sector);

-- Verificação:
-- SELECT clinic_id, sector, status, phone_number FROM whatsapp_sessions ORDER BY clinic_id, sector;
