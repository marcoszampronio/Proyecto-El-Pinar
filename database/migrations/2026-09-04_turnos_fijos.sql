-- Turnos fijos: Mateo deja cargado un cliente que juega siempre el mismo
-- dia/horario. El backend genera automaticamente las reservas confirmadas
-- de las proximas semanas (ver backend/lib/turnosFijos.js). Si Mateo cancela
-- una semana puntual con el flujo normal, esa fecha no se vuelve a generar
-- (la fila ya existe, aunque cancelada).

create table if not exists public.turnos_fijos (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  court text not null,          -- 'C1' | 'C2' | 'PAD'
  turn text,                    -- 'T1'|'T2'|'T3' (futbol); NULL para padel
  start_time time,              -- solo padel
  end_time time,                -- solo padel
  dia_semana smallint not null, -- 2=martes, 3=miercoles, 4=jueves
  client_name text not null,
  client_phone text not null,
  client_email text,
  desde date not null,
  hasta date,                   -- NULL = sin fecha de fin
  activo boolean not null default true,
  created_by text
);

create index if not exists idx_turnos_fijos_activo on public.turnos_fijos (activo, dia_semana);

alter table public.turnos_fijos enable row level security;
grant all on public.turnos_fijos to anon, authenticated, service_role;

-- Marca en la reserva de que turno fijo salio (para no duplicarla cada semana
-- y para poder liberar las ocurrencias futuras si se da de baja el fijo).
alter table public.reservations
  add column if not exists origen_fijo_id uuid references public.turnos_fijos(id);
