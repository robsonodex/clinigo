-- CliniGo Fase 1: Portal CliniGo Família e Links Temporários Escola/Neuropediatra (LGPD + Multi-Tenant)
-- Script reverso (down): DROP TABLE IF EXISTS public.family_portal_shares CASCADE;

CREATE TABLE IF NOT EXISTS public.family_portal_shares (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
    patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
    especialidade text,
    token text NOT NULL UNIQUE,
    share_type text NOT NULL DEFAULT 'family' CHECK (share_type IN ('family', 'school_doctor')),
    recipient_name text,
    recipient_phone text,
    title text NOT NULL,
    intro_message text,
    summary_highlights jsonb NOT NULL DEFAULT '[]'::jsonb,
    progress_snapshot jsonb NOT NULL DEFAULT '[]'::jsonb,
    home_activity_title text,
    home_activity_instructions text,
    home_activity_completed boolean NOT NULL DEFAULT false,
    home_activity_completed_at timestamptz,
    home_activity_feedback text,
    parent_consent_confirmed boolean NOT NULL DEFAULT false,
    parent_consent_note text,
    expires_at timestamptz NOT NULL,
    revoked_at timestamptz,
    view_count integer NOT NULL DEFAULT 0,
    last_viewed_at timestamptz,
    whatsapp_sent_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_family_portal_shares_clinic_patient
    ON public.family_portal_shares (clinic_id, patient_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_family_portal_shares_expires_at
    ON public.family_portal_shares (expires_at);

ALTER TABLE public.family_portal_shares ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "family_portal_shares_clinic_isolation" ON public.family_portal_shares;
CREATE POLICY "family_portal_shares_clinic_isolation"
    ON public.family_portal_shares
    FOR ALL
    TO authenticated
    USING (
        clinic_id = (
            SELECT u.clinic_id
            FROM public.users u
            WHERE u.id = (SELECT auth.uid())
        )
    )
    WITH CHECK (
        clinic_id = (
            SELECT u.clinic_id
            FROM public.users u
            WHERE u.id = (SELECT auth.uid())
        )
    );

DROP POLICY IF EXISTS "family_portal_shares_super_admin" ON public.family_portal_shares;
CREATE POLICY "family_portal_shares_super_admin"
    ON public.family_portal_shares
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM public.users u
            WHERE u.id = (SELECT auth.uid())
              AND u.role = 'SUPER_ADMIN'::public.user_role
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1
            FROM public.users u
            WHERE u.id = (SELECT auth.uid())
              AND u.role = 'SUPER_ADMIN'::public.user_role
        )
    );

COMMENT ON TABLE public.family_portal_shares IS 'Boletins CliniGo Família e links temporários (7 dias) para escola/neuropediatra com minimização LGPD e retorno Atividade de Casa.';
