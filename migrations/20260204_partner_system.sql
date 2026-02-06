-- =============================================
-- SISTEMA DE PARCEIROS/AFILIADOS - CLINIGO
-- Data: 2026-02-04
-- Versão: 1.0
-- =============================================

-- 1. Criar tabela de parceiros
CREATE TABLE IF NOT EXISTS partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Dados pessoais
  full_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  cpf TEXT UNIQUE NOT NULL,
  phone TEXT NOT NULL,
  
  -- Código único do parceiro
  referral_code TEXT UNIQUE NOT NULL,
  
  -- Dados de pagamento
  pix_key_type TEXT CHECK (pix_key_type IN ('CPF', 'CNPJ', 'EMAIL', 'PHONE', 'RANDOM')),
  pix_key TEXT NOT NULL,
  
  -- Dados bancários (opcional, para CNPJ)
  cnpj TEXT UNIQUE,
  company_name TEXT,
  bank_name TEXT,
  bank_account TEXT,
  bank_agency TEXT,
  
  -- Configuração de comissão
  commission_rate DECIMAL(5,2) DEFAULT 30.00 NOT NULL,
  
  -- Status
  status TEXT DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'SUSPENDED')),
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_partners_referral_code ON partners(referral_code);
CREATE INDEX IF NOT EXISTS idx_partners_status ON partners(status);
CREATE INDEX IF NOT EXISTS idx_partners_email ON partners(email);
CREATE INDEX IF NOT EXISTS idx_partners_cpf ON partners(cpf);

-- Comentário na tabela
COMMENT ON TABLE partners IS 'Parceiros/afiliados do sistema CliniGo';

-- 2. Criar tabela de vínculos clínica-parceiro
CREATE TABLE IF NOT EXISTS clinic_referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  
  -- Tracking
  referral_code_used TEXT NOT NULL,
  registration_date TIMESTAMPTZ DEFAULT NOW(),
  first_payment_date TIMESTAMPTZ,
  
  -- Status do vínculo
  status TEXT DEFAULT 'PENDING' CHECK (status IN (
    'PENDING',      -- Aguardando primeiro pagamento
    'ACTIVE',       -- Clínica pagante, comissão ativa
    'CANCELLED',    -- Clínica cancelou assinatura
    'SUSPENDED'     -- Parceiro suspenso
  )),
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraint: Uma clínica só pode ter um parceiro
  CONSTRAINT unique_clinic_partner UNIQUE (clinic_id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_clinic_referrals_clinic ON clinic_referrals(clinic_id);
CREATE INDEX IF NOT EXISTS idx_clinic_referrals_partner ON clinic_referrals(partner_id);
CREATE INDEX IF NOT EXISTS idx_clinic_referrals_status ON clinic_referrals(status);

-- Comentário na tabela
COMMENT ON TABLE clinic_referrals IS 'Vínculos entre clínicas e parceiros que as indicaram';

-- 3. Criar tabela de comissões
CREATE TABLE IF NOT EXISTS partner_commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  
  -- Período de referência
  billing_month DATE NOT NULL, -- Ex: 2026-02-01 (sempre dia 1)
  
  -- Detalhes financeiros
  subscription_plan TEXT NOT NULL,
  subscription_amount DECIMAL(10,2) NOT NULL,
  commission_rate DECIMAL(5,2) NOT NULL,
  commission_amount DECIMAL(10,2) NOT NULL,
  
  -- Status de pagamento
  status TEXT DEFAULT 'PENDING' CHECK (status IN (
    'PENDING',      -- Aguardando pagamento
    'PAID',         -- Pago ao parceiro
    'CANCELLED'     -- Cancelado (clínica cancelou antes do pagamento)
  )),
  
  -- Dados de pagamento
  paid_at TIMESTAMPTZ,
  paid_by UUID REFERENCES auth.users(id),
  payment_proof_url TEXT,
  notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraint: Uma comissão por clínica por mês
  CONSTRAINT unique_commission_per_month UNIQUE (partner_id, clinic_id, billing_month)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_partner_commissions_partner ON partner_commissions(partner_id);
CREATE INDEX IF NOT EXISTS idx_partner_commissions_status ON partner_commissions(status);
CREATE INDEX IF NOT EXISTS idx_partner_commissions_month ON partner_commissions(billing_month);
CREATE INDEX IF NOT EXISTS idx_partner_commissions_clinic ON partner_commissions(clinic_id);

-- Comentário na tabela
COMMENT ON TABLE partner_commissions IS 'Comissões mensais dos parceiros por clínica indicada';

-- 4. Criar view de dashboard
CREATE OR REPLACE VIEW vw_partner_dashboard AS
SELECT 
  p.id AS partner_id,
  p.full_name,
  p.referral_code,
  p.pix_key,
  p.pix_key_type,
  p.status,
  p.commission_rate,
  
  -- Estatísticas gerais
  COALESCE(COUNT(DISTINCT cr.clinic_id), 0) AS total_clinics,
  COALESCE(COUNT(DISTINCT CASE WHEN cr.status = 'ACTIVE' THEN cr.clinic_id END), 0) AS active_clinics,
  
  -- Comissões
  COALESCE(SUM(CASE WHEN pc.status = 'PAID' THEN pc.commission_amount END), 0) AS total_earned,
  COALESCE(SUM(CASE WHEN pc.status = 'PENDING' THEN pc.commission_amount END), 0) AS pending_commissions,
  COALESCE(SUM(CASE 
    WHEN pc.billing_month = DATE_TRUNC('month', CURRENT_DATE) 
    THEN pc.commission_amount 
  END), 0) AS this_month_estimate
  
FROM partners p
LEFT JOIN clinic_referrals cr ON cr.partner_id = p.id
LEFT JOIN partner_commissions pc ON pc.partner_id = p.id
GROUP BY p.id, p.full_name, p.referral_code, p.pix_key, p.pix_key_type, p.status, p.commission_rate;

-- Comentário na view
COMMENT ON VIEW vw_partner_dashboard IS 'Dashboard consolidado de parceiros com estatísticas';

-- 5. Triggers para updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_partners_updated_at ON partners;
CREATE TRIGGER update_partners_updated_at
  BEFORE UPDATE ON partners
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_clinic_referrals_updated_at ON clinic_referrals;
CREATE TRIGGER update_clinic_referrals_updated_at
  BEFORE UPDATE ON clinic_referrals
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 6. Função para gerar código de referência único
CREATE OR REPLACE FUNCTION generate_referral_code(p_name TEXT)
RETURNS TEXT AS $$
DECLARE
  v_code TEXT;
  v_exists BOOLEAN;
  v_first_name TEXT;
BEGIN
  -- Extrair primeiro nome e limpar
  v_first_name := UPPER(REGEXP_REPLACE(SPLIT_PART(p_name, ' ', 1), '[^A-Za-z]', '', 'g'));
  
  -- Limitar a 8 caracteres
  v_first_name := SUBSTRING(v_first_name FROM 1 FOR 8);
  
  LOOP
    -- Gera código: NOME-4DIGITOS (ex: JOAO-8472)
    v_code := v_first_name || '-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
    
    -- Verifica se já existe
    SELECT EXISTS(SELECT 1 FROM partners WHERE referral_code = v_code) INTO v_exists;
    
    EXIT WHEN NOT v_exists;
  END LOOP;
  
  RETURN v_code;
END;
$$ LANGUAGE plpgsql;

-- Comentário na função
COMMENT ON FUNCTION generate_referral_code(TEXT) IS 'Gera código de referência único para parceiro (formato: NOME-XXXX)';

-- 7. RLS Policies
ALTER TABLE partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinic_referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_commissions ENABLE ROW LEVEL SECURITY;

-- Políticas para partners
DROP POLICY IF EXISTS "Parceiros podem ver apenas seus dados" ON partners;
CREATE POLICY "Parceiros podem ver apenas seus dados"
  ON partners FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Parceiros podem atualizar seus dados" ON partners;
CREATE POLICY "Parceiros podem atualizar seus dados"
  ON partners FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admin vê todos parceiros" ON partners;
CREATE POLICY "Admin vê todos parceiros"
  ON partners FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM auth.users u
      WHERE u.id = auth.uid() 
      AND (
        u.raw_user_meta_data->>'role' = 'SUPER_ADMIN'
        OR u.raw_user_meta_data->>'role' = 'SYSTEM_ADMIN'
      )
    )
  );

DROP POLICY IF EXISTS "Permitir inserção de parceiros anônimos" ON partners;
CREATE POLICY "Permitir inserção de parceiros anônimos"
  ON partners FOR INSERT
  WITH CHECK (true);

-- Políticas para clinic_referrals
DROP POLICY IF EXISTS "Parceiros veem apenas seus vínculos" ON clinic_referrals;
CREATE POLICY "Parceiros veem apenas seus vínculos"
  ON clinic_referrals FOR SELECT
  USING (
    partner_id IN (
      SELECT id FROM partners WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admin vê todos vínculos" ON clinic_referrals;
CREATE POLICY "Admin vê todos vínculos"
  ON clinic_referrals FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM auth.users u
      WHERE u.id = auth.uid() 
      AND (
        u.raw_user_meta_data->>'role' = 'SUPER_ADMIN'
        OR u.raw_user_meta_data->>'role' = 'SYSTEM_ADMIN'
      )
    )
  );

DROP POLICY IF EXISTS "Service role pode inserir vínculos" ON clinic_referrals;
CREATE POLICY "Service role pode inserir vínculos"
  ON clinic_referrals FOR INSERT
  WITH CHECK (true);

-- Políticas para partner_commissions
DROP POLICY IF EXISTS "Parceiros veem apenas suas comissões" ON partner_commissions;
CREATE POLICY "Parceiros veem apenas suas comissões"
  ON partner_commissions FOR SELECT
  USING (
    partner_id IN (
      SELECT id FROM partners WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admin vê todas comissões" ON partner_commissions;
CREATE POLICY "Admin vê todas comissões"
  ON partner_commissions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM auth.users u
      WHERE u.id = auth.uid() 
      AND (
        u.raw_user_meta_data->>'role' = 'SUPER_ADMIN'
        OR u.raw_user_meta_data->>'role' = 'SYSTEM_ADMIN'
      )
    )
  );

DROP POLICY IF EXISTS "Service role pode inserir comissões" ON partner_commissions;
CREATE POLICY "Service role pode inserir comissões"
  ON partner_commissions FOR INSERT
  WITH CHECK (true);
