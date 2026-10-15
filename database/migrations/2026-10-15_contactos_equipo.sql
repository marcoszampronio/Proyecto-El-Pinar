-- Los contactos guardan el nombre del equipo (Mateo conoce a los equipos, no a los jugadores).
alter table public.contactos_manuales add column if not exists equipo text;

-- Para deshacer (no hace falta normalmente):
-- alter table public.contactos_manuales drop column equipo;
