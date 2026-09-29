-- ==============================================================================
-- Migration: 20260929140000_tiss_batch_hash_tracking.sql
-- Descrição: Rastreabilidade do algoritmo e valor do Hash de XMLs gerados em lotes TISS
-- Idempotente e retrocompatível (campos nulos para lotes antigos)
-- ==============================================================================

DO $$
BEGIN
    -- 1. Coluna para o algoritmo utilizado na geração do hash do lote
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tiss_batches' AND column_name = 'hash_algorithm'
    ) THEN
        ALTER TABLE tiss_batches 
        ADD COLUMN hash_algorithm text DEFAULT 'LEGACY_SHA256_JSON';
        
        COMMENT ON COLUMN tiss_batches.hash_algorithm IS 'Algoritmo de cálculo de hash utilizado: LEGACY_SHA256_JSON (64 chars) ou OFFICIAL_TISS_MD5/SHA1 (32 chars)';
    END IF;

    -- 2. Coluna para o valor do hash gerado
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tiss_batches' AND column_name = 'hash_value'
    ) THEN
        ALTER TABLE tiss_batches 
        ADD COLUMN hash_value text;

        COMMENT ON COLUMN tiss_batches.hash_value IS 'Valor hexadecimal do hash calculado para o lote TISS';
    END IF;

    -- 3. Coluna para data/hora exata da geração do XML
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tiss_batches' AND column_name = 'xml_generated_at'
    ) THEN
        ALTER TABLE tiss_batches 
        ADD COLUMN xml_generated_at timestamptz;

        COMMENT ON COLUMN tiss_batches.xml_generated_at IS 'Timestamp UTC em que o arquivo XML foi gerado e persistido no lote';
    END IF;
END $$;
