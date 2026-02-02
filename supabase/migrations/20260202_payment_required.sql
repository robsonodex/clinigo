-- =====================================================
-- Migration: Payment Required System
-- Version: 20260202_payment_required
-- Description: Adds payment_confirmed column and payment_logs table
-- =====================================================

-- =====================================================
-- 1. Add columns to clinics table
-- =====================================================

-- Main payment confirmation flag
ALTER TABLE clinics
ADD COLUMN IF NOT EXISTS payment_confirmed BOOLEAN DEFAULT FALSE;

-- Payment method tracking
ALTER TABLE clinics
ADD COLUMN IF NOT EXISTS payment_method VARCHAR(20);

-- Timestamp when payment was confirmed
ALTER TABLE clinics
ADD COLUMN IF NOT EXISTS payment_confirmed_at TIMESTAMPTZ;

-- Mercado Pago payment ID for reference
ALTER TABLE clinics
ADD COLUMN IF NOT EXISTS mercadopago_payment_id VARCHAR(255);

-- Mercado Pago subscription ID (for recurring payments)
ALTER TABLE clinics
ADD COLUMN IF NOT EXISTS mercadopago_subscription_id VARCHAR(255);

-- Payment expiration date (for boletos)
ALTER TABLE clinics
ADD COLUMN IF NOT EXISTS payment_expiration_date DATE;

-- Comments for documentation
COMMENT ON COLUMN clinics.payment_confirmed IS 'TRUE = pode usar sistema, FALSE = bloqueado até pagar';
COMMENT ON COLUMN clinics.payment_method IS 'Método de pagamento: CREDIT_CARD, BOLETO, PIX';
COMMENT ON COLUMN clinics.payment_confirmed_at IS 'Data/hora da confirmação do pagamento';
COMMENT ON COLUMN clinics.mercadopago_payment_id IS 'ID do pagamento no Mercado Pago';
COMMENT ON COLUMN clinics.payment_expiration_date IS 'Data de expiração (para boletos)';

-- =====================================================
-- 2. Create indexes for performance
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_clinics_payment_confirmed 
ON clinics(payment_confirmed);

CREATE INDEX IF NOT EXISTS idx_clinics_payment_status 
ON clinics(payment_status);

CREATE INDEX IF NOT EXISTS idx_clinics_mercadopago_payment_id 
ON clinics(mercadopago_payment_id);

-- =====================================================
-- 3. Create payment_logs table for webhook history
-- =====================================================

CREATE TABLE IF NOT EXISTS payment_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE,
    payment_id VARCHAR(255) NOT NULL,
    payment_method VARCHAR(20) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    status VARCHAR(50) NOT NULL,
    mercadopago_status VARCHAR(50),
    raw_webhook_data JSONB,
    email_sent BOOLEAN DEFAULT FALSE,
    email_sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for payment_logs
CREATE INDEX IF NOT EXISTS idx_payment_logs_clinic_id 
ON payment_logs(clinic_id);

CREATE INDEX IF NOT EXISTS idx_payment_logs_payment_id 
ON payment_logs(payment_id);

CREATE INDEX IF NOT EXISTS idx_payment_logs_created_at 
ON payment_logs(created_at DESC);

-- Comments
COMMENT ON TABLE payment_logs IS 'Log de todos os pagamentos e webhooks recebidos do Mercado Pago';
COMMENT ON COLUMN payment_logs.payment_id IS 'ID do pagamento no Mercado Pago';
COMMENT ON COLUMN payment_logs.status IS 'Status interno: PENDING, APPROVED, REJECTED, CANCELLED, EXPIRED';
COMMENT ON COLUMN payment_logs.mercadopago_status IS 'Status original do Mercado Pago';
COMMENT ON COLUMN payment_logs.raw_webhook_data IS 'Dados brutos do webhook para debug';

-- =====================================================
-- 4. Enable RLS for payment_logs
-- =====================================================

ALTER TABLE payment_logs ENABLE ROW LEVEL SECURITY;

-- Admin can see all
CREATE POLICY "Super admins can view all payment_logs" ON payment_logs
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'SUPER_ADMIN'
        )
    );

-- Clinic admin can see their own clinic's logs
CREATE POLICY "Clinic admins can view own payment_logs" ON payment_logs
    FOR SELECT
    TO authenticated
    USING (
        clinic_id IN (
            SELECT clinic_id FROM users 
            WHERE users.id = auth.uid()
        )
    );

-- Service role can do everything (for webhook processing)
CREATE POLICY "Service role can manage payment_logs" ON payment_logs
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- =====================================================
-- 5. Set existing active clinics as payment_confirmed
-- (Migration only - existing clinics with active status)
-- =====================================================

UPDATE clinics 
SET payment_confirmed = TRUE 
WHERE is_active = TRUE 
AND payment_confirmed IS NULL;

-- =====================================================
-- Done!
-- =====================================================
