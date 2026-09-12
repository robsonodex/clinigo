-- ==============================================================================
-- MIGRATION: 20260912160000_restrict_contracts_to_world_sensory.sql
-- DESCRIÇÃO: Restringe o módulo de contratos e assinaturas eletrônicas exclusivamente
--            à clínica World Sensory (id: 4c13e586-5390-4393-a180-2c9dd7ed81c7).
--            Limpa modelos das demais clínicas e reforça o RLS de ponta a ponta.
-- ==============================================================================

-- 1. Ativar módulo na tabela clinica_modulos para a World Sensory
INSERT INTO public.clinica_modulos (clinica_id, modulo_id, ativo, updated_at)
VALUES ('4c13e586-5390-4393-a180-2c9dd7ed81c7', 'contratos_assinatura', true, NOW())
ON CONFLICT (clinica_id, modulo_id) 
DO UPDATE SET ativo = true, updated_at = NOW();

-- Desativar o módulo caso exista em qualquer outra clínica
DELETE FROM public.clinica_modulos 
WHERE modulo_id = 'contratos_assinatura' 
  AND clinica_id != '4c13e586-5390-4393-a180-2c9dd7ed81c7';

-- 2. Limpar dados e modelos pertencentes a outras clínicas
DELETE FROM public.contract_audit_events 
WHERE clinic_id != '4c13e586-5390-4393-a180-2c9dd7ed81c7';

DELETE FROM public.contract_signers 
WHERE clinic_id != '4c13e586-5390-4393-a180-2c9dd7ed81c7';

DELETE FROM public.contract_documents 
WHERE clinic_id != '4c13e586-5390-4393-a180-2c9dd7ed81c7';

DELETE FROM public.contract_templates 
WHERE clinic_id != '4c13e586-5390-4393-a180-2c9dd7ed81c7';

-- 3. Atualizar Políticas de RLS nas 4 tabelas para reforço estrito
-- contract_templates
DROP POLICY IF EXISTS "Clinics manage their contract templates" ON public.contract_templates;
CREATE POLICY "Clinics manage their contract templates"
ON public.contract_templates
FOR ALL
TO authenticated
USING (
    clinic_id = '4c13e586-5390-4393-a180-2c9dd7ed81c7'
    AND (
        clinic_id = (SELECT clinic_id FROM public.users WHERE id = auth.uid())
        OR (SELECT role FROM public.users WHERE id = auth.uid()) = 'SUPER_ADMIN'
    )
)
WITH CHECK (
    clinic_id = '4c13e586-5390-4393-a180-2c9dd7ed81c7'
    AND (
        clinic_id = (SELECT clinic_id FROM public.users WHERE id = auth.uid())
        OR (SELECT role FROM public.users WHERE id = auth.uid()) = 'SUPER_ADMIN'
    )
);

-- contract_documents
DROP POLICY IF EXISTS "Clinics manage their contract documents" ON public.contract_documents;
CREATE POLICY "Clinics manage their contract documents"
ON public.contract_documents
FOR ALL
TO authenticated
USING (
    clinic_id = '4c13e586-5390-4393-a180-2c9dd7ed81c7'
    AND (
        clinic_id = (SELECT clinic_id FROM public.users WHERE id = auth.uid())
        OR (SELECT role FROM public.users WHERE id = auth.uid()) = 'SUPER_ADMIN'
    )
)
WITH CHECK (
    clinic_id = '4c13e586-5390-4393-a180-2c9dd7ed81c7'
    AND (
        clinic_id = (SELECT clinic_id FROM public.users WHERE id = auth.uid())
        OR (SELECT role FROM public.users WHERE id = auth.uid()) = 'SUPER_ADMIN'
    )
);

-- contract_signers
DROP POLICY IF EXISTS "Clinics manage their contract signers" ON public.contract_signers;
CREATE POLICY "Clinics manage their contract signers"
ON public.contract_signers
FOR ALL
TO authenticated
USING (
    clinic_id = '4c13e586-5390-4393-a180-2c9dd7ed81c7'
    AND (
        clinic_id = (SELECT clinic_id FROM public.users WHERE id = auth.uid())
        OR (SELECT role FROM public.users WHERE id = auth.uid()) = 'SUPER_ADMIN'
    )
)
WITH CHECK (
    clinic_id = '4c13e586-5390-4393-a180-2c9dd7ed81c7'
    AND (
        clinic_id = (SELECT clinic_id FROM public.users WHERE id = auth.uid())
        OR (SELECT role FROM public.users WHERE id = auth.uid()) = 'SUPER_ADMIN'
    )
);

-- contract_audit_events
DROP POLICY IF EXISTS "Clinics manage their contract audit events" ON public.contract_audit_events;
CREATE POLICY "Clinics manage their contract audit events"
ON public.contract_audit_events
FOR ALL
TO authenticated
USING (
    clinic_id = '4c13e586-5390-4393-a180-2c9dd7ed81c7'
    AND (
        clinic_id = (SELECT clinic_id FROM public.users WHERE id = auth.uid())
        OR (SELECT role FROM public.users WHERE id = auth.uid()) = 'SUPER_ADMIN'
    )
)
WITH CHECK (
    clinic_id = '4c13e586-5390-4393-a180-2c9dd7ed81c7'
    AND (
        clinic_id = (SELECT clinic_id FROM public.users WHERE id = auth.uid())
        OR (SELECT role FROM public.users WHERE id = auth.uid()) = 'SUPER_ADMIN'
    )
);
