-- Criar a tabela de recados/bulletins
create table if not exists clinic_bulletins (
  id uuid default gen_random_uuid() primary key,
  clinic_id uuid references clinics(id) on delete cascade not null,
  sender_id uuid references users(id) on delete set null,
  title varchar(255) not null,
  content text not null,
  type varchar(50) default 'info', -- 'info', 'warning', 'alert', 'success'
  target varchar(50) default 'internal', -- 'internal', 'patients', 'all'
  is_pinned boolean default false,
  expires_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Ativar RLS se ainda não ativado
alter table clinic_bulletins enable row level security;

-- Remover políticas antigas se existirem para evitar conflitos
drop policy if exists "Clinic staff can manage bulletins" on clinic_bulletins;
drop policy if exists "Patients can read public bulletins" on clinic_bulletins;

-- Política 1: Usuários da clínica (médicos, admins, recepção) podem gerenciar tudo da sua clínica
create policy "Clinic staff can manage bulletins" on clinic_bulletins
  for all using (
    exists (
      select 1 from users
      where users.id = auth.uid()
      and users.clinic_id = clinic_bulletins.clinic_id
    )
  );

-- Política 2: Pacientes podem visualizar recados públicos da sua clínica
create policy "Patients can read public bulletins" on clinic_bulletins
  for select using (
    (target = 'patients' or target = 'all') and
    exists (
      select 1 from patients
      where patients.id = auth.uid()
      and patients.clinic_id = clinic_bulletins.clinic_id
    )
  );
