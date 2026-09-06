-- Permite "ocultar" de la lista de contactos a alguien que tiene reservas
-- (no se puede borrar de verdad porque hay historial). Los contactos cargados
-- a mano SIN reservas se siguen borrando del todo.

alter table public.contactos_manuales
  add column if not exists oculto boolean not null default false;
