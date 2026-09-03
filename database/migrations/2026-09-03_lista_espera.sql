-- Lista de espera: cuando un cliente ve el día lleno (o casi), puede pedir que
-- le avisen si se libera un turno. Mateo lo ve en el panel (tab Agenda) con el
-- link de WhatsApp ya armado. Nada automático: Mateo decide a quién escribe.
--
-- Tabla nueva, no toca nada existente. Correr en el SQL Editor de Supabase.

create table if not exists public.lista_espera (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  reservation_date date not null,
  court text not null default 'cualquiera',      -- 'C1' | 'C2' | 'cualquiera'
  client_name text not null,
  client_phone text not null,
  status text not null default 'activa',         -- 'activa' | 'avisado' | 'descartado'
  notified_at timestamptz,
  notified_by text
);

create index if not exists idx_lista_espera_fecha
  on public.lista_espera (reservation_date, status);

-- Evita que la misma persona se anote dos veces para el mismo día/cancha.
create unique index if not exists uq_lista_espera_persona_dia
  on public.lista_espera (reservation_date, court, client_phone)
  where status = 'activa';

-- RLS igual que el resto: activada sin políticas. Todo pasa por el backend con
-- la service key (que ignora RLS).
alter table public.lista_espera enable row level security;

-- El backend usa el rol service_role: necesita el GRANT sobre la tabla nueva
-- (RLS sigue bloqueando a anon/authenticated porque no hay políticas).
grant all on public.lista_espera to anon, authenticated, service_role;
