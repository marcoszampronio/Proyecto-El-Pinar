-- Empleados con acceso limitado al panel. Los administra quien tiene el servidor (ver backend/scripts/empleados.js):
-- se agrega el mail acá y se les manda una invitación por mail para que elijan su propia contraseña.
create table if not exists public.empleados_panel (
  email text primary key,           -- en minúsculas
  nombre text,
  created_at timestamptz not null default now(),
  invitado_por text
);

alter table public.empleados_panel enable row level security;
grant all on public.empleados_panel to service_role;

-- Para deshacer (no hace falta normalmente):
-- drop table public.empleados_panel;
