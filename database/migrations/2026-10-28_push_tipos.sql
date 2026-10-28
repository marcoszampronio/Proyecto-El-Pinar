-- Avisos push: interruptores por tipo de aviso y avisos programados.

-- Tipos de aviso que cada dispositivo tiene APAGADOS (lista vacía = recibe todos).
alter table public.push_suscripciones add column if not exists apagados text[] not null default '{}';

-- "Reservas esperando tu OK hace rato": se marca para avisar una sola vez por reserva.
alter table public.reservations add column if not exists aviso_demora_at timestamptz;

-- Avisos que salen por horario (ej. pronóstico de lluvia): evita repetirlos si el servidor se reinicia.
create table if not exists public.avisos_programados (
  clave text primary key,
  enviado_at timestamptz not null default now()
);
alter table public.avisos_programados enable row level security;
grant all on public.avisos_programados to service_role;

-- Para deshacer (no hace falta normalmente):
-- alter table public.push_suscripciones drop column apagados;
-- alter table public.reservations drop column aviso_demora_at;
-- drop table public.avisos_programados;
