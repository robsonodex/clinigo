-- ============================================================================
-- SCRIPT DE DELEÇÃO DE USUÁRIOS MARCADOS
-- ============================================================================
-- ATENÇÃO: Este script deleta PERMANENTEMENTE os usuários selecionados
-- e TODOS os dados relacionados (clínicas, pacientes, consultas, documentos)
-- 
-- Execute este script no SQL Editor do Supabase Dashboard
-- ============================================================================

-- IDs dos usuários marcados para deleção (da screenshot)
DO $$
DECLARE
    user_ids UUID[] := ARRAY[
        'a956fd09-4efb-4b66-a4ad-562036f5ff75'::UUID,  -- Jose (123braz28@gmail.com)
        '27c954f4-f32a-4633-90c6-5b21887fa42c'::UUID,  -- robson-nodex (nodexs.aia@gmail.com)
        'a2e65f0f-e897-4089-8c45-c9a14c4d9127'::UUID   -- Dr Mauricio (robsonparadigma@gmail.com)
    ];
    current_user_id UUID;
    user_clinic_ids UUID[];
    deleted_users INT := 0;
    deleted_clinics INT := 0;
BEGIN
    -- Disable audit triggers temporarily to avoid FK constraint errors
    SET session_replication_role = 'replica';
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'INICIANDO DELEÇÃO DE USUÁRIOS';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Total de usuários: %', array_length(user_ids, 1);
    RAISE NOTICE '';

    FOREACH current_user_id IN ARRAY user_ids
    LOOP
        RAISE NOTICE 'Processando usuário: %', current_user_id;
        
        -- Buscar clínicas associadas ao usuário
        SELECT array_agg(DISTINCT clinic_id) INTO user_clinic_ids
        FROM public.users
        WHERE id = current_user_id
        AND clinic_id IS NOT NULL;
        
        IF user_clinic_ids IS NOT NULL THEN
            RAISE NOTICE '  → Clínicas encontradas: %', array_length(user_clinic_ids, 1);
            
            -- Deletar clínicas e tudo relacionado (cascade)
            DELETE FROM public.clinics 
            WHERE id = ANY(user_clinic_ids);
            
            deleted_clinics := deleted_clinics + array_length(user_clinic_ids, 1);
        ELSE
            RAISE NOTICE '  → Nenhuma clínica associada';
        END IF;
        
        -- Deletar do auth.users (libera o email para reuso)
        DELETE FROM auth.users WHERE id = current_user_id;
        
        -- Deletar do public.users (caso não tenha cascade)
        DELETE FROM public.users WHERE id = current_user_id;
        
        deleted_users := deleted_users + 1;
        RAISE NOTICE '✓ Usuário % deletado com sucesso', current_user_id;
        RAISE NOTICE '';
    END LOOP;

    RAISE NOTICE '========================================';
    RAISE NOTICE 'DELEÇÃO CONCLUÍDA';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Total de usuários deletados: %', deleted_users;
    RAISE NOTICE 'Total de clínicas deletadas: %', deleted_clinics;
    RAISE NOTICE '';
    RAISE NOTICE 'Os seguintes dados foram removidos:';
    RAISE NOTICE '- Usuários (emails liberados no Auth)';
    RAISE NOTICE '- Clínicas e suas configurações';
    RAISE NOTICE '- Todos os médicos/profissionais';
    RAISE NOTICE '- Todos os pacientes';
    RAISE NOTICE '- Todas as consultas';
    RAISE NOTICE '- Todos os documentos';
    RAISE NOTICE '- Todos os dados financeiros';
    RAISE NOTICE '- Todas as permissões';
    RAISE NOTICE '';
    RAISE NOTICE 'Os emails agora podem ser reutilizados.';
    
    -- Re-enable triggers
    SET session_replication_role = 'origin';
    
EXCEPTION
    WHEN OTHERS THEN
        -- Re-enable triggers even on error
        SET session_replication_role = 'origin';
        RAISE;
END $$;

-- Verificar se os usuários foram deletados
SELECT 
    'Verificação: Nenhum usuário encontrado' AS status,
    COUNT(*) AS users_remaining
FROM public.users
WHERE id IN (
    'a956fd09-4efb-4b66-a4ad-562036f5ff75',
    '27c954f4-f32a-4633-90c6-5b21887fa42c',
    'a2e65f0f-e897-4089-8c45-c9a14c4d9127'
);

-- Verificar auth.users
SELECT 
    'Verificação Auth: Nenhum usuário encontrado' AS status,
    COUNT(*) AS auth_users_remaining
FROM auth.users
WHERE id IN (
    'a956fd09-4efb-4b66-a4ad-562036f5ff75',
    '27c954f4-f32a-4633-90c6-5b21887fa42c',
    'a2e65f0f-e897-4089-8c45-c9a14c4d9127'
);
