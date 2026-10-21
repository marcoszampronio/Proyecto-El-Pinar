-- Equipos: la categoría con la que juega cada equipo (se sugiere al agendar).
-- El nombre normalizado (mayúsculas) es la clave: reservas, contactos y turnos fijos
-- se agrupan por ese nombre. Unir dos equipos = renombrar uno al otro.
create table if not exists public.equipos (
  nombre text primary key,
  categoria text,
  created_at timestamptz not null default now()
);

alter table public.equipos enable row level security;
grant all on public.equipos to service_role;

-- Para deshacer (no hace falta normalmente):
-- drop table public.equipos;
