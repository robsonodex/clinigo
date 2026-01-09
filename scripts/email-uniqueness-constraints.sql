-- ============================================
-- CliniGo - Email Uniqueness Constraints
-- Data: 2026-01-08
-- 
-- Este script adiciona restrições de unicidade para prevenir
-- a criação de múltiplas clínicas com o mesmo e-mail de administrador.
-- ============================================

-- ============================================
-- 1. UNIQUE CONSTRAINT na tabela USERS (email)
-- ============================================
-- Primeiro, remover duplicatas se existirem (manter apenas o mais recente)
-- Esta query identifica duplicatas
-- SELECT email, COUNT(*) FROM users GROUP BY email HAVING COUNT(*) > 1;

-- Para remover duplicatas (CUIDADO: executar apenas após backup):
-- DELETE FROM users a USING users b
-- WHERE a.id < b.id AND LOWER(a.email) = LOWER(b.email);

-- Adicionar constraint UNIQUE case-insensitive
DO $$
BEGIN
    -- Verificar se a constraint já existe
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'users_email_unique_lower'
    ) THEN
        -- Criar índice único case-insensitive
        CREATE UNIQUE INDEX users_email_unique_lower 
        ON users (LOWER(email))
        WHERE email IS NOT NULL;
        
        RAISE NOTICE 'Created unique index on users.email (case-insensitive)';
    ELSE
        RAISE NOTICE 'Index users_email_unique_lower already exists';
    END IF;
END $$;

-- ============================================
-- 2. UNIQUE CONSTRAINT na tabela CLINICS (email para clínicas ativas)
-- ============================================
-- Prevenir múltiplas clínicas ATIVAS com o mesmo email de contato
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'clinics_email_unique_active_lower'
    ) THEN
        -- Criar índice único parcial (apenas clínicas ativas)
        CREATE UNIQUE INDEX clinics_email_unique_active_lower 
        ON clinics (LOWER(email))
        WHERE is_active = true AND email IS NOT NULL;
        
        RAISE NOTICE 'Created unique index on clinics.email for active clinics';
    ELSE
        RAISE NOTICE 'Index clinics_email_unique_active_lower already exists';
    END IF;
END $$;

-- ============================================
-- 3. UNIQUE CONSTRAINT na tabela CLINICS (slug para clínicas ativas)
-- ============================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'clinics_slug_unique_active'
    ) THEN
        CREATE UNIQUE INDEX clinics_slug_unique_active 
        ON clinics (slug)
        WHERE is_active = true;
        
        RAISE NOTICE 'Created unique index on clinics.slug for active clinics';
    ELSE
        RAISE NOTICE 'Index clinics_slug_unique_active already exists';
    END IF;
END $$;

-- ============================================
-- 4. UNIQUE CONSTRAINT na tabela CLINICS (CNPJ para clínicas ativas)
-- ============================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'clinics_cnpj_unique_active'
    ) THEN
        CREATE UNIQUE INDEX clinics_cnpj_unique_active 
        ON clinics (cnpj)
        WHERE is_active = true AND cnpj IS NOT NULL;
        
        RAISE NOTICE 'Created unique index on clinics.cnpj for active clinics';
    ELSE
        RAISE NOTICE 'Index clinics_cnpj_unique_active already exists';
    END IF;
END $$;

-- ============================================
-- VERIFICAÇÃO FINAL
-- ============================================
-- Listar todos os índices únicos criados
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE indexname LIKE '%unique%'
    AND tablename IN ('users', 'clinics')
ORDER BY tablename, indexname;

-- ============================================
-- ROLLBACK (se necessário)
-- ============================================
-- DROP INDEX IF EXISTS users_email_unique_lower;
-- DROP INDEX IF EXISTS clinics_email_unique_active_lower;
-- DROP INDEX IF EXISTS clinics_slug_unique_active;
-- DROP INDEX IF EXISTS clinics_cnpj_unique_active;
