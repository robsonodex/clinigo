-- Migration: 20260905180000_create_professional_financial_documents.sql
-- Description: Criação da tabela de Demonstrativos Financeiros e Notas Fiscais mensais de repasse dos profissionais
-- Autor: Clinigo IA Protocol v5.2

CREATE TABLE IF NOT EXISTS public.professional_financial_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
    doctor_id UUID NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
    month_reference TEXT NOT NULL, -- Formato: 'YYYY-MM', ex: '2026-09'
    year INTEGER NOT NULL,
    month INTEGER NOT NULL,
    
    -- Status do fluxo financeiro
    -- 'PENDING_STATEMENT', 'PENDING_INVOICE', 'INVOICE_SENT', 'INVOICE_APPROVED', 'INVOICE_REJECTED', 'PAID'
    status TEXT NOT NULL DEFAULT 'PENDING_INVOICE',
    
    -- Demonstrativo Financeiro (Inserido pela Clínica / Patrícia)
    statement_amount NUMERIC(12, 2) DEFAULT 0,
    statement_gross_amount NUMERIC(12, 2) DEFAULT 0,
    statement_deductions NUMERIC(12, 2) DEFAULT 0,
    statement_file_url TEXT,
    statement_file_name TEXT,
    statement_notes TEXT,
    statement_uploaded_at TIMESTAMPTZ,
    statement_uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    
    -- Nota Fiscal (Inserida pelo Profissional)
    invoice_file_url TEXT,
    invoice_file_name TEXT,
    invoice_number TEXT,
    invoice_amount NUMERIC(12, 2) DEFAULT 0,
    invoice_issue_date DATE,
    invoice_uploaded_at TIMESTAMPTZ,
    invoice_uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    
    -- Resolução de Pendências & Pagamento
    rejection_reason TEXT,
    paid_at TIMESTAMPTZ,
    paid_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    CONSTRAINT uq_prof_fin_doc_month UNIQUE (clinic_id, doctor_id, month_reference)
);

-- Índices de performance
CREATE INDEX IF NOT EXISTS idx_prof_fin_doc_clinic_month ON public.professional_financial_documents(clinic_id, month_reference);
CREATE INDEX IF NOT EXISTS idx_prof_fin_doc_doctor ON public.professional_financial_documents(doctor_id);
CREATE INDEX IF NOT EXISTS idx_prof_fin_doc_status ON public.professional_financial_documents(status);

-- RLS
ALTER TABLE public.professional_financial_documents ENABLE ROW LEVEL SECURITY;

-- Política de Leitura
CREATE POLICY "Leitura de documentos financeiros por clínica ou doutor"
    ON public.professional_financial_documents
    FOR SELECT
    USING (
        clinic_id IN (SELECT clinic_id FROM public.users WHERE id = auth.uid())
        OR doctor_id IN (SELECT id FROM public.doctors WHERE user_id = auth.uid())
    );

-- Política de Inserção / Modificação para Administradores da Clínica
CREATE POLICY "Gestão total de documentos financeiros para admins da clínica"
    ON public.professional_financial_documents
    FOR ALL
    USING (
        clinic_id IN (
            SELECT clinic_id FROM public.users 
            WHERE id = auth.uid() 
            AND role IN ('CLINIC_ADMIN', 'RECEPTIONIST', 'SUPER_ADMIN')
        )
    );

-- Política de Atualização para o Doutor (Anexar Nota Fiscal)
CREATE POLICY "Doutor pode atualizar nota fiscal do seu próprio registro"
    ON public.professional_financial_documents
    FOR UPDATE
    USING (
        doctor_id IN (SELECT id FROM public.doctors WHERE user_id = auth.uid())
    )
    WITH CHECK (
        doctor_id IN (SELECT id FROM public.doctors WHERE user_id = auth.uid())
    );
