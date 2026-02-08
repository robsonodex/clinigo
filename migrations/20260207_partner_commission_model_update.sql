-- =============================================
-- PARTNER SYSTEM - COMMISSION MODEL UPDATE
-- Data: 2026-02-07
-- Descrição: Atualiza o modelo de comissão para 35% base + bônus + 8% recorrente
-- =============================================

-- 1. Atualizar o valor padrão da comissão base de 30% para 35%
ALTER TABLE partners 
ALTER COLUMN commission_rate SET DEFAULT 35.00;

-- 2. Atualizar parceiros existentes que ainda estão com 30% para 35%
-- (Somente os que foram cadastrados com a taxa antiga)
UPDATE partners 
SET commission_rate = 35.00 
WHERE commission_rate = 30.00;

-- 3. Adicionar comentário explicativo
COMMENT ON COLUMN partners.commission_rate IS 
  'Taxa de comissão BASE do parceiro (35% padrão). 
   Modelo completo: 
   - 35% base (0-4 vendas/mês)
   - 40% (5-9 vendas/mês = 35% + 5% bônus)
   - 45% (10+ vendas/mês = 35% + 10% bônus)
   - +8% recorrente mensal enquanto cliente estiver ativo';

-- 4. Adicionar colunas para suportar o modelo de bônus (se não existirem)
ALTER TABLE partner_commissions 
ADD COLUMN IF NOT EXISTS bonus_rate DECIMAL(5,2) DEFAULT 0.00;

ALTER TABLE partner_commissions 
ADD COLUMN IF NOT EXISTS recurring_rate DECIMAL(5,2) DEFAULT 8.00;

ALTER TABLE partner_commissions 
ADD COLUMN IF NOT EXISTS commission_type TEXT DEFAULT 'SALE' CHECK (commission_type IN ('SALE', 'RECURRING', 'CHURN_PROTECTION'));

-- Comentários
COMMENT ON COLUMN partner_commissions.bonus_rate IS 'Taxa de bônus aplicada (0%, 5% ou 10% dependendo das vendas do mês)';
COMMENT ON COLUMN partner_commissions.recurring_rate IS 'Taxa de comissão recorrente (8% padrão)';
COMMENT ON COLUMN partner_commissions.commission_type IS 'Tipo: SALE (venda inicial), RECURRING (recorrente mensal), CHURN_PROTECTION (proteção pós-cancelamento)';

-- 5. Log de migração
DO $$
BEGIN
  RAISE NOTICE 'Migration completed: Partner commission model updated to 35%% base + bonus + 8%% recurring';
END $$;
