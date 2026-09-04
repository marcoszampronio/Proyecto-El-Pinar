-- Contactos que Mateo carga a mano (sin que haya una reserva de por medio).
-- Se combinan con los contactos que salen de las reservas en GET /api/admin/contactos.

create table if not exists public.contactos_manuales (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  nombre text not null,
  telefono text not null,
  created_by text
);

create index if not exists idx_contactos_manuales_telefono
  on public.contactos_manuales (telefono);

alter table public.contactos_manuales enable row level security;

-- Mismo problema que con lista_espera: sin este grant el backend
-- (service_role) recibe "permission denied for table".
grant all on public.contactos_manuales to anon, authenticated, service_role;
