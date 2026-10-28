-- Dispositivos desde los que se usa el panel: sirve para ver quién usa la app instalada.
-- Se anota cada vez que alguien abre el panel con su sesión (un id al azar por navegador, sin datos personales).
create table if not exists public.panel_dispositivos (
  id uuid primary key default gen_random_uuid(),
  admin_email text not null,
  device_id text not null,
  user_agent text,
  primer_uso timestamptz not null default now(),
  ultimo_uso timestamptz not null default now(),
  ultimo_uso_app timestamptz,        -- última vez que lo abrió desde la app instalada
  instalada_en timestamptz,          -- momento de la instalación (solo Android/Chrome lo informan)
  unique (admin_email, device_id)
);

alter table public.panel_dispositivos enable row level security;
grant all on public.panel_dispositivos to service_role;

-- Para deshacer (no hace falta normalmente):
-- drop table public.panel_dispositivos;
