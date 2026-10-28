-- Visitas a la página pública de reservas. Anónimo: sin IP, sin nombre ni teléfono.
-- Una fila por visita (sesión). `visitante` es un código al azar guardado en el navegador de cada persona.
create table if not exists public.visitas (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  dia date not null,            -- día en Argentina
  visitante text,               -- código al azar (puede faltar si el navegador no lo deja guardar)
  origen text,                  -- de dónde llegó: instagram, google, whatsapp, directo...
  dispositivo text              -- movil | compu
);
create index if not exists idx_visitas_dia on public.visitas (dia);

alter table public.visitas enable row level security;
grant all on public.visitas to service_role;

-- Para deshacer (no hace falta normalmente):
-- drop table public.visitas;
