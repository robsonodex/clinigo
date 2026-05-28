-- 1. Criar tabela de mensagens de WhatsApp programadas
create table if not exists public.scheduled_whatsapp_messages (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    scheduled_for timestamp with time zone not null,
    recipient_phone text not null,
    recipient_name text not null,
    subject text not null,
    message text not null,
    status text default 'pending' not null, -- 'pending', 'sent', 'failed'
    error_message text,
    sent_at timestamp with time zone
);

-- 2. Habilitar Row Level Security (RLS)
alter table public.scheduled_whatsapp_messages enable row level security;

-- 3. Criar política de RLS ultra restrita apenas para Super Administradores
create policy "Permitir tudo apenas para Super Administradores"
    on public.scheduled_whatsapp_messages
    for all
    using (
        exists (
            select 1 from public.users
            where public.users.id = auth.uid()
            and public.users.role = 'SUPER_ADMIN'
        )
    );
