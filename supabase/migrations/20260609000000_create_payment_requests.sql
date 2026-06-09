-- =====================================================
-- Migration: Create Payment Requests Table
-- Version: 20260609000000_create_payment_requests
-- Description: Creates table to store public billing payment links for Inter
-- =====================================================

CREATE TABLE IF NOT EXISTS public.payment_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID REFERENCES public.clinics(id) ON DELETE SET NULL,
    amount DECIMAL(10,2) NOT NULL,
    plan_type VARCHAR NOT NULL,
    description VARCHAR,
    mercadopago_preference_id VARCHAR, -- Stores nossoNumero for Inter compatibility
    mercadopago_init_point VARCHAR, -- Stores linhaDigitavel for Inter compatibility
    status VARCHAR DEFAULT 'PENDING',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for lookup
CREATE INDEX IF NOT EXISTS idx_payment_requests_clinic_id ON public.payment_requests(clinic_id);
CREATE INDEX IF NOT EXISTS idx_payment_requests_mercadopago_preference_id ON public.payment_requests(mercadopago_preference_id);

-- Enable Row Level Security
ALTER TABLE public.payment_requests ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Super admins can manage all payment_requests" ON public.payment_requests;
CREATE POLICY "Super admins can manage all payment_requests" ON public.payment_requests
    FOR ALL TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid() 
            AND users.role = 'SUPER_ADMIN'
        )
    );

DROP POLICY IF EXISTS "Service role can do everything on payment_requests" ON public.payment_requests;
CREATE POLICY "Service role can do everything on payment_requests" ON public.payment_requests
    FOR ALL TO service_role USING (true) WITH CHECK (true);
