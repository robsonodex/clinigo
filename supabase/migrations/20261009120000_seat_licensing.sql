-- =============================================================================
-- Migration: 20261009120000_seat_licensing.sql
-- Descricao: Licenciamento por assento com licenca adicional transparente
-- Multi-tenant: Isolamento estrito com RLS, idempotencia e auditoria imutavel
-- =============================================================================

-- 1. Colunas opcionais de negociacao comercial em clinics
ALTER TABLE public.clinics
    ADD COLUMN IF NOT EXISTS seat_price_override_cents INTEGER DEFAULT NULL;

ALTER TABLE public.clinics
    ADD COLUMN IF NOT EXISTS seat_overage_waived BOOLEAN NOT NULL DEFAULT FALSE;

-- Comentarios documentando o proposito das colunas
COMMENT ON COLUMN public.clinics.seat_price_override_cents IS 'Preco unitario negociado por licenca extra em centavos. NULL assume R$ 49,90.';
COMMENT ON COLUMN public.clinics.seat_overage_waived IS 'Flag de cortesia comercial: permite exceder licencas sem cobranca financeira, mantendo registro probatorio.';

-- 2. Tabela de eventos probatorios imutaveis de licenciamento por assento
CREATE TABLE IF NOT EXISTS public.seat_billing_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
    actor_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    target_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    plan VARCHAR(50) NOT NULL,
    included_seats INTEGER,
    seats_before INTEGER NOT NULL,
    seats_after INTEGER NOT NULL,
    extra_seats_before INTEGER NOT NULL DEFAULT 0,
    extra_seats_after INTEGER NOT NULL DEFAULT 0,
    unit_price_cents INTEGER NOT NULL DEFAULT 4990,
    monthly_before_cents INTEGER NOT NULL,
    monthly_after_cents INTEGER NOT NULL,
    quote_id VARCHAR(100) NOT NULL,
    idempotency_key VARCHAR(120) NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'COMMITTED' CHECK (status IN ('COMMITTED', 'VOIDED')),
    void_reason TEXT,
    voided_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_seat_billing_events_idempotency UNIQUE (idempotency_key)
);

-- Indices para alta performance de consulta e garantia de unicidade
CREATE INDEX IF NOT EXISTS idx_seat_billing_events_clinic_created 
    ON public.seat_billing_events(clinic_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_seat_billing_events_quote 
    ON public.seat_billing_events(quote_id);

-- 3. Row Level Security (RLS)
ALTER TABLE public.seat_billing_events ENABLE ROW LEVEL SECURITY;

-- Politica de leitura para CLINIC_ADMIN da propria clinica
DROP POLICY IF EXISTS "seat_billing_events_clinic_admin_select" ON public.seat_billing_events;
CREATE POLICY "seat_billing_events_clinic_admin_select"
    ON public.seat_billing_events
    FOR SELECT
    USING (
        clinic_id = (
            SELECT u.clinic_id 
            FROM public.users u 
            WHERE u.id = auth.uid()
        )
    );

-- Politica de leitura irrestrita para SUPER_ADMIN
DROP POLICY IF EXISTS "seat_billing_events_super_admin_select" ON public.seat_billing_events;
CREATE POLICY "seat_billing_events_super_admin_select"
    ON public.seat_billing_events
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 
            FROM public.users u 
            WHERE u.id = auth.uid() AND u.role = 'SUPER_ADMIN'
        )
    );

-- Observacao de seguranca: NENHUMA politica de INSERT, UPDATE ou DELETE e concedida para public/authenticated.
-- A escrita e exclusividade do service role (backend seguro), garantindo a imutabilidade do registro probatorio.
