-- ============================================
-- CliniGo - Correção de Emails Duplicados
-- Data: 2026-01-08
-- 
-- EXECUTE ESTE SCRIPT ANTES de criar as constraints de unicidade
-- ============================================

-- ============================================
-- PASSO 1: Identificar emails duplicados na tabela CLINICS
-- ============================================
SELECT 
    LOWER(email) as email,
    COUNT(*) as total,
    array_agg(id) as clinic_ids,
    array_agg(name) as clinic_names,
    array_agg(is_active) as is_active_status,
    array_agg(created_at ORDER BY created_at DESC) as created_dates
FROM clinics
WHERE email IS NOT NULL AND is_active = true
GROUP BY LOWER(email)
HAVING COUNT(*) > 1;

-- ============================================
-- PASSO 2: Visualizar todas as clínicas com o email duplicado
-- ============================================
SELECT id, name, email, slug, is_active, created_at
FROM clinics
WHERE LOWER(email) = 'robsonodexs@gmail.com'
ORDER BY created_at DESC;

-- ============================================
-- PASSO 3: OPÇÕES PARA RESOLVER DUPLICATAS
-- ============================================

-- OPÇÃO A: Desativar clínicas duplicadas mais antigas (mantém a mais recente)
-- Esta query mantém apenas a clínica mais recente para cada email
/*
UPDATE clinics
SET is_active = false
WHERE id IN (
    SELECT id FROM (
        SELECT id, 
               ROW_NUMBER() OVER (PARTITION BY LOWER(email) ORDER BY created_at DESC) as rn
        FROM clinics
        WHERE is_active = true AND email IS NOT NULL
    ) ranked
    WHERE rn > 1
);
*/

-- OPÇÃO B: Alterar o email das clínicas duplicadas (adiciona sufixo numérico)
/*
WITH duplicates AS (
    SELECT id, email,
           ROW_NUMBER() OVER (PARTITION BY LOWER(email) ORDER BY created_at DESC) as rn
    FROM clinics
    WHERE is_active = true AND email IS NOT NULL
)
UPDATE clinics c
SET email = d.email || '+dup' || d.rn || '@' || split_part(d.email, '@', 2)
FROM duplicates d
WHERE c.id = d.id AND d.rn > 1;
*/

-- OPÇÃO C: Desativar uma clínica específica pelo ID
-- Substitua 'CLINIC_ID_AQUI' pelo ID da clínica que deseja desativar
/*
UPDATE clinics
SET is_active = false
WHERE id = 'CLINIC_ID_AQUI';
*/

-- ============================================
-- PASSO 4: Executar a OPÇÃO A (Desativar duplicatas antigas)
-- ============================================
-- DESCOMENTE E EXECUTE APENAS QUANDO ESTIVER PRONTO:

UPDATE clinics
SET is_active = false, 
    updated_at = NOW()
WHERE id IN (
    SELECT id FROM (
        SELECT id, 
               ROW_NUMBER() OVER (PARTITION BY LOWER(email) ORDER BY created_at DESC) as rn
        FROM clinics
        WHERE is_active = true AND email IS NOT NULL
    ) ranked
    WHERE rn > 1
);

-- ============================================
-- PASSO 5: Verificar se resolveu
-- ============================================
-- Esta query deve retornar 0 linhas após a correção
SELECT 
    LOWER(email) as email,
    COUNT(*) as total
FROM clinics
WHERE email IS NOT NULL AND is_active = true
GROUP BY LOWER(email)
HAVING COUNT(*) > 1;

-- ============================================
-- PASSO 6: Agora criar a constraint de unicidade
-- ============================================
CREATE UNIQUE INDEX IF NOT EXISTS clinics_email_unique_active_lower 
ON clinics (LOWER(email))
WHERE is_active = true AND email IS NOT NULL;

-- Verificar se foi criada
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'clinics' AND indexname LIKE '%email%';
