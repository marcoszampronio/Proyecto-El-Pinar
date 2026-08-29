-- Migración: evitar solapamientos en las reservas por rango (pádel y parrilla)
-- a nivel base de datos, no solo en JavaScript.
-- Ejecutar en Supabase > SQL Editor. Requiere la extensión btree_gist.

create extension if not exists btree_gist;

alter table reservations
  add constraint reservas_flexibles_sin_solape
  exclude using gist (
    court with =,
    reservation_date with =,
    tsrange(
      (reservation_date + start_time)::timestamp,
      (reservation_date + end_time)::timestamp,
      '[)'
    ) with &&
  )
  where (court in ('PAD', 'PAR') and status <> 'cancelada');
