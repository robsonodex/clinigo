-- ==============================================================================
-- MIGRATION: 20260903000000_chamada_painel_tv_setting.sql
-- DESCRIÇÃO: Adiciona configuração chamada_painel_tv_habilitada (default TRUE)
--            para controle do botão "Chamar" na Recepção integrado ao Painel de TV.
-- REGRAS:
--   1. Default TRUE para toda clínica presente (ex: Worldsensory) e futuras.
--   2. Exceção histórica: Espaço Incluir solicitou desativação do botão de chamada.
-- ==============================================================================

-- 1. Adiciona coluna na tabela clinics (usada pelo core de configurações e feature flags)
ALTER TABLE clinics 
ADD COLUMN IF NOT EXISTS chamada_painel_tv_habilitada BOOLEAN NOT NULL DEFAULT TRUE;

-- 2. Adiciona coluna na tabela clinic_settings se existir
DO $$
BEGIN
    IF EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'clinic_settings'
    ) THEN
        ALTER TABLE clinic_settings 
        ADD COLUMN IF NOT EXISTS chamada_painel_tv_habilitada BOOLEAN NOT NULL DEFAULT TRUE;
    END IF;
END $$;

-- 3. RASTRO HISTÓRICO DA EXCEÇÃO:
-- A clínica 'Espaço Incluir' (ID '5163c916-8b82-4d80-8a71-01726836ee46') solicitou 
-- a desativação do botão de chamada do painel de TV devido ao seu fluxo operacional 
-- que não utiliza chamada visual por TV na sala de espera.
UPDATE clinics 
SET chamada_painel_tv_habilitada = FALSE 
WHERE id = '5163c916-8b82-4d80-8a71-01726836ee46';

-- 4. Replica na clinic_settings se aplicável
DO $$
BEGIN
    IF EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'clinic_settings'
    ) THEN
        INSERT INTO clinic_settings (clinic_id, chamada_painel_tv_habilitada)
        VALUES ('5163c916-8b82-4d80-8a71-01726836ee46', FALSE)
        ON CONFLICT (clinic_id) DO UPDATE 
        SET chamada_painel_tv_habilitada = FALSE;
    END IF;
END $$;
