-- Migration: Adicionar coluna specialty na tabela session_evolutions
-- Para permitir que terapeutas com múltiplas especialidades identifiquem
-- qual especialidade foi aplicada em cada sessão.
-- Data: 2026-07-29
-- Solicitação: Jeferson (Espaço Incluir)

ALTER TABLE session_evolutions
ADD COLUMN IF NOT EXISTS specialty TEXT DEFAULT NULL;

-- Índice para consultas filtradas por especialidade
CREATE INDEX IF NOT EXISTS idx_session_evolutions_specialty 
ON session_evolutions(specialty) 
WHERE specialty IS NOT NULL;

-- Comentário
COMMENT ON COLUMN session_evolutions.specialty IS 'Especialidade exercida pelo profissional nesta sessão específica (ex: TO, Psicopedagogia). Útil para profissionais com múltiplas especialidades.';
