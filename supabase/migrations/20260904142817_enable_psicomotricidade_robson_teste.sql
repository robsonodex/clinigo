DO $$
DECLARE
    v_clinica_id uuid;
BEGIN
    -- Busca a clínica "Robson Teste"
    SELECT id INTO v_clinica_id FROM public.clinics WHERE name ILIKE '%Robson Teste%' LIMIT 1;

    IF v_clinica_id IS NOT NULL THEN
        -- Ativa o módulo para esta clínica
        INSERT INTO public.clinica_modulos (clinica_id, modulo_id, ativo)
        VALUES (v_clinica_id, 'psicomotricidade_sensory', true)
        ON CONFLICT (clinica_id, modulo_id) DO UPDATE SET ativo = true;

        -- Clona os 55 objetivos baseados na World Sensory (ou insere diretamente)
        -- Como a tabela foi recém criada e populada para World Sensory, podemos copiar de lá
        INSERT INTO public.objetivos_biblioteca (
            clinica_id, codigo, categoria, descricao_template, estrutura_parametros, ativo
        )
        SELECT 
            v_clinica_id, codigo, categoria, descricao_template, estrutura_parametros, true
        FROM public.objetivos_biblioteca 
        WHERE clinica_id != v_clinica_id -- pega os originais
        ON CONFLICT (clinica_id, codigo) DO NOTHING;
    END IF;
END $$;
