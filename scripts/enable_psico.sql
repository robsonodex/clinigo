INSERT INTO clinica_modulos (clinica_id, modulo_id, ativo) SELECT id, 'psicomotricidade_sensory', true FROM clinics ON CONFLICT (clinica_id, modulo_id) DO UPDATE SET ativo = true;
