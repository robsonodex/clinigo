-- ==============================================================================
-- SCRIPT DE VERIFICAÇÃO PARA BANCO DE DADOS EM STAGING (SUPABASE SQL EDITOR)
-- LICENCIAMENTO POR ASSENTO COM LICENÇA ADICIONAL TRANSPARENTE
-- Execução: 100% seguro e idempotente. Roda dentro de transação e finaliza em ROLLBACK.
-- ==============================================================================

BEGIN;

-- Tabela temporária para consolidar o relatório da auditoria
CREATE TEMP TABLE test_results (
    id SERIAL PRIMARY KEY,
    teste TEXT NOT NULL,
    status TEXT NOT NULL,
    detalhe TEXT NOT NULL
);

DO $$
DECLARE
    v_clinic_a UUID;
    v_clinic_b UUID;
    v_user_a UUID;
    v_user_b UUID;
    v_event_id UUID;
    v_col_count INT;
    v_table_count INT;
    v_rls_enabled BOOLEAN;
    v_duplicate_caught BOOLEAN := FALSE;
BEGIN
    -- -------------------------------------------------------------------------
    -- TESTE 1: Colunas em public.clinics
    -- -------------------------------------------------------------------------
    SELECT COUNT(*) INTO v_col_count
    FROM information_schema.columns
    WHERE table_schema = 'public' 
      AND table_name = 'clinics' 
      AND column_name IN ('seat_price_override_cents', 'seat_overage_waived');

    IF v_col_count = 2 THEN
        INSERT INTO test_results (teste, status, detalhe)
        VALUES ('1. Colunas em clinics', 'PASS', 'seat_price_override_cents e seat_overage_waived existem.');
    ELSE
        INSERT INTO test_results (teste, status, detalhe)
        VALUES ('1. Colunas em clinics', 'FAIL', format('Encontradas apenas %s de 2 colunas esperadas.', v_col_count));
    END IF;

    -- -------------------------------------------------------------------------
    -- TESTE 2: Tabela seat_billing_events e RLS
    -- -------------------------------------------------------------------------
    SELECT COUNT(*) INTO v_table_count
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'seat_billing_events';

    SELECT rowsecurity INTO v_rls_enabled
    FROM pg_tables
    WHERE schemaname = 'public' AND tablename = 'seat_billing_events';

    IF v_table_count = 1 AND v_rls_enabled = TRUE THEN
        INSERT INTO test_results (teste, status, detalhe)
        VALUES ('2. Tabela seat_billing_events e RLS', 'PASS', 'Tabela criada e RLS devidamente ativada.');
    ELSE
        INSERT INTO test_results (teste, status, detalhe)
        VALUES ('2. Tabela seat_billing_events e RLS', 'FAIL', format('Tabela: %s, RLS: %s.', v_table_count, v_rls_enabled));
    END IF;

    -- -------------------------------------------------------------------------
    -- TESTE 3: Inserção de evento e integridade de campos
    -- -------------------------------------------------------------------------
    -- Seleciona ou cria IDs fictícios na transação
    SELECT id INTO v_clinic_a FROM public.clinics LIMIT 1;
    IF v_clinic_a IS NULL THEN
        INSERT INTO public.clinics (id, name, slug) VALUES (gen_random_uuid(), 'Clinica Teste Staging', 'clinica-teste-staging') RETURNING id INTO v_clinic_a;
    END IF;

    SELECT id INTO v_user_a FROM public.users WHERE clinic_id = v_clinic_a LIMIT 1;

    INSERT INTO public.seat_billing_events (
        clinic_id,
        actor_user_id,
        plan,
        included_seats,
        seats_before,
        seats_after,
        extra_seats_before,
        extra_seats_after,
        unit_price_cents,
        monthly_before_cents,
        monthly_after_cents,
        quote_id,
        idempotency_key,
        status
    ) VALUES (
        v_clinic_a,
        v_user_a,
        'PROFESSIONAL',
        30,
        30,
        31,
        0,
        1,
        4990,
        44900,
        49890,
        'quote-staging-test-001',
        'idemp-staging-test-001',
        'COMMITTED'
    ) RETURNING id INTO v_event_id;

    IF v_event_id IS NOT NULL THEN
        INSERT INTO test_results (teste, status, detalhe)
        VALUES ('3. Insercao de Evento COMMITTED', 'PASS', format('Evento gravado com ID %s (449,00 + 49,90 = 498,90).', v_event_id));
    ELSE
        INSERT INTO test_results (teste, status, detalhe)
        VALUES ('3. Insercao de Evento COMMITTED', 'FAIL', 'Nao foi possivel inserir evento probatorio.');
    END IF;

    -- -------------------------------------------------------------------------
    -- TESTE 4: Garantia de Idempotencia (UNIQUE idempotency_key)
    -- -------------------------------------------------------------------------
    BEGIN
        INSERT INTO public.seat_billing_events (
            clinic_id,
            actor_user_id,
            plan,
            included_seats,
            seats_before,
            seats_after,
            unit_price_cents,
            monthly_before_cents,
            monthly_after_cents,
            quote_id,
            idempotency_key,
            status
        ) VALUES (
            v_clinic_a,
            v_user_a,
            'PROFESSIONAL',
            30,
            30,
            31,
            4990,
            44900,
            49890,
            'quote-staging-test-001',
            'idemp-staging-test-001',
            'COMMITTED'
        );
    EXCEPTION WHEN unique_violation THEN
        v_duplicate_caught := TRUE;
    END;

    IF v_duplicate_caught = TRUE THEN
        INSERT INTO test_results (teste, status, detalhe)
        VALUES ('4. Unicidade de Idempotency-Key', 'PASS', 'Tentativa de duplicacao rejeitada com unique_violation.');
    ELSE
        INSERT INTO test_results (teste, status, detalhe)
        VALUES ('4. Unicidade de Idempotency-Key', 'FAIL', 'Duplicacao de idempotency_key foi aceita indevidamente.');
    END IF;

    -- -------------------------------------------------------------------------
    -- TESTE 5: Compensacao transacional (Status VOIDED)
    -- -------------------------------------------------------------------------
    UPDATE public.seat_billing_events
    SET status = 'VOIDED',
        void_reason = 'Teste de compensacao transacional staging',
        voided_at = now()
    WHERE id = v_event_id;

    IF FOUND THEN
        INSERT INTO test_results (teste, status, detalhe)
        VALUES ('5. Compensacao Transacional (VOIDED)', 'PASS', 'Status atualizado para VOIDED com sucesso.');
    ELSE
        INSERT INTO test_results (teste, status, detalhe)
        VALUES ('5. Compensacao Transacional (VOIDED)', 'FAIL', 'Falha ao atualizar evento para VOIDED.');
    END IF;

END $$;

-- Exibe resultado consolidado
SELECT id, teste, status, detalhe FROM test_results ORDER BY id;

-- Finaliza com ROLLBACK para preservar o estado do banco
ROLLBACK;
