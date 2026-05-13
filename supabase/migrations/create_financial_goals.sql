-- Tabela de Metas Financeiras (Previsto vs Realizado)
CREATE TABLE IF NOT EXISTS public.financial_goals (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    clinic_id UUID REFERENCES public.clinics(id) ON DELETE CASCADE,
    year INT NOT NULL,
    month INT NOT NULL,
    target_revenue DECIMAL(10, 2) DEFAULT 0,
    target_expenses DECIMAL(10, 2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    UNIQUE(clinic_id, year, month)
);

-- RLS
ALTER TABLE public.financial_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for authenticated users in same clinic"
    ON public.financial_goals FOR SELECT
    USING (auth.uid() IN (
        SELECT id FROM users WHERE clinic_id = financial_goals.clinic_id
    ));

CREATE POLICY "Enable insert access for clinic admins"
    ON public.financial_goals FOR INSERT
    WITH CHECK (auth.uid() IN (
        SELECT id FROM users WHERE clinic_id = financial_goals.clinic_id AND role IN ('CLINIC_ADMIN', 'SUPER_ADMIN')
    ));

CREATE POLICY "Enable update access for clinic admins"
    ON public.financial_goals FOR UPDATE
    USING (auth.uid() IN (
        SELECT id FROM users WHERE clinic_id = financial_goals.clinic_id AND role IN ('CLINIC_ADMIN', 'SUPER_ADMIN')
    ));
