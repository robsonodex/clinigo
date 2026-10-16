-- Migration: 20261016230001_create_platform_settings.sql
-- Descrição: Criação da tabela platform_settings para feature flags e modo de manutenção
-- Data: 2026-10-16

CREATE TABLE IF NOT EXISTS public.platform_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT NOT NULL UNIQUE,
    value JSONB NOT NULL,
    description TEXT,
    updated_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_platform_settings_key ON public.platform_settings(key);

ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

-- Política de leitura restrita a autenticados e service role
DROP POLICY IF EXISTS "platform_settings_read" ON public.platform_settings;
CREATE POLICY "platform_settings_read"
    ON public.platform_settings
    FOR SELECT
    TO authenticated
    USING (true);

-- Política de escrita exclusiva para Super Administradores
DROP POLICY IF EXISTS "platform_settings_super_admin_write" ON public.platform_settings;
CREATE POLICY "platform_settings_super_admin_write"
    ON public.platform_settings
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE public.users.id = auth.uid()
            AND public.users.role = 'SUPER_ADMIN'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE public.users.id = auth.uid()
            AND public.users.role = 'SUPER_ADMIN'
        )
    );

-- Inserir valor padrão de manutenção desativada
INSERT INTO public.platform_settings (key, value, description)
VALUES ('maintenance_mode', 'false'::jsonb, 'Controle global de modo de manutenção')
ON CONFLICT (key) DO NOTHING;
