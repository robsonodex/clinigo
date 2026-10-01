-- Pré-checagem somente leitura para detectar números de guia duplicados por clínica antes de aplicar as migrations de 2026.
SELECT 
    clinic_id,
    guide_number,
    COUNT(*) AS total_duplicatas,
    ARRAY_AGG(id) AS ids_guias,
    ARRAY_AGG(status) AS status_guias,
    MIN(created_at) AS primeira_criacao,
    MAX(created_at) AS ultima_criacao
FROM tiss_guides
WHERE guide_number IS NOT NULL AND TRIM(guide_number) != ''
GROUP BY clinic_id, guide_number
HAVING COUNT(*) > 1
ORDER BY total_duplicatas DESC, clinic_id;
