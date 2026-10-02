-- Defensa en profundidad: las tablas nuevas solo las usa el backend (service_role).
-- El RLS ya las bloquea para el público, pero además quitamos los permisos
-- de anon/authenticated, para que no queden abiertas si alguien desactiva el RLS.
revoke all on table public.lista_espera         from anon, authenticated;
revoke all on table public.contactos_manuales   from anon, authenticated;
revoke all on table public.bloqueos             from anon, authenticated;
revoke all on table public.turnos_fijos         from anon, authenticated;
revoke all on table public.aperturas_especiales from anon, authenticated;

-- rls_auto_enable() es un trigger de eventos (activa RLS en tablas nuevas);
-- no tiene por qué poder llamarse por la API pública.
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;

-- Para deshacer (no hace falta normalmente):
-- grant all on table public.lista_espera, public.contactos_manuales, public.bloqueos,
--   public.turnos_fijos, public.aperturas_especiales to anon, authenticated;
