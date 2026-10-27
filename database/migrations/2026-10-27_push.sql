-- Avisos push al celular: un dispositivo suscripto por fila.
-- Solo los crea un usuario logueado del panel (el servidor, con la service role).
create table if not exists public.push_suscripciones (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  admin_email text not null,
  endpoint text not null unique,   -- dirección del dispositivo en el servicio de push del navegador
  p256dh text not null,
  auth text not null,
  user_agent text,
  ultimo_envio_ok timestamptz
);

create index if not exists idx_push_email on public.push_suscripciones (admin_email);

alter table public.push_suscripciones enable row level security;
grant all on public.push_suscripciones to service_role;

-- Para deshacer (no hace falta normalmente):
-- drop table public.push_suscripciones;
