-- Migração: Check-in Biométrico do Paciente via Tablet Pareado (sem login, sem QR Code)
-- Tabelas para pareamento de dispositivos, tokens efêmeros de 3 minutos e auditoria imutável LGPD

-- 1) Dispositivos pareados (tablets/terminais em salas de consultório)
create table if not exists clinic_devices (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references clinics(id) on delete cascade,
  device_token text not null unique default encode(gen_random_bytes(24), 'hex'),
  room_label text not null,
  status text not null default 'active' check (status in ('active','revoked')),
  last_seen_at timestamptz,
  created_by uuid references users(id),
  created_at timestamptz not null default now()
);
create index if not exists clinic_devices_clinic_id_status_idx on clinic_devices (clinic_id, status);

-- 2) Tokens de captura efêmeros (vida útil de 3 minutos, uso único)
create table if not exists checkin_capture_tokens (
  id uuid primary key default gen_random_uuid(),
  token text not null unique default encode(gen_random_bytes(18), 'base64'),
  clinic_id uuid not null references clinics(id) on delete cascade,
  device_id uuid references clinic_devices(id),
  appointment_id uuid not null references appointments(id) on delete cascade,
  patient_id uuid not null references patients(id),
  created_by uuid references users(id),
  status text not null default 'pending'
    check (status in ('pending','confirmed','expired','failed','manual','signature','escalated')),
  confirmation_method text check (confirmation_method in ('facial','manual','signature','reception')),
  confirmed_by_user_id uuid references users(id),
  reason text,
  expires_at timestamptz not null default (now() + interval '3 minutes'),
  confirmed_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists checkin_capture_tokens_token_idx on checkin_capture_tokens (token);
create index if not exists checkin_capture_tokens_appointment_id_idx on checkin_capture_tokens (appointment_id);
create index if not exists checkin_capture_tokens_device_status_idx on checkin_capture_tokens (device_id, status);

-- 3) Log de auditoria LGPD (imutável — sem update/delete pela aplicação)
create table if not exists patient_checkin_events (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references clinics(id) on delete cascade,
  appointment_id uuid not null references appointments(id),
  patient_id uuid not null references patients(id),
  device_id uuid references clinic_devices(id),
  method text not null check (method in ('facial','manual','signature','reception')),
  confirmed_by_user_id uuid references users(id),
  reason text,
  signature_url text,
  created_at timestamptz not null default now()
);
create index if not exists patient_checkin_events_clinic_idx on patient_checkin_events (clinic_id);
create index if not exists patient_checkin_events_appointment_idx on patient_checkin_events (appointment_id);

-- 4) Colunas de leitura rápida em appointments
alter table appointments
  add column if not exists checkin_confirmed_at timestamptz,
  add column if not exists checkin_method text;

-- RLS ativado: protegido por padrão, operações de escrita e validação são feitas exclusivamente
-- via API Routes com Service Role e verificação estrita de clinic_id e device_token.
alter table clinic_devices enable row level security;
alter table checkin_capture_tokens enable row level security;
alter table patient_checkin_events enable row level security;
