-- ============================================
-- Scheduled Billings (Cobranças Agendadas)
-- Permite agendar cobranças de mensalidades para clínicas
-- e gerenciar esses agendamentos (pausar, retomar, cancelar)
-- ============================================

CREATE TABLE IF NOT EXISTS public.scheduled_billings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
    clinic_name TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    scheduled_for TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'paused', 'cancelled')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance nas consultas do Cron
CREATE INDEX IF NOT EXISTS idx_scheduled_billings_status_date ON public.scheduled_billings(status, scheduled_for) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_scheduled_billings_clinic_id ON public.scheduled_billings(clinic_id);

-- RLS: Habilitar
ALTER TABLE public.scheduled_billings ENABLE ROW LEVEL SECURITY;

-- Policy: Service role full access
CREATE POLICY "Service role full access on scheduled_billings"
    ON public.scheduled_billings
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Policy: Apenas SUPER_ADMIN pode ler/escrever via client autenticado se necessário
CREATE POLICY "Super admins full access on scheduled_billings"
    ON public.scheduled_billings
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid()
            AND role = 'SUPER_ADMIN'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid()
            AND role = 'SUPER_ADMIN'
        )
    );
