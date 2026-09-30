-- ==============================================================================
-- MIGRATION: 20260929160000_tiss_premium_hardening.sql
-- Descrição: Hardening de Numeração Atômica, Prevenção de Colisão e Segurança RPC (C1/C2)
--            1. Backfill dos contadores existentes baseado no maior número histórico
--            2. Função generate_tiss_guide_number atualizada:
--               - SECURITY DEFINER com search_path = public, pg_temp
--               - Validação de isolamento do usuário autenticado (auth.uid())
--               - Cálculo com GREATEST(contador, max_existente) + 1 sob lock
--               - Loop anti-colisão em caso de registros manuais ou duplicados
--               - GRANT EXECUTE para authenticated e service_role
--            3. Índice único parcial por clínica e número de guia ativa
-- Data: 29/09/2026
-- Idempotente (IF NOT EXISTS), sem DROP de dados.
-- Como reverter: Ver instruções no final do arquivo (-- ROLLBACK:).
-- ==============================================================================

-- 1. Backfill dos Contadores para Clínicas com Guias Pré-existentes (C1)
INSERT INTO tiss_guide_counters (clinic_id, year, current_value, updated_at)
SELECT 
    clinic_id,
    COALESCE(EXTRACT(YEAR FROM created_at)::INT, EXTRACT(YEAR FROM CURRENT_DATE)::INT) AS year,
    MAX(
        CASE 
            WHEN guide_number ~ '^[0-9]+$' AND LENGTH(guide_number) >= 10 
            THEN SUBSTRING(guide_number FROM 5)::INT 
            ELSE 0 
        END
    ) AS current_value,
    NOW()
FROM tiss_guides
WHERE clinic_id IS NOT NULL
GROUP BY clinic_id, COALESCE(EXTRACT(YEAR FROM created_at)::INT, EXTRACT(YEAR FROM CURRENT_DATE)::INT)
ON CONFLICT (clinic_id, year) DO UPDATE
SET current_value = GREATEST(tiss_guide_counters.current_value, EXCLUDED.current_value),
    updated_at = NOW();

-- 2. Atualização da Função generate_tiss_guide_number com Hardening (C1 e C2)
CREATE OR REPLACE FUNCTION generate_tiss_guide_number(p_clinic_id UUID, p_year INT)
RETURNS TEXT 
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_auth_uid UUID := auth.uid();
    v_user_clinic_id UUID;
    v_curr_val INT := 0;
    v_max_existing INT := 0;
    v_next_val INT;
    v_year_str TEXT := p_year::TEXT;
    v_formatted_num TEXT;
BEGIN
    -- 2.1 Validação de Isolamento para Usuários Autenticados (C2)
    IF v_auth_uid IS NOT NULL THEN
        SELECT clinic_id INTO v_user_clinic_id
        FROM users
        WHERE id = v_auth_uid;

        IF v_user_clinic_id IS NOT NULL AND v_user_clinic_id <> p_clinic_id THEN
            RAISE EXCEPTION 'Acesso negado: o usuário não pertence à clínica informada.'
            USING ERRCODE = '42501'; -- insufficient_privilege
        END IF;
    END IF;

    -- 2.2 Bloqueio de Linha Concorrente na Clínica/Ano (FOR UPDATE)
    SELECT current_value INTO v_curr_val
    FROM tiss_guide_counters
    WHERE clinic_id = p_clinic_id AND year = p_year
    FOR UPDATE;

    -- 2.3 Identificar o maior número já existente em tiss_guides para o ano/clínica
    SELECT COALESCE(
        MAX(
            CASE 
                WHEN guide_number ~ ('^' || v_year_str || '[0-9]{1,}$')
                THEN SUBSTRING(guide_number FROM (LENGTH(v_year_str) + 1))::INT
                ELSE 0 
            END
        ), 0
    ) INTO v_max_existing
    FROM tiss_guides
    WHERE clinic_id = p_clinic_id 
      AND (
          guide_number LIKE (v_year_str || '%')
          OR (created_at >= MAKE_DATE(p_year, 1, 1)::TIMESTAMP WITH TIME ZONE 
              AND created_at < MAKE_DATE(p_year + 1, 1, 1)::TIMESTAMP WITH TIME ZONE)
      );

    -- 2.4 Calcular próximo valor: GREATEST entre o contador e o maior histórico + 1 (C1)
    v_next_val := GREATEST(COALESCE(v_curr_val, 0), v_max_existing) + 1;

    -- 2.5 Loop de Garantia Anti-Colisão (caso haja numerações esparsas manuais)
    LOOP
        v_formatted_num := v_year_str || LPAD(v_next_val::TEXT, 6, '0');
        
        EXIT WHEN NOT EXISTS (
            SELECT 1 FROM tiss_guides 
            WHERE clinic_id = p_clinic_id 
              AND guide_number = v_formatted_num
        );
        
        v_next_val := v_next_val + 1;
    END LOOP;

    -- 2.6 Persistir o novo valor atômico no contador sob lock
    INSERT INTO tiss_guide_counters (clinic_id, year, current_value, updated_at)
    VALUES (p_clinic_id, p_year, v_next_val, NOW())
    ON CONFLICT (clinic_id, year) DO UPDATE
    SET current_value = v_next_val,
        updated_at = NOW();

    RETURN v_formatted_num;
END;
$$ LANGUAGE plpgsql;

-- 3. Grants de Execução para Usuários Autenticados e Service Role (C2)
GRANT EXECUTE ON FUNCTION generate_tiss_guide_number(UUID, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION generate_tiss_guide_number(UUID, INT) TO service_role;

-- 4. Índice Único Condicional para Blindagem contra Duplicidade Ativa (C1)
CREATE UNIQUE INDEX IF NOT EXISTS uq_tiss_guides_clinic_number 
ON tiss_guides(clinic_id, guide_number) 
WHERE guide_number IS NOT NULL AND deleted_at IS NULL;

-- ==============================================================================
-- ROLLBACK:
-- DROP INDEX IF EXISTS uq_tiss_guides_clinic_number;
-- REVOKE EXECUTE ON FUNCTION generate_tiss_guide_number(UUID, INT) FROM authenticated;
-- ==============================================================================
