-- ============================================================================
-- SCRIPT DE DELEÇÃO EM MASSA DE CLÍNICAS
-- ============================================================================
-- ATENÇÃO: Este script deleta PERMANENTEMENTE as clínicas marcadas
-- e TODOS os dados relacionados (usuários, pacientes, consultas, etc)
-- 
-- Execute este script no SQL Editor do Supabase Dashboard
-- ============================================================================

-- IDs das clínicas marcadas para deleção (da screenshot)
DO $$
DECLARE
    clinic_ids UUID[] := ARRAY[
        '382922c2-3c45-4772-9047-ce4335013441'::UUID,  -- cimeriesrobson@gmail.com
        'b2cfbb15-1fa0-40c8-9006-92d5c3fd3c51'::UUID,  -- dyego.fisio@hotmail.com
        'a8a3642e-6ab9-40bc-9270-fd0a8c44dfdf'::UUID,  -- nodex.clinigo@gmail.com
        'da912391-6a2c-4982-96e5-fde9f5b0f670'::UUID,  -- robson.e.cleiniane@gmail.com
        '8483eaa9-d425-4a0a-b5dc-0fd35985a8a6'::UUID,  -- robsonanathema@gmail.com
        '8fc48779-a5cc-451c-9b82-a559073a73b4'::UUID,  -- robsonfenriz@hotmail.com
        'a1e790df-f2cf-43e5-b0cf-19db736b673e'::UUID   -- robsonmarduk@gmail.com
    ];
    current_clinic_id UUID;
    deleted_count INT := 0;
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'INICIANDO DELEÇÃO EM MASSA DE CLÍNICAS';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Total de clínicas: %', array_length(clinic_ids, 1);
    RAISE NOTICE '';

    FOREACH current_clinic_id IN ARRAY clinic_ids
    LOOP
        RAISE NOTICE 'Deletando clínica: %', current_clinic_id;
        
        -- Deletar usuários do auth.users associados à clínica
        -- Isso permite que os emails sejam reutilizados
        DELETE FROM auth.users
        WHERE id IN (
            SELECT id 
            FROM public.users 
            WHERE clinic_id = current_clinic_id
        );
        
        -- Deletar a clínica (cascade vai deletar todos os relacionados)
        DELETE FROM public.clinics WHERE id = current_clinic_id;
        
        deleted_count := deleted_count + 1;
        RAISE NOTICE '✓ Clínica % deletada com sucesso', current_clinic_id;
        RAISE NOTICE '';
    END LOOP;

    RAISE NOTICE '========================================';
    RAISE NOTICE 'DELEÇÃO CONCLUÍDA';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Total de clínicas deletadas: %', deleted_count;
    RAISE NOTICE '';
    RAISE NOTICE 'Os seguintes dados foram removidos:';
    RAISE NOTICE '- Clínicas e suas configurações';
    RAISE NOTICE '- Todos os usuários (e seus emails liberados no Auth)';
    RAISE NOTICE '- Todos os pacientes';
    RAISE NOTICE '- Todas as consultas';
    RAISE NOTICE '- Todos os documentos';
    RAISE NOTICE '- Todos os dados financeiros';
    RAISE NOTICE '- Todas as permissões';
    RAISE NOTICE '';
    RAISE NOTICE 'Os emails agora podem ser reutilizados para novo cadastro.';
    
END $$;

-- Verificar se as clínicas foram deletadas
SELECT 
    'Verificação: Nenhuma clínica encontrada' AS status,
    COUNT(*) AS clinics_remaining
FROM public.clinics
WHERE id IN (
    '382922c2-3c45-4772-9047-ce4335013441',
    'b2cfbb15-1fa0-40c8-9006-92d5c3fd3c51',
    'a8a3642e-6ab9-40bc-9270-fd0a8c44dfdf',
    'da912391-6a2c-4982-96e5-fde9f5b0f670',
    '8483eaa9-d425-4a0a-b5dc-0fd35985a8a6',
    '8fc48779-a5cc-451c-9b82-a559073a73b4',
    'a1e790df-f2cf-43e5-b0cf-19db736b673e'
);
