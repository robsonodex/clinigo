-- Add display_settings and consultation_duration to doctors table
ALTER TABLE doctors 
ADD COLUMN IF NOT EXISTS consultation_duration INTEGER DEFAULT 30,
ADD COLUMN IF NOT EXISTS display_settings JSONB DEFAULT '{"show_duration": true, "show_price": true, "show_rating": true, "show_teleconsulta": true, "show_convenio": false}'::jsonb;

-- Comment on columns
COMMENT ON COLUMN doctors.consultation_duration IS 'Duração padrão da consulta em minutos';
COMMENT ON COLUMN doctors.display_settings IS 'Configurações de exibição pública do médico (JSON)';
