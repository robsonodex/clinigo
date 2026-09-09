-- ==============================================================================
-- MIGRATION: Check-in Biometrico Multi-Superficie + Verificacao da Terapeuta (V4)
-- Data: 2026-09-09
-- Descricao: Aditiva sobre a V3. Permite multiplas superficies de captura
--            (staff_webcam, kiosk, patient_mobile), verificacao antifraude da
--            terapeuta e modo recepcao com PIN efemero no tablet.
-- ==============================================================================

-- 1. Configuracao de check-in por clinica (default inicial seguro e retrocompativel)
ALTER TABLE clinics
  ADD COLUMN IF NOT EXISTS checkin_settings jsonb NOT NULL DEFAULT '{
    "enabled_surfaces": ["staff_webcam", "kiosk"],
    "require_therapist_biometric_on_start": false,
    "patient_mobile_checkin_enabled": false
  }'::jsonb;

-- 2. Generaliza tokens e eventos de captura para registrar a superficie utilizada
ALTER TABLE checkin_capture_tokens
  ADD COLUMN IF NOT EXISTS surface text NOT NULL DEFAULT 'kiosk'
    CHECK (surface IN ('kiosk','staff_webcam','patient_mobile')),
  ADD COLUMN IF NOT EXISTS patient_phone_snapshot text;

ALTER TABLE patient_checkin_events
  ADD COLUMN IF NOT EXISTS surface text
    CHECK (surface IN ('kiosk','staff_webcam','patient_mobile'));

-- 3. Fluxo B: Verificacao biometrica da propria terapeuta antes de iniciar o atendimento
CREATE TABLE IF NOT EXISTS therapist_start_biometric_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  appointment_id uuid NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  therapist_user_id uuid NOT NULL REFERENCES users(id),
  matched boolean NOT NULL,
  distance numeric,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE therapist_start_biometric_events ENABLE ROW LEVEL SECURITY;
-- Sem policy = bloqueado por padrao; acesso restrito via service role nas API routes

-- 4. Timestamp de verificacao da terapeuta no agendamento
ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS therapist_start_verified_at timestamptz;

-- 5. Suporte a biometria facial de terapeutas na tabela patient_face_biometrics
ALTER TABLE patient_face_biometrics
  ADD COLUMN IF NOT EXISTS therapist_user_id uuid REFERENCES users(id);

-- 6. Modo Recepcao no Tablet: PIN efemero (hash bcrypt), nunca supabase.auth, nunca active_sessions
CREATE TABLE IF NOT EXISTS reception_pins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  pin_hash text NOT NULL,
  label text NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','revoked')),
  created_by uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE reception_pins ENABLE ROW LEVEL SECURITY;
-- Sem policy = bloqueado por padrao; validacao acontece via API route com service role
