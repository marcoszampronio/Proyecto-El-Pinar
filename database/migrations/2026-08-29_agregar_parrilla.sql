-- Migración: habilitar la parrilla como cuarto espacio reservable
-- Ejecutar en Supabase > SQL Editor

-- El CHECK de la columna court solo permitía C1, C2 y PAD.
-- Se agrega PAR (parrilla). El nombre del constraint puede variar según cómo
-- se creó la tabla; se prueban los dos nombres habituales.
alter table reservations drop constraint if exists reservations_court_check;
alter table reservations drop constraint if exists reservations_court_check1;

alter table reservations
  add constraint reservations_court_check
  check (court in ('C1', 'C2', 'PAD', 'PAR'));
