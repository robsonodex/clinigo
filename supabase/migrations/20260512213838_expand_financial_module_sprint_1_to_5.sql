-- SPRINT 1: Regras de Repasse por Convênio
CREATE TABLE IF NOT EXISTS doctor_contract_insurance_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  doctor_contract_id UUID NOT NULL REFERENCES doctor_contracts(id) ON DELETE CASCADE,
  health_insurance_id UUID REFERENCES health_insurances(id) ON DELETE SET NULL,
  payment_type TEXT NOT NULL, -- 'particular' | 'insurance' | 'reimbursement'
  percentage NUMERIC(5,2) NOT NULL, -- ex: 45.00
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE doctor_contract_insurance_rules ENABLE ROW LEVEL SECURITY;
-- Note: Assuming get_user_clinic_id() or similar is already defined in the schema.
-- If not, falling back to a direct check if possible, or assume it's created.
CREATE POLICY "clinic_isolation_doctor_contract_insurance_rules" ON doctor_contract_insurance_rules
  USING (clinic_id = (SELECT clinic_id FROM users WHERE id = auth.uid()));


-- SPRINT 2: Metas Financeiras
CREATE TABLE IF NOT EXISTS financial_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  doctor_id UUID REFERENCES doctors(id) ON DELETE SET NULL, -- NULL = meta da clínica toda
  month INTEGER NOT NULL, -- 1-12
  year INTEGER NOT NULL,
  goal_type TEXT NOT NULL DEFAULT 'revenue', -- 'revenue' | 'appointments'
  target_value NUMERIC(12,2) NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(clinic_id, doctor_id, month, year, goal_type)
);

ALTER TABLE financial_goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "clinic_isolation_financial_goals" ON financial_goals
  USING (clinic_id = (SELECT clinic_id FROM users WHERE id = auth.uid()));


-- SPRINT 3: Centros de Custo e Alterações em Financial Entries
CREATE TABLE IF NOT EXISTS cost_centers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  name TEXT NOT NULL,           -- ex: 'Psicologia', 'Fisioterapia'
  description TEXT,
  color TEXT DEFAULT '#6366f1',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE cost_centers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "clinic_isolation_cost_centers" ON cost_centers
  USING (clinic_id = (SELECT clinic_id FROM users WHERE id = auth.uid()));

-- Adicionar colunas na financial_entries
ALTER TABLE financial_entries ADD COLUMN IF NOT EXISTS cost_center_id UUID REFERENCES cost_centers(id);
ALTER TABLE financial_entries ADD COLUMN IF NOT EXISTS entry_nature TEXT DEFAULT 'variable'; -- 'fixed' | 'variable'
ALTER TABLE financial_entries ADD COLUMN IF NOT EXISTS supplier TEXT; -- fornecedor/CNPJ para despesas
-- Garantir que temos link com convênio caso não exista (segundo prompt isso ajuda na análise de DRE mix)
ALTER TABLE financial_entries ADD COLUMN IF NOT EXISTS health_insurance_id UUID REFERENCES health_insurances(id) ON DELETE SET NULL;


-- SPRINT 4 & 5: Pacotes de Sessão, Despesas de Profissionais e Créditos de Paciente
ALTER TABLE session_packages ADD COLUMN IF NOT EXISTS total_value NUMERIC(10,2);
ALTER TABLE session_packages ADD COLUMN IF NOT EXISTS payment_type TEXT DEFAULT 'full'; -- 'full' | 'installments'
ALTER TABLE session_packages ADD COLUMN IF NOT EXISTS installments INTEGER DEFAULT 1;
ALTER TABLE session_packages ADD COLUMN IF NOT EXISTS financial_entry_id UUID REFERENCES financial_entries(id);

CREATE TABLE IF NOT EXISTS doctor_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  financial_entry_id UUID REFERENCES financial_entries(id),
  description TEXT NOT NULL,
  expense_category TEXT DEFAULT 'outros', -- 'room_rent', 'supervision', 'materials', 'outros'
  amount NUMERIC(10,2) NOT NULL,
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  deduct_from_payroll BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE doctor_expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "clinic_isolation_doctor_expenses" ON doctor_expenses
  USING (clinic_id = (SELECT clinic_id FROM users WHERE id = auth.uid()));


CREATE TABLE IF NOT EXISTS patient_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  amount NUMERIC(10,2) NOT NULL,
  reason TEXT NOT NULL,  -- 'devolucao' | 'cortesia' | 'pre-pago'
  origin_entry_id UUID REFERENCES financial_entries(id),
  used_at TIMESTAMPTZ,
  used_entry_id UUID REFERENCES financial_entries(id),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE patient_credits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "clinic_isolation_patient_credits" ON patient_credits
  USING (clinic_id = (SELECT clinic_id FROM users WHERE id = auth.uid()));


-- TERAPIA ESPECÍFICO: Adicionando abordagem terapêutica nos doutores para analises granulares de DRE
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS therapeutic_approach TEXT;
