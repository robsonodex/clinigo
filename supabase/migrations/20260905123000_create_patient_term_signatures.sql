-- Migration: 20260905123000_create_patient_term_signatures.sql
-- Descrição: Tabelas para modelos de documentos da clínica e termos/contratos assinados pelos pais com validade jurídica

-- 1. Tabela de Modelos de Documentos da Clínica
CREATE TABLE IF NOT EXISTS public.clinic_document_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'termo_aceite', -- 'normas_clinica', 'contrato', 'autorizacao_imagem', 'lgpd', 'termo_aceite'
    description TEXT,
    content TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_clinic_document_templates_clinic_id 
    ON public.clinic_document_templates(clinic_id);

-- 2. Tabela de Termos e Contratos Emitidos para Assinatura dos Pais
CREATE TABLE IF NOT EXISTS public.patient_term_signatures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    template_id UUID REFERENCES public.clinic_document_templates(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'termo_aceite',
    document_content TEXT NOT NULL,
    signer_name TEXT NOT NULL,
    signer_cpf TEXT,
    signer_phone TEXT,
    signer_email TEXT,
    status TEXT NOT NULL DEFAULT 'PENDING', -- 'PENDING', 'SIGNED', 'REJECTED', 'EXPIRED'
    signing_token UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
    signature_data_url TEXT,
    signed_at TIMESTAMPTZ,
    signed_ip TEXT,
    signed_user_agent TEXT,
    security_hash TEXT,
    expires_at TIMESTAMPTZ DEFAULT (now() + interval '30 days'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_patient_term_signatures_clinic_id 
    ON public.patient_term_signatures(clinic_id);
CREATE INDEX IF NOT EXISTS idx_patient_term_signatures_patient_id 
    ON public.patient_term_signatures(patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_term_signatures_token 
    ON public.patient_term_signatures(signing_token);

-- 3. Habilitar RLS
ALTER TABLE public.clinic_document_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_term_signatures ENABLE ROW LEVEL SECURITY;

-- 4. Policies para clinic_document_templates
CREATE POLICY "Clinics can manage their own document templates"
    ON public.clinic_document_templates
    FOR ALL
    TO authenticated
    USING (
        clinic_id IN (
            SELECT clinic_id FROM public.users WHERE id = auth.uid()
        )
        OR (SELECT role FROM public.users WHERE id = auth.uid()) = 'SUPER_ADMIN'
    )
    WITH CHECK (
        clinic_id IN (
            SELECT clinic_id FROM public.users WHERE id = auth.uid()
        )
        OR (SELECT role FROM public.users WHERE id = auth.uid()) = 'SUPER_ADMIN'
    );

-- 5. Policies para patient_term_signatures (Authenticated Staff)
CREATE POLICY "Clinics can manage their patient term signatures"
    ON public.patient_term_signatures
    FOR ALL
    TO authenticated
    USING (
        clinic_id IN (
            SELECT clinic_id FROM public.users WHERE id = auth.uid()
        )
        OR (SELECT role FROM public.users WHERE id = auth.uid()) = 'SUPER_ADMIN'
    )
    WITH CHECK (
        clinic_id IN (
            SELECT clinic_id FROM public.users WHERE id = auth.uid()
        )
        OR (SELECT role FROM public.users WHERE id = auth.uid()) = 'SUPER_ADMIN'
    );
