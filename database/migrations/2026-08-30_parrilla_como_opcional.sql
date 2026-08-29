-- Migración: la parrilla deja de ser una "cancha" y pasa a ser un adicional
-- opcional de cualquier reserva. Hay 2 parrillas => máximo 2 reservas con
-- parrilla por fecha. Ejecutar en Supabase > SQL Editor.

alter table reservations add column if not exists parrilla boolean not null default false;

-- (opcional) limpiar reservas viejas que se hayan creado con court = 'PAR'
-- durante las pruebas:
-- delete from reservations where court = 'PAR';
