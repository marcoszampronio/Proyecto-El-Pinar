-- Equipo opcional en los turnos fijos (para el registro de Mateo; no lo
-- pone en "Busco rival").

alter table public.turnos_fijos
  add column if not exists team_name text;
