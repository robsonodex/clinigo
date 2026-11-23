-- Libera o módulo de Contratos e Assinaturas Eletrônicas para todas as clínicas do CliniGo
-- mantendo isolamento multi-tenant estrito por clinic_id (ou SUPER_ADMIN).
-- Down script: restaurar filtro (clinic_id = '4c13e586-5390-4393-a180-2c9dd7ed81c7'::uuid AND (...)) nas 4 policies.

DROP POLICY IF EXISTS "Clinics manage their contract documents" ON public.contract_documents;
CREATE POLICY "Clinics manage their contract documents" ON public.contract_documents
FOR ALL
USING (
  clinic_id = (SELECT users.clinic_id FROM public.users WHERE users.id = auth.uid())
  OR (SELECT users.role FROM public.users WHERE users.id = auth.uid()) = 'SUPER_ADMIN'::user_role
)
WITH CHECK (
  clinic_id = (SELECT users.clinic_id FROM public.users WHERE users.id = auth.uid())
  OR (SELECT users.role FROM public.users WHERE users.id = auth.uid()) = 'SUPER_ADMIN'::user_role
);

DROP POLICY IF EXISTS "Clinics manage their contract templates" ON public.contract_templates;
CREATE POLICY "Clinics manage their contract templates" ON public.contract_templates
FOR ALL
USING (
  clinic_id = (SELECT users.clinic_id FROM public.users WHERE users.id = auth.uid())
  OR (SELECT users.role FROM public.users WHERE users.id = auth.uid()) = 'SUPER_ADMIN'::user_role
)
WITH CHECK (
  clinic_id = (SELECT users.clinic_id FROM public.users WHERE users.id = auth.uid())
  OR (SELECT users.role FROM public.users WHERE users.id = auth.uid()) = 'SUPER_ADMIN'::user_role
);

DROP POLICY IF EXISTS "Clinics manage their contract signers" ON public.contract_signers;
CREATE POLICY "Clinics manage their contract signers" ON public.contract_signers
FOR ALL
USING (
  clinic_id = (SELECT users.clinic_id FROM public.users WHERE users.id = auth.uid())
  OR (SELECT users.role FROM public.users WHERE users.id = auth.uid()) = 'SUPER_ADMIN'::user_role
)
WITH CHECK (
  clinic_id = (SELECT users.clinic_id FROM public.users WHERE users.id = auth.uid())
  OR (SELECT users.role FROM public.users WHERE users.id = auth.uid()) = 'SUPER_ADMIN'::user_role
);

DROP POLICY IF EXISTS "Clinics manage their contract audit events" ON public.contract_audit_events;
CREATE POLICY "Clinics manage their contract audit events" ON public.contract_audit_events
FOR ALL
USING (
  clinic_id = (SELECT users.clinic_id FROM public.users WHERE users.id = auth.uid())
  OR (SELECT users.role FROM public.users WHERE users.id = auth.uid()) = 'SUPER_ADMIN'::user_role
)
WITH CHECK (
  clinic_id = (SELECT users.clinic_id FROM public.users WHERE users.id = auth.uid())
  OR (SELECT users.role FROM public.users WHERE users.id = auth.uid()) = 'SUPER_ADMIN'::user_role
);
