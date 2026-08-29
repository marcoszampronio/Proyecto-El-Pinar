-- Migración: alinear DB con el código
-- Ejecutar en Supabase > SQL Editor

-- 1) Columna del nombre de equipo (el backend ya la inserta).
--    Si ya existe, este comando no hace nada.
alter table reservations add column if not exists team_name text;

-- 2) La vista pública de "Busco Rival" mostraba el nombre personal del
--    cliente en lugar del nombre del equipo. Ahora usa team_name y solo
--    cae en client_name si el equipo no cargó nombre.
create or replace view public_rivals as
select
  court,
  reservation_date,
  start_time,
  end_time,
  coalesce(team_name, client_name) as team_name,
  category,
  client_phone as contact_phone
from reservations
where status = 'confirmada'
  and looking_for_rival = true
  and reservation_date >= current_date;
