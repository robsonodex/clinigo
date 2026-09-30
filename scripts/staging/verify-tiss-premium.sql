-- ==============================================================================
-- SCRIPT DE VERIFICAÇÃO PARA BANCO DE DADOS EM STAGING (SUPABASE SQL EDITOR)
-- FASE B1: FUNDAÇÃO DO FATURAMENTO PREMIUM TISS
-- Execução: Seguro e idempotente. Roda dentro de transação e finaliza em ROLLBACK.
-- Resiliência: Cada teste roda em sub-bloco protegido com captura de exceções.
-- ==============================================================================

BEGIN;

CREATE TEMP TABLE test_results (
    id SERIAL PRIMARY KEY,
    teste TEXT NOT NULL,
    status TEXT NOT NULL,
    detalhe TEXT NOT NULL
);
ALTER TABLE test_results ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
    v_count INT;
    v_missing_tables TEXT := '';
    v_missing_cols TEXT := '';
    v_num1 TEXT;
    v_num2 TEXT;
    v_counter_val INT;
    
    -- IDs de teste
    c_clinic_a UUID := '00000000-0000-0000-0000-0000000000a1';
    c_clinic_b UUID := '00000000-0000-0000-0000-0000000000b2';
    c_user_a   UUID := '00000000-0000-0000-0000-000000000aa1';
    c_user_b   UUID := '00000000-0000-0000-0000-000000000bb2';
    c_batch_a  UUID := '00000000-0000-0000-0000-00000000ba01';
BEGIN
    -- Obter clínicas existentes em staging ou criar temporariamente na transação para satisfazer FK
    SELECT id INTO c_clinic_a FROM clinics ORDER BY created_at ASC LIMIT 1;
    IF c_clinic_a IS NOT NULL THEN
        SELECT id INTO c_clinic_b FROM clinics WHERE id <> c_clinic_a ORDER BY created_at ASC LIMIT 1;
    END IF;

    IF c_clinic_a IS NULL THEN
        c_clinic_a := '00000000-0000-0000-0000-0000000000a1';
        INSERT INTO clinics (id, name, cnpj) 
        VALUES (c_clinic_a, 'Clinica Teste A', '00000000000191')
        ON CONFLICT (id) DO NOTHING;
    END IF;

    IF c_clinic_b IS NULL THEN
        c_clinic_b := '00000000-0000-0000-0000-0000000000b2';
        INSERT INTO clinics (id, name, cnpj) 
        VALUES (c_clinic_b, 'Clinica Teste B', '00000000000272')
        ON CONFLICT (id) DO NOTHING;
    END IF;
    -- -------------------------------------------------------------------------
    -- TESTE 1: Existência das Novas Tabelas (B1.5, L4, C9)
    -- -------------------------------------------------------------------------
    BEGIN
        SELECT COUNT(*) INTO v_count
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
          AND table_name IN (
              'tiss_guide_counters',
              'tiss_batch_xml_versions',
              'tiss_appeal_justification_templates'
          );

        IF v_count = 3 THEN
            INSERT INTO test_results (teste, status, detalhe) VALUES
            ('1. Tabelas da Fundação', 'PASS', 'As 3 novas tabelas existem no schema public');
        ELSE
            SELECT string_agg(t.tbl, ', ') INTO v_missing_tables
            FROM (
                SELECT unnest(ARRAY[
                    'tiss_guide_counters',
                    'tiss_batch_xml_versions',
                    'tiss_appeal_justification_templates'
                ]) AS tbl
            ) t
            WHERE NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = t.tbl AND table_schema = 'public');
            
            INSERT INTO test_results (teste, status, detalhe) VALUES
            ('1. Tabelas da Fundação', 'FAIL', 'Tabelas faltantes: ' || COALESCE(v_missing_tables, ''));
        END IF;
    EXCEPTION WHEN OTHERS THEN
        INSERT INTO test_results (teste, status, detalhe) VALUES
        ('1. Tabelas da Fundação', 'FAIL', 'Excecao ao verificar tabelas: ' || SQLERRM);
    END;

    -- -------------------------------------------------------------------------
    -- TESTE 2: Existência das Novas Colunas (Exclusão Lógica e Bloqueio Otimista)
    -- -------------------------------------------------------------------------
    BEGIN
        WITH required_cols AS (
            SELECT 'tiss_guides' AS tbl, 'deleted_at' AS col UNION ALL
            SELECT 'tiss_guides', 'version' UNION ALL
            SELECT 'tiss_batches', 'version' UNION ALL
            SELECT 'tiss_batches', 'closed_at' UNION ALL
            SELECT 'tiss_batches', 'checksum' UNION ALL
            SELECT 'tiss_glosa_contests', 'version' UNION ALL
            SELECT 'tiss_glosa_contests', 'deleted_at'
        )
        SELECT string_agg(rc.tbl || '.' || rc.col, ', ') INTO v_missing_cols
        FROM required_cols rc
        WHERE NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = rc.tbl AND column_name = rc.col AND table_schema = 'public'
        );

        IF v_missing_cols IS NULL OR v_missing_cols = '' THEN
            INSERT INTO test_results (teste, status, detalhe) VALUES
            ('2. Colunas de Versionamento e Exclusão', 'PASS', 'Todas as colunas de versionamento e soft delete estao presentes');
        ELSE
            INSERT INTO test_results (teste, status, detalhe) VALUES
            ('2. Colunas de Versionamento e Exclusão', 'FAIL', 'Colunas faltantes: ' || v_missing_cols);
        END IF;
    EXCEPTION WHEN OTHERS THEN
        INSERT INTO test_results (teste, status, detalhe) VALUES
        ('2. Colunas de Versionamento e Exclusão', 'FAIL', 'Excecao ao verificar colunas: ' || SQLERRM);
    END;

    -- -------------------------------------------------------------------------
    -- TESTE 3: Existência da Função Atômica generate_tiss_guide_number
    -- -------------------------------------------------------------------------
    BEGIN
        SELECT COUNT(*) INTO v_count
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public' AND p.proname = 'generate_tiss_guide_number';

        IF v_count >= 1 THEN
            INSERT INTO test_results (teste, status, detalhe) VALUES
            ('3. Função SQL Atômica', 'PASS', 'Função generate_tiss_guide_number registrada no schema public');
        ELSE
            INSERT INTO test_results (teste, status, detalhe) VALUES
            ('3. Função SQL Atômica', 'FAIL', 'Função generate_tiss_guide_number não encontrada');
        END IF;
    EXCEPTION WHEN OTHERS THEN
        INSERT INTO test_results (teste, status, detalhe) VALUES
        ('3. Função SQL Atômica', 'FAIL', 'Excecao ao verificar funcao: ' || SQLERRM);
    END;

    -- -------------------------------------------------------------------------
    -- TESTE 4: Teste Funcional da Numeração Atômica sob Lock (B1.5)
    -- -------------------------------------------------------------------------
    BEGIN
        -- Simulação: gerar 2 números sequenciais consecutivos para a clínica de teste A no ano 2026
        v_num1 := generate_tiss_guide_number(c_clinic_a, 2026);
        v_num2 := generate_tiss_guide_number(c_clinic_a, 2026);

        SELECT current_value INTO v_counter_val
        FROM tiss_guide_counters
        WHERE clinic_id = c_clinic_a AND year = 2026;

        IF v_num1 IS NOT NULL AND v_num2 IS NOT NULL 
           AND v_num1 <> v_num2 
           AND v_num1 LIKE '2026%' AND v_num2 LIKE '2026%' 
           AND v_counter_val >= 2 THEN
            INSERT INTO test_results (teste, status, detalhe) VALUES
            ('4. Incremento Atômico Sequencial', 'PASS', 'Gerados sequenciais validos: ' || v_num1 || ' -> ' || v_num2 || ' (Contador: ' || v_counter_val || ')');
        ELSE
            INSERT INTO test_results (teste, status, detalhe) VALUES
            ('4. Incremento Atômico Sequencial', 'FAIL', 'Falha na sequencia: num1=' || COALESCE(v_num1, 'NULL') || ', num2=' || COALESCE(v_num2, 'NULL'));
        END IF;
    EXCEPTION WHEN OTHERS THEN
        INSERT INTO test_results (teste, status, detalhe) VALUES
        ('4. Incremento Atômico Sequencial', 'FAIL', 'Excecao na execucao da funcao atomica: ' || SQLERRM);
    END;

    -- -------------------------------------------------------------------------
    -- TESTE 5: Isolamento de Contadores entre Clínicas Diferentes
    -- -------------------------------------------------------------------------
    BEGIN
        -- Gerar número para a clínica B no mesmo ano
        v_num1 := generate_tiss_guide_number(c_clinic_b, 2026);

        SELECT current_value INTO v_counter_val
        FROM tiss_guide_counters
        WHERE clinic_id = c_clinic_b AND year = 2026;

        IF v_counter_val = 1 AND v_num1 = '2026000001' THEN
            INSERT INTO test_results (teste, status, detalhe) VALUES
            ('5. Isolamento Multi-tenant do Contador', 'PASS', 'Contador da clínica B iniciou de forma independente em 1 (2026000001)');
        ELSE
            INSERT INTO test_results (teste, status, detalhe) VALUES
            ('5. Isolamento Multi-tenant do Contador', 'FAIL', 'Contador de clínica diferente interferiu: ' || COALESCE(v_num1, 'NULL'));
        END IF;
    EXCEPTION WHEN OTHERS THEN
        INSERT INTO test_results (teste, status, detalhe) VALUES
        ('5. Isolamento Multi-tenant do Contador', 'FAIL', 'Excecao no teste multi-tenant: ' || SQLERRM);
    END;

    -- -------------------------------------------------------------------------
    -- TESTE 6: Verificação de RLS nas Tabelas da Fundação
    -- -------------------------------------------------------------------------
    BEGIN
        WITH rls_tables AS (
            SELECT 'tiss_guide_counters' AS tbl UNION ALL
            SELECT 'tiss_batch_xml_versions' UNION ALL
            SELECT 'tiss_appeal_justification_templates'
        )
        SELECT string_agg(rt.tbl, ', ') INTO v_missing_tables
        FROM rls_tables rt
        JOIN pg_class c ON c.relname = rt.tbl
        JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname = 'public'
        WHERE c.relrowsecurity = false;

        IF v_missing_tables IS NULL OR v_missing_tables = '' THEN
            INSERT INTO test_results (teste, status, detalhe) VALUES
            ('6. Habilitação de RLS', 'PASS', 'RLS ativado em 100% das novas tabelas da fundação');
        ELSE
            INSERT INTO test_results (teste, status, detalhe) VALUES
            ('6. Habilitação de RLS', 'FAIL', 'Tabelas sem RLS: ' || v_missing_tables);
        END IF;
    EXCEPTION WHEN OTHERS THEN
        INSERT INTO test_results (teste, status, detalhe) VALUES
        ('6. Habilitação de RLS', 'FAIL', 'Excecao ao checar RLS: ' || SQLERRM);
    END;

END $$;

-- Exibir Resultados Formatados
SELECT 
    id,
    teste,
    status,
    detalhe
FROM test_results
ORDER BY id;

-- Garantir que nada seja persistido em staging
ROLLBACK;
