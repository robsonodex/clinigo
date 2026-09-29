-- Migration: RPC Atômica para Desfazimento de Retorno TISS e Constraint Parcial de Reimportação
-- Arquivo: supabase/migrations/20260929130000_tiss_undo_rpc_and_reimport.sql

-- 1. Adicionar coluna status em tiss_return_imports para permitir soft-delete
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tiss_return_imports' AND column_name = 'status'
    ) THEN
        ALTER TABLE tiss_return_imports ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'COMPLETED';
    END IF;
END $$;

-- 2. Atualizar constraint de unicidade para índice parcial (permite reimportar o mesmo arquivo após undo)
ALTER TABLE tiss_return_imports DROP CONSTRAINT IF EXISTS uq_tiss_return_file_hash;
DROP INDEX IF EXISTS uq_tiss_return_file_hash_active;

CREATE UNIQUE INDEX IF NOT EXISTS uq_tiss_return_file_hash_active 
ON tiss_return_imports (clinic_id, file_hash) 
WHERE status != 'CANCELLED';

-- 3. Função SQL Atômica (RPC): tiss_undo_return_import
CREATE OR REPLACE FUNCTION tiss_undo_return_import(
    p_return_or_batch_id UUID,
    p_clinic_id UUID,
    p_user_id UUID,
    p_user_name TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_return RECORD;
    v_batch_id UUID;
    v_batch_number TEXT;
    v_amount_to_reverse NUMERIC;
    v_active_appeals_count INT;
    v_locked_entries_count INT;
    v_month_ref TEXT;
BEGIN
    -- A. Buscar retorno
    SELECT * INTO v_return
    FROM tiss_returns
    WHERE (id = p_return_or_batch_id OR batch_id = p_return_or_batch_id)
      AND clinic_id = p_clinic_id
    ORDER BY created_at DESC
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Registro de retorno não encontrado para este lote');
    END IF;

    IF v_return.processing_status != 'COMPLETED' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Este retorno ainda não foi concluído ou já foi estornado');
    END IF;

    v_batch_id := v_return.batch_id;
    SELECT batch_number INTO v_batch_number FROM tiss_batches WHERE id = v_batch_id;

    -- B. BLOQUEIO 1: Recursos de glosa ativos ou deferidos
    SELECT COUNT(*) INTO v_active_appeals_count
    FROM tiss_glosas
    WHERE clinic_id = p_clinic_id
      AND batch_id = v_batch_id
      AND status IN ('IN_APPEAL', 'ACCEPTED');

    IF v_active_appeals_count > 0 THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', format('Operação bloqueada: existem %s guia(s) com recurso de glosa em andamento ou acatado neste lote.', v_active_appeals_count)
        );
    END IF;

    -- C. BLOQUEIO 2: Competência fechada ou lançamento financeiro já liquidado/conciliado
    SELECT COUNT(*) INTO v_locked_entries_count
    FROM financial_entries
    WHERE clinic_id = p_clinic_id
      AND (status IN ('CLOSED', 'CONCILIATED', 'SETTLED'))
      AND description ILIKE '%Lote TISS nº ' || v_batch_number || '%';

    IF v_locked_entries_count > 0 THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Operação bloqueada: a competência de repasse ou conciliação financeira deste lote já está fechada e liquidada.'
        );
    END IF;

    -- D. Estorno contábil (Soft-delete em financial_entries)
    UPDATE financial_entries
    SET status = 'CANCELLED',
        notes = format('Cancelado por desfazimento do Retorno TISS (Lote %s) por %s em %s', v_batch_number, p_user_name, NOW()::text)
    WHERE clinic_id = p_clinic_id
      AND description ILIKE '%Lote TISS nº ' || v_batch_number || '%';

    v_amount_to_reverse := COALESCE(v_return.amount_approved, 0);
    IF v_amount_to_reverse > 0 THEN
        INSERT INTO financial_entries (
            clinic_id, type, category, description, amount, status, payment_date, notes
        ) VALUES (
            p_clinic_id,
            'EXPENSE',
            'ESTORNO_CONVENIO',
            'Estorno Contábil - Retorno Lote TISS nº ' || v_batch_number,
            v_amount_to_reverse,
            'REVERSED',
            NOW(),
            format('Estorno transacional do retorno %s por %s', v_return.id, p_user_name)
        );
    END IF;

    -- E. Cancelar Glosas
    UPDATE tiss_glosas
    SET status = 'CANCELLED',
        notes = format('Glosa cancelada por desfazimento do retorno %s em %s', v_return.id, NOW()::text)
    WHERE clinic_id = p_clinic_id
      AND batch_id = v_batch_id;

    -- F. Restaurar status das guias para SENT
    UPDATE tiss_guides
    SET status = 'SENT',
        paid_value = NULL,
        glosa_value = 0,
        glosa_code = NULL,
        glosa_description = NULL
    WHERE clinic_id = p_clinic_id
      AND batch_id = v_batch_id;

    -- G. Restaurar lote para SENT
    UPDATE tiss_batches
    SET status = 'SENT',
        approved_value = 0,
        glosa_value = 0,
        return_processed_at = NULL
    WHERE id = v_batch_id;

    -- H. Inativar importação (status = 'CANCELLED') permitindo reimportar
    UPDATE tiss_return_imports
    SET status = 'CANCELLED'
    WHERE clinic_id = p_clinic_id
      AND batch_id = v_batch_id;

    -- I. Cancelar o registro de retorno
    UPDATE tiss_returns
    SET processing_status = 'CANCELLED',
        error_message = format('Retorno estornado manualmente por %s em %s', p_user_name, NOW()::text)
    WHERE id = v_return.id;

    -- J. Auditoria
    INSERT INTO audit_logs (user_id, action, entity_type, entity_id, metadata)
    VALUES (
        p_user_id,
        'TISS_RETURN_IMPORT_REVERSED',
        'tiss_return',
        v_return.id,
        jsonb_build_object(
            'batch_id', v_batch_id,
            'batch_number', v_batch_number,
            'amount_reversed', v_amount_to_reverse,
            'reversed_by', p_user_name,
            'timestamp', NOW()
        )
    );

    RETURN jsonb_build_object(
        'success', true,
        'message', format('Retorno do lote nº %s desfeito e estornado com sucesso atômico.', v_batch_number)
    );
END;
$$;

-- 4. Adicionar coluna tiss_hash_algorithm em clinics (Padrão de segurança: LEGACY_SHA256_JSON)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'clinics' AND column_name = 'tiss_hash_algorithm'
    ) THEN
        ALTER TABLE clinics ADD COLUMN tiss_hash_algorithm VARCHAR(30) NOT NULL DEFAULT 'LEGACY_SHA256_JSON';
    END IF;
END $$;
