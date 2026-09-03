-- Migration: 20260903173000_add_chamada_whatsapp_habilitada.sql
-- Descrição: Adiciona controle por clínica para notificação de chamada de paciente via WhatsApp

ALTER TABLE IF EXISTS clinics 
ADD COLUMN IF NOT EXISTS chamada_whatsapp_habilitada BOOLEAN DEFAULT FALSE NOT NULL;

-- Backfill obrigatório para dados existentes
UPDATE clinics 
SET chamada_whatsapp_habilitada = FALSE 
WHERE chamada_whatsapp_habilitada IS NULL;
