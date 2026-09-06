-- Comentario opcional en los contactos que Mateo carga a mano.
-- (Los contactos que salen de las reservas se pueden anotar creando una fila
--  en contactos_manuales con el mismo teléfono: pasa a ser editable.)

alter table public.contactos_manuales
  add column if not exists comentario text;
