-- Ativa a feature flag faturamento_premium para uma clínica específica via JSONB em clinics.addons.
UPDATE clinics 
SET addons = COALESCE(addons, '{}'::jsonb) || '{"faturamento_premium": true}'::jsonb 
WHERE id = 'ID_DA_CLINICA';

-- Consulta de verificação das clínicas com a flag ativada:
SELECT id, name, addons->>'faturamento_premium' AS faturamento_premium 
FROM clinics 
WHERE (addons->>'faturamento_premium')::boolean = true;
