-- Migration: 20260925170000_allow_receptionist_update_clinic_basic_info.sql
-- Description: Allow RECEPTIONIST role to update basic clinic info (name, slug, email, phone, address, primary_color, cnpj, whatsapp_number, professional_label, council_label)
-- with multi-tenant isolation (only their own clinic) and strict column-level protection via trigger.

-- 1. Create RLS policy for RECEPTIONIST update on own clinic
DROP POLICY IF EXISTS "receptionist_update_own_clinic" ON public.clinics;
CREATE POLICY "receptionist_update_own_clinic" ON public.clinics
FOR UPDATE
TO authenticated
USING (
    id IN (
        SELECT u.clinic_id 
        FROM public.users u 
        WHERE u.id = auth.uid() 
          AND u.role = 'RECEPTIONIST'
    )
)
WITH CHECK (
    id IN (
        SELECT u.clinic_id 
        FROM public.users u 
        WHERE u.id = auth.uid() 
          AND u.role = 'RECEPTIONIST'
    )
);

-- 2. Trigger function to prevent RECEPTIONIST from altering billing, plan, or credentials columns
CREATE OR REPLACE FUNCTION public.check_receptionist_clinic_update_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_role TEXT;
BEGIN
    SELECT u.role INTO v_role
    FROM public.users u
    WHERE u.id = auth.uid();

    IF v_role = 'RECEPTIONIST' THEN
        IF (OLD.plan_type IS DISTINCT FROM NEW.plan_type) OR
           (OLD.plan_limits IS DISTINCT FROM NEW.plan_limits) OR
           (OLD.is_active IS DISTINCT FROM NEW.is_active) OR
           (OLD.approval_status IS DISTINCT FROM NEW.approval_status) OR
           (OLD.custom_price IS DISTINCT FROM NEW.custom_price) OR
           (OLD.addons IS DISTINCT FROM NEW.addons) OR
           (OLD.subscription_due_date IS DISTINCT FROM NEW.subscription_due_date) OR
           (OLD.payment_confirmed IS DISTINCT FROM NEW.payment_confirmed) OR
           (OLD.mercadopago_access_token IS DISTINCT FROM NEW.mercadopago_access_token) OR
           (OLD.mercadopago_public_key IS DISTINCT FROM NEW.mercadopago_public_key) OR
           (OLD.mercadopago_webhook_secret IS DISTINCT FROM NEW.mercadopago_webhook_secret) OR
           (OLD.inter_client_id IS DISTINCT FROM NEW.inter_client_id) OR
           (OLD.inter_client_secret IS DISTINCT FROM NEW.inter_client_secret) OR
           (OLD.inter_cert_content IS DISTINCT FROM NEW.inter_cert_content) OR
           (OLD.inter_key_content IS DISTINCT FROM NEW.inter_key_content) OR
           (OLD.api_key IS DISTINCT FROM NEW.api_key) OR
           (OLD.webhook_secret IS DISTINCT FROM NEW.webhook_secret) OR
           (OLD.logo_url IS DISTINCT FROM NEW.logo_url) THEN
            RAISE EXCEPTION 'Perfil RECEPTIONIST não tem permissão para alterar colunas restritas da clínica.'
                USING ERRCODE = '42501';
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_receptionist_clinic_update ON public.clinics;
CREATE TRIGGER trg_check_receptionist_clinic_update
BEFORE UPDATE ON public.clinics
FOR EACH ROW
EXECUTE FUNCTION public.check_receptionist_clinic_update_columns();
