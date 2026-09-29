-- ==============================================================================
-- SCRIPT DE VERIFICAÇÃO PARA BANCO DE DADOS EM STAGING (SUPABASE SQL EDITOR)
-- Objetivo: Validar integridade das migrations de Convênios/TISS/Glosas/Repasse,
--           verificar RLS, índices, anti-duplicidade, multi-tenancy e RPC de estorno.
-- Execução: Seguro e idempotente. Roda dentro de transação e finaliza em ROLLBACK.
-- ==============================================================================

BEGIN;

-- 1. Tabela temporária para consolidar os resultados dos testes
CREATE TEMP TABLE test_results (
    id SERIAL PRIMARY KEY,
    teste TEXT NOT NULL,
    status TEXT NOT NULL,
    detalhe TEXT NOT NULL
);

DO $$
DECLARE
    v_count INT;
    v_missing_cols TEXT := '';
    v_missing_tables TEXT := '';
    v_missing_rls TEXT := '';
    v_missing_policies TEXT := '';
    v_dup_guides_count INT := 0;
    
    -- IDs de teste
    c_clinic_a UUID := '00000000-0000-0000-0000-0000000000a1';
    c_clinic_b UUID := '00000000-0000-0000-0000-0000000000b2';
    c_user_a   UUID := '00000000-0000-0000-0000-000000000aa1';
    c_user_b   UUID := '00000000-0000-0000-0000-000000000bb2';
    c_ins_a    UUID := '00000000-0000-0000-0000-0000000001a1';
    c_ins_b    UUID := '00000000-0000-0000-0000-0000000001b2';
    c_batch_a  UUID := '00000000-0000-0000-0000-00000000ba01';
    c_return_a UUID := '00000000-0000-0000-0000-00000000fa01';
    c_guide_a  UUID := '00000000-0000-0000-0000-00000000da01';
    c_import_a UUID := '00000000-0000-0000-0000-00000000ea01';
    c_price_a  UUID := '00000000-0000-0000-0000-00000000ca01';
    c_price_b  UUID := '00000000-0000-0000-0000-00000000cb02';

    v_cross_read_prices INT;
    v_cross_read_returns INT;
    v_cross_update_prices INT;
    v_global_tuss_read INT;
    v_undo_res JSONB;
    v_guide_status_after TEXT;
    v_import_status_after TEXT;
BEGIN
    -- -------------------------------------------------------------------------
    -- TESTE 1: Existência das Tabelas Novas
    -- -------------------------------------------------------------------------
    SELECT COUNT(*) INTO v_count
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
      AND table_name IN ('tuss_procedures', 'health_insurance_price_tables', 'tiss_glosa_reasons_ans', 'tiss_return_imports');

    IF v_count = 4 THEN
        INSERT INTO test_results (teste, status, detalhe) VALUES
        ('1. Tabelas Novas', 'PASS', 'As 4 tabelas novas existem no schema public');
    ELSE
        SELECT string_agg(t.tbl, ', ') INTO v_missing_tables
        FROM (
            SELECT unnest(ARRAY['tuss_procedures', 'health_insurance_price_tables', 'tiss_glosa_reasons_ans', 'tiss_return_imports']) AS tbl
        ) t
        WHERE NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = t.tbl AND table_schema = 'public');
        
        INSERT INTO test_results (teste, status, detalhe) VALUES
        ('1. Tabelas Novas', 'FAIL', 'Tabelas faltantes: ' || COALESCE(v_missing_tables, ''));
    END IF;

    -- -------------------------------------------------------------------------
    -- TESTE 2: Existência das Colunas Novas
    -- -------------------------------------------------------------------------
    WITH required_cols AS (
        SELECT 'clinics' AS tbl, 'repasse_regime' AS col UNION ALL
        SELECT 'clinics', 'glosa_policy' UNION ALL
        SELECT 'clinics', 'tiss_hash_algorithm' UNION ALL
        SELECT 'health_insurances', 'closing_day' UNION ALL
        SELECT 'health_insurances', 'appeal_deadline_days' UNION ALL
        SELECT 'tiss_authorization_requests', 'sessions_authorized' UNION ALL
        SELECT 'tiss_authorization_requests', 'sessions_used' UNION ALL
        SELECT 'tiss_guides', 'copay_value' UNION ALL
        SELECT 'tiss_guides', 'paid_value' UNION ALL
        SELECT 'tiss_batches', 'dispatch_channel' UNION ALL
        SELECT 'tiss_return_imports', 'status'
    )
    SELECT string_agg(rc.tbl || '.' || rc.col, ', ') INTO v_missing_cols
    FROM required_cols rc
    WHERE NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = rc.tbl AND column_name = rc.col
    );

    IF v_missing_cols IS NULL OR v_missing_cols = '' THEN
        INSERT INTO test_results (teste, status, detalhe) VALUES
        ('2. Colunas Novas', 'PASS', 'Todas as 11 colunas novas foram detectadas com sucesso');
    ELSE
        INSERT INTO test_results (teste, status, detalhe) VALUES
        ('2. Colunas Novas', 'FAIL', 'Colunas faltantes: ' || v_missing_cols);
    END IF;

    -- -------------------------------------------------------------------------
    -- TESTE 3: RLS Ativa (relrowsecurity = true) nas Tabelas Novas
    -- -------------------------------------------------------------------------
    WITH check_rls AS (
        SELECT relname, relrowsecurity 
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public'
          AND relname IN ('tuss_procedures', 'health_insurance_price_tables', 'tiss_glosa_reasons_ans', 'tiss_return_imports')
    )
    SELECT string_agg(relname, ', ') INTO v_missing_rls
    FROM check_rls
    WHERE relrowsecurity = false;

    IF v_missing_rls IS NULL OR v_missing_rls = '' THEN
        INSERT INTO test_results (teste, status, detalhe) VALUES
        ('3. RLS Habilitada', 'PASS', 'Row Level Security ativa em todas as 4 tabelas novas');
    ELSE
        INSERT INTO test_results (teste, status, detalhe) VALUES
        ('3. RLS Habilitada', 'FAIL', 'Tabelas sem RLS ativa: ' || v_missing_rls);
    END IF;

    -- -------------------------------------------------------------------------
    -- TESTE 4: Políticas de RLS Existentes
    -- -------------------------------------------------------------------------
    WITH req_pol AS (
        SELECT 'tuss_procedures' AS tbl, 'tuss_procedures_read_all' AS pol UNION ALL
        SELECT 'health_insurance_price_tables', 'hi_price_tables_clinic_isolation' UNION ALL
        SELECT 'tiss_glosa_reasons_ans', 'glosa_reasons_read_all' UNION ALL
        SELECT 'tiss_return_imports', 'tiss_return_imports_clinic_isolation'
    )
    SELECT string_agg(rp.tbl || ' (' || rp.pol || ')', ', ') INTO v_missing_policies
    FROM req_pol rp
    WHERE NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = rp.tbl AND policyname = rp.pol
    );

    IF v_missing_policies IS NULL OR v_missing_policies = '' THEN
        INSERT INTO test_results (teste, status, detalhe) VALUES
        ('4. Politicas RLS', 'PASS', 'Todas as politicas de isolamento e leitura global estao presentes');
    ELSE
        INSERT INTO test_results (teste, status, detalhe) VALUES
        ('4. Politicas RLS', 'FAIL', 'Politicas ausentes: ' || v_missing_policies);
    END IF;

    -- -------------------------------------------------------------------------
    -- TESTE 5: Índices Únicos e Parciais
    -- -------------------------------------------------------------------------
    IF EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE schemaname = 'public' 
          AND tablename = 'tiss_return_imports' 
          AND indexname = 'uq_tiss_return_file_hash_active'
    ) AND EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE schemaname = 'public' 
          AND tablename = 'tiss_guides' 
          AND indexname = 'uq_tiss_guides_appointment_proc'
    ) THEN
        INSERT INTO test_results (teste, status, detalhe) VALUES
        ('5. Indices Unicos e Parciais', 'PASS', 'uq_tiss_return_file_hash_active e uq_tiss_guides_appointment_proc existem');
    ELSE
        INSERT INTO test_results (teste, status, detalhe) VALUES
        ('5. Indices Unicos e Parciais', 'FAIL', 'Um ou ambos os indices unicos estao ausentes');
    END IF;

    -- -------------------------------------------------------------------------
    -- TESTE 6: Função tiss_undo_return_import
    -- -------------------------------------------------------------------------
    IF EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public' AND p.proname = 'tiss_undo_return_import'
    ) THEN
        INSERT INTO test_results (teste, status, detalhe) VALUES
        ('6. Funcao RPC tiss_undo_return_import', 'PASS', 'Funcao RPC de estorno atômico compilada com sucesso');
    ELSE
        INSERT INTO test_results (teste, status, detalhe) VALUES
        ('6. Funcao RPC tiss_undo_return_import', 'FAIL', 'Funcao tiss_undo_return_import ausente no schema');
    END IF;

    -- -------------------------------------------------------------------------
    -- TESTE 7: Diagnóstico Prévio de Duplicatas em tiss_guides
    -- -------------------------------------------------------------------------
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tiss_guides' AND table_schema = 'public') THEN
        SELECT COUNT(*) INTO v_dup_guides_count
        FROM (
            SELECT clinic_id, appointment_id, procedure_code
            FROM tiss_guides
            WHERE appointment_id IS NOT NULL 
              AND status NOT IN ('CANCELLED', 'CANCELED')
            GROUP BY clinic_id, appointment_id, procedure_code
            HAVING COUNT(*) > 1
        ) d;

        IF v_dup_guides_count = 0 THEN
            INSERT INTO test_results (teste, status, detalhe) VALUES
            ('7. Duplicatas em tiss_guides', 'PASS', 'Zero combinacoes ativas duplicadas. Indice sem conflitos');
        ELSE
            INSERT INTO test_results (teste, status, detalhe) VALUES
            ('7. Duplicatas em tiss_guides', 'FAIL', format('%s registros duplicados impediriam a criacao do indice', v_dup_guides_count));
        END IF;
    ELSE
        INSERT INTO test_results (teste, status, detalhe) VALUES
        ('7. Duplicatas em tiss_guides', 'SKIP', 'Tabela tiss_guides ainda nao existe neste ambiente');
    END IF;

    -- -------------------------------------------------------------------------
    -- TESTE 8: Isolamento Multi-tenant via RLS (Simulação com 2 Clínicas)
    -- -------------------------------------------------------------------------
    -- Inserir dados fictícios para teste dentro da transação
    INSERT INTO clinics (id, name, slug) 
    VALUES 
        (c_clinic_a, 'Clinica Staging Alfa', 'staging-alfa'),
        (c_clinic_b, 'Clinica Staging Beta', 'staging-beta')
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO users (id, clinic_id, email, full_name, role)
    VALUES 
        (c_user_a, c_clinic_a, 'admin.alfa@staging.local', 'Admin Alfa', 'CLINIC_ADMIN'),
        (c_user_b, c_clinic_b, 'admin.beta@staging.local', 'Admin Beta', 'CLINIC_ADMIN')
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO health_insurances (id, clinic_id, name)
    VALUES 
        (c_ins_a, c_clinic_a, 'Unimed Alfa'),
        (c_ins_b, c_clinic_b, 'Bradesco Beta')
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO health_insurance_price_tables (id, clinic_id, health_insurance_id, tuss_code, procedure_name, price)
    VALUES 
        (c_price_a, c_clinic_a, c_ins_a, '10101012', 'Consulta Alfa', 150.00),
        (c_price_b, c_clinic_b, c_ins_b, '10101012', 'Consulta Beta', 200.00)
    ON CONFLICT DO NOTHING;

    INSERT INTO tiss_return_imports (id, clinic_id, file_name, file_hash, total_guides_file, amount_paid, status)
    VALUES 
        (c_import_a, c_clinic_a, 'retorno_alfa.xml', 'hash_alfa_123', 5, 500.00, 'COMPLETED'),
        (c_import_b, c_clinic_b, 'retorno_beta.xml', 'hash_beta_456', 2, 200.00, 'COMPLETED')
    ON CONFLICT DO NOTHING;

    -- Trocar para papel autenticado simulando Usuário A (Clínica A)
    PERFORM set_config('role', 'authenticated', true);
    PERFORM set_config('request.jwt.claims', json_build_object('sub', c_user_a::text, 'role', 'authenticated')::text, true);

    -- Usuário A tenta ler tabela de preços da Clínica B
    SELECT COUNT(*) INTO v_cross_read_prices
    FROM health_insurance_price_tables
    WHERE clinic_id = c_clinic_b;

    -- Usuário A tenta ler importação de retorno da Clínica B
    SELECT COUNT(*) INTO v_cross_read_returns
    FROM tiss_return_imports
    WHERE clinic_id = c_clinic_b;

    -- Usuário A tenta alterar o preço da Clínica B
    UPDATE health_insurance_price_tables
    SET price = 999.00
    WHERE clinic_id = c_clinic_b;
    GET DIAGNOSTICS v_cross_update_prices = ROW_COUNT;

    -- Usuário A lê tabela global TUSS
    SELECT COUNT(*) INTO v_global_tuss_read
    FROM tuss_procedures;

    -- Restaurar papel postgres para checagem do resultado
    PERFORM set_config('role', 'postgres', true);

    IF v_cross_read_prices = 0 AND v_cross_read_returns = 0 AND v_cross_update_prices = 0 AND v_global_tuss_read > 0 THEN
        INSERT INTO test_results (teste, status, detalhe) VALUES
        ('8. Multi-tenant RLS (Cross-Clinic)', 'PASS', 'Clinica A tem 0 acesso de leitura/gravacao em Clinica B e acessa dados globais');
    ELSE
        INSERT INTO test_results (teste, status, detalhe) VALUES
        ('8. Multi-tenant RLS (Cross-Clinic)', 'FAIL', 
         format('Vazamento detectado: leituras_precos=%s, leituras_retornos=%s, updates=%s, globais=%s',
                v_cross_read_prices, v_cross_read_returns, v_cross_update_prices, v_global_tuss_read));
    END IF;

    -- -------------------------------------------------------------------------
    -- TESTE 9: Exercitar a Função RPC tiss_undo_return_import
    -- -------------------------------------------------------------------------
    INSERT INTO tiss_batches (id, clinic_id, batch_number, status, total_guides, total_value, dispatch_channel)
    VALUES (c_batch_a, c_clinic_a, 'LOTE-STAGING-001', 'PROCESSED', 1, 150.00, 'PORTAL')
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO tiss_guides (id, clinic_id, batch_id, guide_number, status, paid_value)
    VALUES (c_guide_a, c_clinic_a, c_batch_a, 'GUIA-STAGING-001', 'PAID', 150.00)
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO tiss_returns (id, clinic_id, batch_id, return_file_name, processing_status, amount_approved)
    VALUES (c_return_a, c_clinic_a, c_batch_a, 'retorno_alfa.xml', 'COMPLETED', 150.00)
    ON CONFLICT (id) DO NOTHING;

    -- Chamar a função de estorno
    v_undo_res := tiss_undo_return_import(c_return_a, c_clinic_a, c_user_a, 'Admin Alfa Staging');

    -- Validar pós-estorno
    SELECT status INTO v_guide_status_after FROM tiss_guides WHERE id = c_guide_a;
    SELECT status INTO v_import_status_after FROM tiss_return_imports WHERE id = c_import_a;

    IF (v_undo_res->>'success')::boolean = true AND v_guide_status_after = 'SENT' AND v_import_status_after = 'CANCELLED' THEN
        INSERT INTO test_results (teste, status, detalhe) VALUES
        ('9. Exercicio RPC tiss_undo_return_import', 'PASS', 'Estorno atomico executado com sucesso: guia voltou para SENT e importacao para CANCELLED');
    ELSE
        INSERT INTO test_results (teste, status, detalhe) VALUES
        ('9. Exercicio RPC tiss_undo_return_import', 'FAIL', 
         format('Falha no desfazimento: resultado=%s, status_guia=%s, status_import=%s',
                v_undo_res::text, v_guide_status_after, v_import_status_after));
    END IF;

END $$;

-- 2. Exibição do Relatório Tabular
SELECT 
    teste,
    status,
    detalhe
FROM test_results
ORDER BY id;

-- 3. ROLLBACK Obrigatório (Garante banco limpo e sem alterações)
ROLLBACK;
