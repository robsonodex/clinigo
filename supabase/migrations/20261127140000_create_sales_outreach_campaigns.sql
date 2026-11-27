-- ============================================================================
-- CliniGO — Automação Comercial de Disparo B2B (Super Admin / Sales HQ)
-- Tabelas: sales_outreach_campaigns, sales_outreach_recipients, sales_outreach_suppressions
-- Isolamento total: RLS exclusivo is_super_admin(), índice parcial + pg_cron gate
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.sales_outreach_campaigns (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    status text NOT NULL DEFAULT 'DRAFT'
        CHECK (status IN ('DRAFT', 'RUNNING', 'PAUSED', 'COMPLETED', 'CANCELLED')),
    delivery_mode text NOT NULL DEFAULT 'BOTH'
        CHECK (delivery_mode IN ('ATTACHMENT', 'TRACKED_LINK', 'BOTH')),
    vault_document_id uuid REFERENCES public.sales_vault_documents(id) ON DELETE SET NULL,
    subject_step1 text NOT NULL,
    body_step1 text NOT NULL,
    enable_cadence boolean NOT NULL DEFAULT true,
    subject_step2 text NOT NULL DEFAULT '',
    body_step2 text NOT NULL DEFAULT '',
    step2_delay_days integer NOT NULL DEFAULT 3 CHECK (step2_delay_days BETWEEN 1 AND 30),
    subject_step3 text NOT NULL DEFAULT '',
    body_step3 text NOT NULL DEFAULT '',
    step3_delay_days integer NOT NULL DEFAULT 7 CHECK (step3_delay_days BETWEEN 2 AND 60),
    daily_limit integer NOT NULL DEFAULT 40 CHECK (daily_limit BETWEEN 5 AND 200),
    min_interval_minutes integer NOT NULL DEFAULT 3 CHECK (min_interval_minutes BETWEEN 1 AND 60),
    max_interval_minutes integer NOT NULL DEFAULT 6 CHECK (max_interval_minutes BETWEEN 1 AND 120),
    business_hours_only boolean NOT NULL DEFAULT true,
    send_start_hour integer NOT NULL DEFAULT 8 CHECK (send_start_hour BETWEEN 0 AND 23),
    send_end_hour integer NOT NULL DEFAULT 18 CHECK (send_end_hour BETWEEN 1 AND 24),
    sender_name text NOT NULL DEFAULT 'Robson Oliveira',
    sender_role text NOT NULL DEFAULT 'Diretor',
    sender_phone text NOT NULL DEFAULT '(21) 96696-0684',
    sender_email text NOT NULL DEFAULT 'contato@clinigo.app',
    total_recipients integer NOT NULL DEFAULT 0,
    sent_count integer NOT NULL DEFAULT 0,
    failed_count integer NOT NULL DEFAULT 0,
    opened_count integer NOT NULL DEFAULT 0,
    replied_count integer NOT NULL DEFAULT 0,
    last_run_at timestamptz,
    created_by uuid,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.sales_outreach_recipients (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id uuid NOT NULL REFERENCES public.sales_outreach_campaigns(id) ON DELETE CASCADE,
    prospect_id uuid REFERENCES public.sales_prospects(id) ON DELETE SET NULL,
    email text NOT NULL,
    contact_name text NOT NULL DEFAULT '',
    clinic_name text NOT NULL DEFAULT '',
    phone text NOT NULL DEFAULT '',
    tracking_token text NOT NULL UNIQUE,
    status text NOT NULL DEFAULT 'PENDING'
        CHECK (status IN (
            'PENDING',
            'SENDING',
            'SENT',
            'FOLLOWUP_1_SENT',
            'FOLLOWUP_2_SENT',
            'REPLIED',
            'UNSUBSCRIBED',
            'FAILED',
            'SKIPPED'
        )),
    current_step integer NOT NULL DEFAULT 0 CHECK (current_step BETWEEN 0 AND 3),
    next_send_at timestamptz,
    last_sent_at timestamptz,
    last_message_id text,
    last_error text,
    view_count integer NOT NULL DEFAULT 0,
    first_viewed_at timestamptz,
    last_viewed_at timestamptz,
    cta_clicks integer NOT NULL DEFAULT 0,
    mx_valid boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT uq_sales_outreach_campaign_email UNIQUE (campaign_id, email)
);

CREATE TABLE IF NOT EXISTS public.sales_outreach_suppressions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email text NOT NULL UNIQUE,
    reason text NOT NULL DEFAULT 'UNSUBSCRIBED'
        CHECK (reason IN ('UNSUBSCRIBED', 'BOUNCE', 'MANUAL')),
    source_campaign_id uuid REFERENCES public.sales_outreach_campaigns(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sales_outreach_campaigns_status
    ON public.sales_outreach_campaigns(status, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_sales_outreach_campaigns_vault_doc
    ON public.sales_outreach_campaigns(vault_document_id)
    WHERE vault_document_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_sales_outreach_recipients_campaign
    ON public.sales_outreach_recipients(campaign_id, status);

CREATE INDEX IF NOT EXISTS idx_sales_outreach_recipients_prospect
    ON public.sales_outreach_recipients(prospect_id)
    WHERE prospect_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_sales_outreach_recipients_email
    ON public.sales_outreach_recipients(lower(email));

CREATE INDEX IF NOT EXISTS idx_sales_outreach_queue_pending
    ON public.sales_outreach_recipients(next_send_at)
    WHERE status IN ('PENDING', 'SENT', 'FOLLOWUP_1_SENT') AND next_send_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_sales_outreach_suppressions_source
    ON public.sales_outreach_suppressions(source_campaign_id)
    WHERE source_campaign_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.update_sales_outreach_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
    NEW.updated_at := now();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sales_outreach_campaigns_updated_at ON public.sales_outreach_campaigns;
CREATE TRIGGER trg_sales_outreach_campaigns_updated_at
    BEFORE UPDATE ON public.sales_outreach_campaigns
    FOR EACH ROW EXECUTE FUNCTION public.update_sales_outreach_updated_at();

DROP TRIGGER IF EXISTS trg_sales_outreach_recipients_updated_at ON public.sales_outreach_recipients;
CREATE TRIGGER trg_sales_outreach_recipients_updated_at
    BEFORE UPDATE ON public.sales_outreach_recipients
    FOR EACH ROW EXECUTE FUNCTION public.update_sales_outreach_updated_at();

ALTER TABLE public.sales_outreach_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_outreach_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_outreach_suppressions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sales_outreach_campaigns_super_admin_all ON public.sales_outreach_campaigns;
CREATE POLICY sales_outreach_campaigns_super_admin_all
    ON public.sales_outreach_campaigns
    FOR ALL
    USING ((SELECT public.is_super_admin()))
    WITH CHECK ((SELECT public.is_super_admin()));

DROP POLICY IF EXISTS sales_outreach_recipients_super_admin_all ON public.sales_outreach_recipients;
CREATE POLICY sales_outreach_recipients_super_admin_all
    ON public.sales_outreach_recipients
    FOR ALL
    USING ((SELECT public.is_super_admin()))
    WITH CHECK ((SELECT public.is_super_admin()));

DROP POLICY IF EXISTS sales_outreach_suppressions_super_admin_all ON public.sales_outreach_suppressions;
CREATE POLICY sales_outreach_suppressions_super_admin_all
    ON public.sales_outreach_suppressions
    FOR ALL
    USING ((SELECT public.is_super_admin()))
    WITH CHECK ((SELECT public.is_super_admin()));

CREATE OR REPLACE FUNCTION public.trigger_sales_outreach_worker()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, net, pg_temp
AS $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM public.sales_outreach_recipients r
        INNER JOIN public.sales_outreach_campaigns c ON c.id = r.campaign_id
        WHERE c.status = 'RUNNING'
          AND r.status IN ('PENDING', 'SENT', 'FOLLOWUP_1_SENT')
          AND r.next_send_at IS NOT NULL
          AND r.next_send_at <= now()
    ) THEN
        PERFORM net.http_get(
            url := 'https://clinigo.app/api/cron/sales-outreach',
            timeout_milliseconds := 25000
        );
    END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.trigger_sales_outreach_worker() FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.trigger_sales_outreach_worker() TO postgres;

DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT jobid
        FROM cron.job
        WHERE jobname = 'sales-outreach-gate'
           OR command LIKE '%trigger_sales_outreach_worker%'
    ) LOOP
        PERFORM cron.unschedule(r.jobid);
    END LOOP;
END $$;

SELECT cron.schedule(
    'sales-outreach-gate',
    '*/2 * * * *',
    $$ SELECT public.trigger_sales_outreach_worker(); $$
);

/*
-- ROLLBACK SQL:
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN (SELECT jobid FROM cron.job WHERE jobname = 'sales-outreach-gate') LOOP
    PERFORM cron.unschedule(r.jobid);
  END LOOP;
END $$;
DROP FUNCTION IF EXISTS public.trigger_sales_outreach_worker();
DROP TRIGGER IF EXISTS trg_sales_outreach_recipients_updated_at ON public.sales_outreach_recipients;
DROP TRIGGER IF EXISTS trg_sales_outreach_campaigns_updated_at ON public.sales_outreach_campaigns;
DROP FUNCTION IF EXISTS public.update_sales_outreach_updated_at();
DROP TABLE IF EXISTS public.sales_outreach_recipients;
DROP TABLE IF EXISTS public.sales_outreach_suppressions;
DROP TABLE IF EXISTS public.sales_outreach_campaigns;
*/

