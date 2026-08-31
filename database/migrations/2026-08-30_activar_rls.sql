-- Migración: activar Row Level Security (RLS)
-- Ejecutar en Supabase > SQL Editor
--
-- Cómo queda: NADIE puede leer ni escribir las tablas con la clave pública
-- (anon) ni con una cuenta común. Solo el backend, que usa la service_role
-- key, puede tocar los datos — y el backend ya chequea ADMIN_EMAILS antes.
-- El panel funciona igual porque todo pasa por el backend.

alter table reservations enable row level security;
alter table admins enable row level security;

-- Sacar las políticas viejas que daban acceso directo (ya no se usan: todo
-- pasa por el backend con service_role, que ignora RLS).
drop policy if exists "publico_puede_reservar" on reservations;
drop policy if exists "admins_full_access" on reservations;

-- No creamos ninguna política nueva: sin políticas = tabla cerrada para
-- anon/authenticated. El service_role del backend no necesita políticas.
