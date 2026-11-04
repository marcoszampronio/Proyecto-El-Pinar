-- Interés en "Busco rival": cada vez que alguien toca "Me interesa" / "Escribiles por WhatsApp" en la página pública
-- para escribirle a un equipo que busca rival. Solo cuenta el TOQUE: no sabemos si después mandó el mensaje ni quién es.
-- Anónimo: sin IP, sin nombre ni teléfono. `visitante` es el mismo código al azar que usan las visitas.
create table if not exists public.rival_toques (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  dia date not null,               -- día (Argentina) en que tocaron
  reservation_date date not null,  -- fecha del turno del equipo que busca rival
  start_time time not null,
  court text not null,             -- C1 | C2 | PAD
  equipo text,                     -- nombre del equipo en ese momento
  visitante text,                  -- código al azar del navegador (puede faltar)
  dispositivo text                 -- movil | compu
);
create index if not exists idx_rival_toques_dia on public.rival_toques (dia);
create index if not exists idx_rival_toques_turno on public.rival_toques (reservation_date, start_time, court);

alter table public.rival_toques enable row level security; -- sin policies: solo el servidor (service role) la usa
grant all on public.rival_toques to service_role;

-- Para deshacer (no hace falta normalmente):
-- drop table public.rival_toques;
