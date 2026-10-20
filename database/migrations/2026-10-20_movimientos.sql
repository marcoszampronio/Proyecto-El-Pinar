-- Movimientos del panel: quién (qué usuario admin) hizo qué y cuándo.
-- Se muestra en Panel > Estadísticas > "Movimientos". Solo registra desde que se crea la tabla.
create table if not exists public.movimientos (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  admin_email text,
  accion text not null,        -- confirmo, cancelo, agendo, suspendio, bloqueo, desbloqueo, rival
  detalle text,                -- frase lista para mostrar
  reservation_code text,
  reservation_date date
);

create index if not exists idx_movimientos_fecha on public.movimientos (created_at desc);

alter table public.movimientos enable row level security;

grant all on public.movimientos to service_role;

-- Para deshacer (no hace falta normalmente):
-- drop table public.movimientos;
