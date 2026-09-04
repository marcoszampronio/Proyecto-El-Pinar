-- Bloqueos preventivos: Mateo puede sacar de circulación un dia completo,
-- una cancha entera ese dia, o un turno puntual de futbol, SIN que haya una
-- reserva de por medio (ej: mantenimiento, evento privado). Es distinto de
-- "suspender por lluvia", que cancela reservas ya existentes.
--
-- Filas:
--   court=NULL, turn=NULL  -> bloquea TODO ese dia (futbol C1/C2 + padel)
--   court='C1'/'C2', turn=NULL -> bloquea esa cancha entera ese dia
--   court='C1'/'C2', turn='T1'/'T2'/'T3' -> bloquea ese turno puntual
--   court='PAD', turn=NULL -> bloquea el padel entero ese dia

create table if not exists public.bloqueos (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  reservation_date date not null,
  court text,
  turn text,
  motivo text,
  created_by text
);

create index if not exists idx_bloqueos_fecha on public.bloqueos (reservation_date);

alter table public.bloqueos enable row level security;

grant all on public.bloqueos to anon, authenticated, service_role;
