-- =============================================
-- PARTNER SYSTEM - SINGLE COMMISSION MODEL FIX
-- Data: 2026-02-04
-- Descrição: Corrige o modelo de comissão de RECORRENTE para ÚNICA
-- =============================================

-- 1. Adicionar campo commission_status à tabela clinic_referrals
-- Este campo controla se a comissão JÁ FOI CALCULADA para este vínculo
ALTER TABLE clinic_referrals ADD COLUMN IF NOT EXISTS 
  commission_status TEXT DEFAULT 'PENDING' CHECK (commission_status IN ('PENDING', 'PAID', 'CANCELLED'));

COMMENT ON COLUMN clinic_referrals.commission_status IS 
  'Status da comissão: PENDING = aguardando cálculo, PAID = comissão já calculada (uma vez), CANCELLED = cancelado';

-- Atualizar referrals existentes que já estavam ativos para PAID (já foram processados)
UPDATE clinic_referrals 
SET commission_status = 'PAID' 
WHERE status = 'ACTIVE' AND commission_status IS NULL;

-- 2. Adicionar campo referral_id à tabela partner_commissions
-- Garante que uma comissão seja criada apenas UMA VEZ por venda
ALTER TABLE partner_commissions ADD COLUMN IF NOT EXISTS 
  referral_id UUID REFERENCES clinic_referrals(id) ON DELETE CASCADE;

-- 3. Renomear billing_month para sale_month (mais semântico para modelo único)
-- Primeiro verificamos se a coluna billing_month existe
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name = 'partner_commissions' AND column_name = 'billing_month') THEN
    ALTER TABLE partner_commissions RENAME COLUMN billing_month TO sale_month;
  END IF;
END $$;

-- 4. Remover constraint antiga e adicionar nova
-- A constraint antiga permitia 1 comissão por clínica por MÊS
-- A nova constraint permite apenas 1 comissão por VENDA (referral_id único)
ALTER TABLE partner_commissions DROP CONSTRAINT IF EXISTS unique_commission_per_month;

-- Só adiciona a nova constraint se referral_id existir e for NOT NULL para os registros
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'unique_commission_per_sale') THEN
    -- Para registros existentes sem referral_id, vamos tentar popular
    UPDATE partner_commissions pc
    SET referral_id = (
      SELECT cr.id FROM clinic_referrals cr 
      WHERE cr.clinic_id = pc.clinic_id 
      LIMIT 1
    )
    WHERE pc.referral_id IS NULL;
    
    -- Adicionar constraint apenas se todos os registros tiverem referral_id
    -- Caso contrário, deixamos para adicionar manualmente depois
    IF NOT EXISTS (SELECT 1 FROM partner_commissions WHERE referral_id IS NULL) THEN
      ALTER TABLE partner_commissions ADD CONSTRAINT unique_commission_per_sale UNIQUE (referral_id);
    END IF;
  END IF;
END $$;

-- 5. Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_clinic_referrals_commission_status ON clinic_referrals(commission_status);

-- 6. Atualizar a view do dashboard para refletir o novo modelo
DROP VIEW IF EXISTS vw_partner_dashboard;
CREATE OR REPLACE VIEW vw_partner_dashboard AS
SELECT 
  p.id AS partner_id,
  p.full_name,
  p.referral_code,
  p.pix_key,
  p.pix_key_type,
  p.status,
  p.commission_rate,
  
  -- Total de vendas (não clínicas ativas)
  COUNT(DISTINCT cr.clinic_id) AS total_sales,
  COUNT(DISTINCT CASE WHEN cr.commission_status = 'PAID' THEN cr.clinic_id END) AS paid_sales,
  COUNT(DISTINCT CASE WHEN cr.commission_status = 'PENDING' THEN cr.clinic_id END) AS pending_sales,
  
  -- Comissões (modelo único: soma todas as comissões já pagas)
  COALESCE(SUM(CASE WHEN pc.status = 'PAID' THEN pc.commission_amount END), 0) AS total_earned,
  COALESCE(SUM(CASE WHEN pc.status = 'PENDING' THEN pc.commission_amount END), 0) AS pending_commissions,
  
  -- Vendas deste mês (comissões pendentes de vendas do mês atual)
  COALESCE(
    SUM(
      CASE 
        WHEN DATE_TRUNC('month', cr.registration_date) = DATE_TRUNC('month', CURRENT_DATE) 
        AND cr.commission_status = 'PENDING'
        THEN pc.commission_amount 
      END
    ), 0
  ) AS this_month_sales
  
FROM partners p
LEFT JOIN clinic_referrals cr ON cr.partner_id = p.id
LEFT JOIN partner_commissions pc ON pc.partner_id = p.id
GROUP BY p.id, p.full_name, p.referral_code, p.pix_key, p.pix_key_type, p.status, p.commission_rate;

COMMENT ON VIEW vw_partner_dashboard IS 'Dashboard de parceiros - modelo de comissão única por venda';

-- 7. Comentários atualizados nas tabelas
COMMENT ON TABLE clinic_referrals IS 'Vínculos entre clínicas e parceiros (1 comissão ÚNICA por venda)';
COMMENT ON TABLE partner_commissions IS 'Comissões ÚNICAS por venda de clínica (não recorrente)';
