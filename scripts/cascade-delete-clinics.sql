-- ============================================
-- CliniGo - Cascade Deletion Trigger for Clinics
-- Data: 2026-01-08
-- 
-- Este script implementa a exclusão em cascata:
-- Quando uma clínica é deletada (hard delete), todos os usuários
-- associados são removidos de auth.users e public.users
-- ============================================

-- ============================================
-- PASSO 1: Verificar/Adicionar ON DELETE CASCADE na FK users.clinic_id
-- ============================================
-- Primeiro, verificar a FK existente
SELECT 
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    rc.delete_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.referential_constraints AS rc
    ON tc.constraint_name = rc.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_name = 'users'
    AND kcu.column_name = 'clinic_id';

-- Se a FK existir mas sem CASCADE, recriar:
-- (DESCOMENTE se necessário)
/*
ALTER TABLE public.users
    DROP CONSTRAINT IF EXISTS users_clinic_id_fkey;

ALTER TABLE public.users
    ADD CONSTRAINT users_clinic_id_fkey 
    FOREIGN KEY (clinic_id) 
    REFERENCES public.clinics(id) 
    ON DELETE CASCADE;
*/

-- ============================================
-- PASSO 2: Criar função para deletar usuários do auth.users
-- ============================================
-- Esta função é chamada ANTES de deletar a clínica
-- para remover os usuários do sistema de autenticação

CREATE OR REPLACE FUNCTION delete_clinic_users()
RETURNS TRIGGER AS $$
DECLARE
    user_record RECORD;
    deleted_count INTEGER := 0;
BEGIN
    -- Log início da operação
    RAISE NOTICE 'Iniciando exclusão de usuários da clínica: %', OLD.id;
    
    -- Iterar sobre todos os usuários desta clínica
    FOR user_record IN 
        SELECT id, email FROM public.users WHERE clinic_id = OLD.id
    LOOP
        -- Deletar do auth.users (requer permissões de service_role)
        BEGIN
            DELETE FROM auth.users WHERE id = user_record.id;
            deleted_count := deleted_count + 1;
            RAISE NOTICE 'Usuário deletado do auth: % (%)', user_record.email, user_record.id;
        EXCEPTION WHEN OTHERS THEN
            -- Log erro mas continua tentando outros usuários
            RAISE WARNING 'Falha ao deletar usuário % do auth: %', user_record.id, SQLERRM;
        END;
    END LOOP;
    
    -- Log resultado
    RAISE NOTICE 'Total de usuários deletados do auth.users: %', deleted_count;
    
    -- Os usuários em public.users serão deletados automaticamente pelo CASCADE
    -- (se configurado) ou pela trigger after_delete
    
    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- PASSO 3: Criar função para auditoria de exclusão
-- ============================================
CREATE OR REPLACE FUNCTION audit_clinic_deletion()
RETURNS TRIGGER AS $$
DECLARE
    user_count INTEGER;
BEGIN
    -- Contar usuários associados
    SELECT COUNT(*) INTO user_count FROM public.users WHERE clinic_id = OLD.id;
    
    -- Registrar no log de auditoria
    INSERT INTO public.audit_logs (
        action,
        entity_type,
        entity_id,
        metadata,
        severity,
        created_at
    ) VALUES (
        'CLINIC_DELETED_WITH_USERS',
        'clinics',
        OLD.id::text,
        jsonb_build_object(
            'clinic_name', OLD.name,
            'clinic_slug', OLD.slug,
            'clinic_email', OLD.email,
            'users_deleted', user_count,
            'deleted_at', NOW()
        ),
        'CRITICAL',
        NOW()
    );
    
    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- PASSO 4: Criar as Triggers
-- ============================================

-- Trigger BEFORE DELETE: Remove usuários do auth.users
DROP TRIGGER IF EXISTS trigger_delete_clinic_users ON public.clinics;
CREATE TRIGGER trigger_delete_clinic_users
    BEFORE DELETE ON public.clinics
    FOR EACH ROW
    EXECUTE FUNCTION delete_clinic_users();

-- Trigger AFTER DELETE: Registra auditoria
DROP TRIGGER IF EXISTS trigger_audit_clinic_deletion ON public.clinics;
CREATE TRIGGER trigger_audit_clinic_deletion
    BEFORE DELETE ON public.clinics
    FOR EACH ROW
    EXECUTE FUNCTION audit_clinic_deletion();

-- ============================================
-- PASSO 5: Adicionar ON DELETE CASCADE se não existir
-- ============================================
-- Verificar se já existe
DO $$
DECLARE
    fk_exists BOOLEAN;
    has_cascade BOOLEAN;
BEGIN
    -- Verificar se FK existe e tem CASCADE
    SELECT EXISTS(
        SELECT 1 FROM information_schema.table_constraints tc
        JOIN information_schema.referential_constraints rc ON tc.constraint_name = rc.constraint_name
        WHERE tc.table_name = 'users' 
        AND tc.constraint_type = 'FOREIGN KEY'
        AND rc.delete_rule = 'CASCADE'
    ) INTO has_cascade;
    
    IF NOT has_cascade THEN
        -- Verificar se FK existe sem CASCADE
        SELECT EXISTS(
            SELECT 1 FROM information_schema.table_constraints
            WHERE table_name = 'users' 
            AND constraint_type = 'FOREIGN KEY'
            AND constraint_name LIKE '%clinic_id%'
        ) INTO fk_exists;
        
        IF fk_exists THEN
            RAISE NOTICE 'FK existe mas sem CASCADE. Recreando...';
            -- Você precisa executar manualmente:
            -- ALTER TABLE public.users DROP CONSTRAINT users_clinic_id_fkey;
            -- ALTER TABLE public.users ADD CONSTRAINT users_clinic_id_fkey 
            --     FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE;
        ELSE
            RAISE NOTICE 'FK não existe com CASCADE configurado.';
        END IF;
    ELSE
        RAISE NOTICE 'FK com ON DELETE CASCADE já está configurada.';
    END IF;
END $$;

-- ============================================
-- PASSO 6: Verificar triggers criadas
-- ============================================
SELECT 
    tgname AS trigger_name,
    tgrelid::regclass AS table_name,
    CASE tgtype & 2 WHEN 2 THEN 'BEFORE' ELSE 'AFTER' END AS timing,
    CASE 
        WHEN tgtype & 4 = 4 THEN 'INSERT'
        WHEN tgtype & 8 = 8 THEN 'DELETE'
        WHEN tgtype & 16 = 16 THEN 'UPDATE'
    END AS event
FROM pg_trigger
WHERE tgrelid = 'public.clinics'::regclass
    AND NOT tgisinternal;

-- ============================================
-- ROLLBACK (se necessário)
-- ============================================
/*
DROP TRIGGER IF EXISTS trigger_delete_clinic_users ON public.clinics;
DROP TRIGGER IF EXISTS trigger_audit_clinic_deletion ON public.clinics;
DROP FUNCTION IF EXISTS delete_clinic_users();
DROP FUNCTION IF EXISTS audit_clinic_deletion();
*/
