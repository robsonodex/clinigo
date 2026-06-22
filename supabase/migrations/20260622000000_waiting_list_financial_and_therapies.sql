-- =============================================
-- Migration: Waiting List - Campos Comercial/Financeiro
-- Description: Adiciona campos de terapias (JSONB), dados financeiros e responsável
-- Date: 2026-06-22
-- Solicitado por: Espaço Incluir (Jeferson)
-- =============================================

-- Coluna de responsável como campo próprio (antes era hackeada dentro de notes)
ALTER TABLE waiting_list ADD COLUMN IF NOT EXISTS responsible_name VARCHAR(255);

-- Array de terapias com quantidade [{name: "Fonoaudiologia", qty: 2}, ...]
ALTER TABLE waiting_list ADD COLUMN IF NOT EXISTS therapies JSONB DEFAULT '[]'::jsonb;

-- Campos financeiros
ALTER TABLE waiting_list ADD COLUMN IF NOT EXISTS financial_contact_date DATE;
ALTER TABLE waiting_list ADD COLUMN IF NOT EXISTS financial_result VARCHAR(50); -- 'converted', 'waiting_info', 'not_converted'
ALTER TABLE waiting_list ADD COLUMN IF NOT EXISTS financial_notes TEXT;

-- Observação comercial separada (antes tudo ficava em notes)
ALTER TABLE waiting_list ADD COLUMN IF NOT EXISTS commercial_notes TEXT;

-- Índice para consulta por resultado financeiro
CREATE INDEX IF NOT EXISTS idx_waiting_list_financial_result ON waiting_list(financial_result);

COMMENT ON COLUMN waiting_list.therapies IS 'Array JSONB de terapias solicitadas com quantidade: [{name: "Fono", qty: 2}]';
COMMENT ON COLUMN waiting_list.financial_result IS 'Resultado do contato financeiro: converted, waiting_info, not_converted';
COMMENT ON COLUMN waiting_list.financial_contact_date IS 'Data do contato financeiro';
