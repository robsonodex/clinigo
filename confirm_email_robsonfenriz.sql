-- ============================================
-- Confirmar email do usuário robsonfenriz@hotmail.com
-- ============================================

-- Buscar o usuário no auth.users
SELECT id, email, email_confirmed_at 
FROM auth.users 
WHERE email = 'robsonfenriz@hotmail.com';

-- Se encontrado, executar o UPDATE abaixo:
-- Confirmar o email
UPDATE auth.users
SET 
    email_confirmed_at = NOW(),
    updated_at = NOW()
WHERE email = 'robsonfenriz@hotmail.com';

-- Verificar se foi atualizado
SELECT id, email, email_confirmed_at, updated_at
FROM auth.users 
WHERE email = 'robsonfenriz@hotmail.com';

-- Também garantir que o usuário está ativo na tabela public.users
UPDATE public.users
SET 
    is_active = true,
    activation_status = 'active'
WHERE email = 'robsonfenriz@hotmail.com';

-- Verificar status final
SELECT 
    u.id,
    u.email,
    u.full_name,
    u.role,
    u.is_active,
    u.activation_status,
    c.name as clinic_name,
    c.is_active as clinic_active,
    c.approval_status
FROM public.users u
LEFT JOIN public.clinics c ON u.clinic_id = c.id
WHERE u.email = 'robsonfenriz@hotmail.com';
