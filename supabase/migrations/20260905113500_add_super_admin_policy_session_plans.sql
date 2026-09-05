-- Migration: Permissão RLS para SUPER_ADMIN nas tabelas de planos de sessão
-- Data: 2026-09-05

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'planos_sessao' 
        AND policyname = 'Super Admins acessam planos de todas as clinicas autorizadas'
    ) THEN
        CREATE POLICY "Super Admins acessam planos de todas as clinicas autorizadas"
        ON public.planos_sessao
        FOR ALL TO authenticated
        USING (
            EXISTS (
                SELECT 1 FROM public.users 
                WHERE users.id = auth.uid() 
                AND users.role = 'SUPER_ADMIN'
            )
        );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'planos_sessao_capa' 
        AND policyname = 'Super Admins acessam capa de todas as clinicas autorizadas'
    ) THEN
        CREATE POLICY "Super Admins acessam capa de todas as clinicas autorizadas"
        ON public.planos_sessao_capa
        FOR ALL TO authenticated
        USING (
            EXISTS (
                SELECT 1 FROM public.users 
                WHERE users.id = auth.uid() 
                AND users.role = 'SUPER_ADMIN'
            )
        );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'auditoria_acesso_planos_sessao' 
        AND policyname = 'Super Admins acessam auditoria de todas as clinicas autorizadas'
    ) THEN
        CREATE POLICY "Super Admins acessam auditoria de todas as clinicas autorizadas"
        ON public.auditoria_acesso_planos_sessao
        FOR ALL TO authenticated
        USING (
            EXISTS (
                SELECT 1 FROM public.users 
                WHERE users.id = auth.uid() 
                AND users.role = 'SUPER_ADMIN'
            )
        );
    END IF;
END $$;
