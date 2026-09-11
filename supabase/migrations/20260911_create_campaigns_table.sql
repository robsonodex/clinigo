-- =============================================
-- Migration: Criação da Tabela de Campanhas (CRM)
-- Date: 2026-09-11
-- =============================================

CREATE TABLE IF NOT EXISTS public.campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    type TEXT NOT NULL DEFAULT 'WHATSAPP', -- 'WHATSAPP', 'EMAIL', 'PUSH'
    subject TEXT,
    content TEXT NOT NULL,
    sector TEXT DEFAULT 'financeiro',
    target_all_patients BOOLEAN DEFAULT true,
    target_tags UUID[] DEFAULT '{}',
    target_filters JSONB DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'DRAFT', -- 'DRAFT', 'SCHEDULED', 'RUNNING', 'COMPLETED', 'CANCELLED'
    scheduled_at TIMESTAMPTZ,
    total_recipients INTEGER DEFAULT 0,
    sent_count INTEGER DEFAULT 0,
    opened_count INTEGER DEFAULT 0,
    error_count INTEGER DEFAULT 0,
    last_sent_at TIMESTAMPTZ,
    created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para otimização de busca
CREATE INDEX IF NOT EXISTS idx_campaigns_clinic_id ON public.campaigns(clinic_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON public.campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_created_at ON public.campaigns(created_at DESC);

-- Habilitar Row Level Security (RLS)
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;

-- Política de RLS: Usuários autenticados acessam apenas campanhas de sua própria clínica
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'campaigns' AND policyname = 'campaigns_clinic_isolation_policy'
    ) THEN
        CREATE POLICY "campaigns_clinic_isolation_policy"
            ON public.campaigns
            FOR ALL
            USING (
                clinic_id = (SELECT clinic_id FROM public.users WHERE id = auth.uid())
            );
    END IF;
END $$;
