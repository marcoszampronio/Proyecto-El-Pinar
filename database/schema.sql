-- ============================================================
-- ESQUEMA DE BASE DE DATOS - Complejo El Potrero
-- Ejecutar esto en Supabase: Dashboard > SQL Editor > New query
-- ============================================================

-- Tabla principal de reservas
create table if not exists reservations (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  court text not null check (court in ('C1', 'C2', 'PAD')),
  reservation_date date not null,
  start_time time not null,
  end_time time not null,
  turn text, -- 'T1' | 'T2' | 'T3' para futbol, null para padel
  client_name text not null,
  client_phone text not null,
  client_email text,
  category text, -- categoria del equipo (opcional)
  status text not null default 'pendiente' check (status in ('pendiente', 'confirmada', 'cancelada')),
  looking_for_rival boolean not null default false,
  created_at timestamptz not null default now(),
  confirmed_at timestamptz,
  confirmed_by text, -- email del admin que confirmo
  cancelled_at timestamptz,
  cancelled_by text
);

-- Evita doble reserva del mismo horario/cancha/dia mientras este activa
-- (permite volver a reservar si la anterior fue cancelada)
create unique index if not exists idx_no_solape
  on reservations (court, reservation_date, start_time)
  where status <> 'cancelada';

create index if not exists idx_code on reservations (code);
create index if not exists idx_date_court on reservations (reservation_date, court);
create index if not exists idx_status on reservations (status);

-- ============================================================
-- Seguridad a nivel de fila (RLS)
-- ============================================================
alter table reservations enable row level security;

-- El publico puede INSERTAR una solicitud de reserva (queda pendiente)
create policy "publico_puede_reservar"
  on reservations for insert
  to anon
  with check (status = 'pendiente');

-- El publico puede LEER solo lo necesario para ver disponibilidad
-- (se filtra que columnas exponer desde el backend, no directo a esta tabla)

-- Los administradores autenticados pueden hacer todo
create policy "admins_full_access"
  on reservations for all
  to authenticated
  using (true)
  with check (true);

-- ============================================================
-- Vista publica de disponibilidad (sin datos personales)
-- ============================================================
create or replace view public_availability as
select
  court,
  reservation_date,
  start_time,
  end_time,
  turn,
  status
from reservations
where status <> 'cancelada';

-- ============================================================
-- Vista publica de "Buscando Rival"
-- ============================================================
create or replace view public_rivals as
select
  court,
  reservation_date,
  start_time,
  end_time,
  client_name as team_name,
  category,
  client_phone as contact_phone
from reservations
where status = 'confirmada'
  and looking_for_rival = true
  and reservation_date >= current_date;

-- ============================================================
-- Tabla de administradores permitidos (referencia, el control real
-- de login lo hace Supabase Auth; esta tabla es solo para mostrar
-- nombres en el panel)
-- ============================================================
create table if not exists admins (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  display_name text,
  created_at timestamptz not null default now()
);

-- Ejemplo: agregar a Mateo como admin (despues de crearlo en Supabase Auth)
-- insert into admins (email, display_name) values ('mateo@ejemplo.com', 'Mateo');
