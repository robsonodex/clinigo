-- ============================================
-- CliniGo - Tables for Notifications and Integrations
-- Data: 2026-01-08
-- 
-- Este script garante que as tabelas necessárias existam
-- para suportar as páginas de Notificações e Integrações
-- ============================================

-- ============================================
-- 1. CLINIC_SETTINGS Table (Integration configuration)
-- ============================================
CREATE TABLE IF NOT EXISTS public.clinic_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
    
    -- Payment integrations
    mercadopago_access_token TEXT,
    mercadopago_webhook_secret TEXT,
    
    -- Video integrations  
    daily_api_key TEXT,
    google_calendar_token JSONB,
    
    -- Email integrations
    smtp_settings JSONB,
    resend_api_key TEXT,
    
    -- Messaging integrations
    whatsapp_api_key TEXT,
    whatsapp_phone_id TEXT,
    whatsapp_business_id TEXT,
    
    -- Analytics
    posthog_key TEXT,
    
    -- Webhooks
    webhook_url TEXT,
    webhook_events TEXT[] DEFAULT '{}',
    webhook_secret TEXT,
    
    -- Notification settings
    notification_settings JSONB DEFAULT '{
        "emailConfirmation": true,
        "emailReminder": true,
        "emailCancellation": true,
        "whatsappConfirmation": true,
        "whatsappReminder": true,
        "reminderHours": 24
    }'::jsonb,
    
    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    UNIQUE(clinic_id)
);

-- RLS Policies
ALTER TABLE public.clinic_settings ENABLE ROW LEVEL SECURITY;

-- Clinic admins can manage their settings
DROP POLICY IF EXISTS "clinic_settings_select" ON public.clinic_settings;
CREATE POLICY "clinic_settings_select" ON public.clinic_settings
    FOR SELECT USING (
        clinic_id IN (SELECT clinic_id FROM public.users WHERE id = auth.uid())
        OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'SUPER_ADMIN')
    );

DROP POLICY IF EXISTS "clinic_settings_insert" ON public.clinic_settings;
CREATE POLICY "clinic_settings_insert" ON public.clinic_settings
    FOR INSERT WITH CHECK (
        clinic_id IN (SELECT clinic_id FROM public.users WHERE id = auth.uid() AND role = 'CLINIC_ADMIN')
        OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'SUPER_ADMIN')
    );

DROP POLICY IF EXISTS "clinic_settings_update" ON public.clinic_settings;
CREATE POLICY "clinic_settings_update" ON public.clinic_settings
    FOR UPDATE USING (
        clinic_id IN (SELECT clinic_id FROM public.users WHERE id = auth.uid() AND role = 'CLINIC_ADMIN')
        OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'SUPER_ADMIN')
    );

-- ============================================
-- 2. NOTIFICATIONS Table (Track sent notifications)
-- ============================================
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
    
    -- Notification details
    type TEXT NOT NULL CHECK (type IN ('email', 'whatsapp', 'sms', 'push')),
    recipient TEXT NOT NULL,
    subject TEXT,
    content TEXT,
    
    -- Status tracking
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'delivered')),
    error_message TEXT,
    
    -- References
    appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
    patient_id UUID REFERENCES public.patients(id) ON DELETE SET NULL,
    
    -- Provider response
    provider_id TEXT,
    provider_response JSONB,
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    sent_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notifications_select" ON public.notifications;
CREATE POLICY "notifications_select" ON public.notifications
    FOR SELECT USING (
        clinic_id IN (SELECT clinic_id FROM public.users WHERE id = auth.uid())
        OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'SUPER_ADMIN')
    );

DROP POLICY IF EXISTS "notifications_insert" ON public.notifications;
CREATE POLICY "notifications_insert" ON public.notifications
    FOR INSERT WITH CHECK (
        clinic_id IN (SELECT clinic_id FROM public.users WHERE id = auth.uid())
        OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'SUPER_ADMIN')
    );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_notifications_clinic_id ON public.notifications(clinic_id);
CREATE INDEX IF NOT EXISTS idx_notifications_status ON public.notifications(status);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON public.notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);

-- ============================================
-- 3. FINANCIAL_ENTRIES Table (if not exists)
-- ============================================
CREATE TABLE IF NOT EXISTS public.financial_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
    
    -- Entry type
    type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
    category_id UUID,
    
    -- Amount
    amount DECIMAL(10,2) NOT NULL,
    currency TEXT DEFAULT 'BRL',
    
    -- Details
    description TEXT,
    reference_type TEXT,
    reference_id UUID,
    
    -- Payment details
    payment_method TEXT,
    payment_date DATE,
    due_date DATE,
    
    -- Status
    status TEXT DEFAULT 'confirmed' CHECK (status IN ('pending', 'confirmed', 'cancelled')),
    
    -- Relations
    patient_id UUID REFERENCES public.patients(id) ON DELETE SET NULL,
    appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
    doctor_id UUID,
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE public.financial_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "financial_entries_select" ON public.financial_entries;
CREATE POLICY "financial_entries_select" ON public.financial_entries
    FOR SELECT USING (
        clinic_id IN (SELECT clinic_id FROM public.users WHERE id = auth.uid())
        OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'SUPER_ADMIN')
    );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_financial_entries_clinic_id ON public.financial_entries(clinic_id);
CREATE INDEX IF NOT EXISTS idx_financial_entries_type ON public.financial_entries(type);
CREATE INDEX IF NOT EXISTS idx_financial_entries_payment_date ON public.financial_entries(payment_date);

-- ============================================
-- 4. AUDIT_LOGS Table (if not exists)
-- ============================================
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- User context
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    user_email TEXT,
    user_role TEXT,
    
    -- Action details
    action TEXT NOT NULL,
    entity_type TEXT,
    entity_id TEXT,
    
    -- Severity
    severity TEXT DEFAULT 'INFO' CHECK (severity IN ('INFO', 'WARNING', 'CRITICAL')),
    
    -- Request context
    ip_address TEXT,
    user_agent TEXT,
    
    -- Data
    metadata JSONB DEFAULT '{}',
    
    -- Timestamp
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_type ON public.audit_logs(entity_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

-- ============================================
-- 5. Verify tables exist
-- ============================================
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('clinic_settings', 'notifications', 'financial_entries', 'audit_logs')
ORDER BY table_name;
