-- Aperturas especiales: Mateo puede abrir puntualmente un lunes o un viernes
-- (fuera de los días habituales martes/miércoles/jueves) para que el público
-- pueda reservar online ese día como uno más. Es lo inverso de un bloqueo:
-- en vez de cerrar un día habilitado, abre uno que normalmente no lo está.
--
-- Por ahora queda limitado a lunes/viernes (ya se muestran en la tira de
-- fechas del sitio, solo que grises) — sábado y domingo quedan afuera de
-- esta primera versión porque requieren agrandar la tira a 7 días.

create table if not exists public.aperturas_especiales (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  reservation_date date not null unique,
  nota text,
  created_by text
);

create index if not exists idx_aperturas_especiales_fecha
  on public.aperturas_especiales (reservation_date);

-- RLS igual que el resto de las tablas nuevas: activada sin políticas, todo
-- pasa por el backend con la service key (que ignora RLS). El GRANT es
-- necesario igual: en este proyecto el service_role no tiene privilegios
-- automáticos sobre tablas nuevas.
alter table public.aperturas_especiales enable row level security;

grant all on public.aperturas_especiales to anon, authenticated, service_role;
