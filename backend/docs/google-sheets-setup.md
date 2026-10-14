# Google Sheets en vivo — guía de armado

> **Estado: ya armado y en uso.** Esta guía queda como referencia por si hay
> que rearmarlo alguna vez (otro proyecto, se pierde la clave, etc.). Los
> pasos 1, 2 y 4 ya están hechos; solo falta repasar el paso 3 si cambian las
> variables de entorno en Render.

Cada vez que una reserva se crea, se confirma o se cancela (sea desde la web,
el panel de admin, o los procesos automáticos de turnos fijos / vencimiento),
el backend avisa y la fila correspondiente se crea o actualiza sola en esta
planilla, buscándola por el código de reserva.

Planilla ya creada: **El Pinar — Reservas en vivo**
https://docs.google.com/spreadsheets/d/12JXb7D5OuP4ZXsQF-YkD-qpTyFHvNPUYQaHSYyziSd4/edit

## 1. Pegar el Apps Script en la planilla

1. Abrí la planilla de arriba.
2. Extensiones → Apps Script.
3. Borrá el contenido de `Código.gs` y pegá el contenido de
   `backend/docs/apps-script-sheets-sync.gs` (este repo).
4. Arriba del script hay una línea:
   ```js
   var SECRETO = 'PEGAR_ACA_EL_MISMO_VALOR_DE_GOOGLE_SHEETS_WEBHOOK_SECRET';
   ```
   Reemplazá ese valor por una clave inventada (cualquier texto largo al
   azar). Vas a usar esa misma clave en el paso 3.
5. Guardar (ícono de disquete o Ctrl+S).

## 2. Implementar como app web

1. Arriba a la derecha: **Implementar** → **Nueva implementación**.
2. Tipo: **Aplicación web**.
3. "Ejecutar como": tu cuenta (la dueña de la planilla).
4. "Quién tiene acceso": **Cualquier usuario**.
   (No es un problema de seguridad: nadie puede escribir sin la clave
   `SECRETO` del paso 1, que no vas a compartir.)
5. Implementar → copiá la URL que te da ("URL de la aplicación web",
   termina en `/exec`).

## 3. Configurar el backend

En el `.env` del backend (y en las variables de entorno de Render):

```
GOOGLE_SHEETS_WEBHOOK_URL=<la URL /exec del paso 2>
GOOGLE_SHEETS_WEBHOOK_SECRET=<la misma clave que pegaste en el script>
SUPABASE_WEBHOOK_SECRET=<otra clave inventada, distinta a la de arriba>
```

Reiniciar el backend (o el servicio en Render) después de cargarlas.

## 4. Conectar Supabase

Esto es lo que hace que CUALQUIER cambio en la tabla `reservations`
(sin importar qué parte del código lo hizo) dispare la sincronización. Se
puede hacer con el botón de Database → Webhooks del dashboard de Supabase,
pero es más directo pegar esto en el **SQL Editor** del proyecto y ejecutarlo
una vez (es exactamente lo mismo que arma ese botón por detrás):

```sql
create extension if not exists pg_net;

create or replace function public.notificar_cambio_reserva()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform net.http_post(
    url := 'https://proyecto-el-pinar.onrender.com/api/internal/sheets-sync',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'X-Webhook-Secret', '<el mismo SUPABASE_WEBHOOK_SECRET del paso 3>'
    ),
    body := jsonb_build_object(
      'type', TG_OP,
      'table', TG_TABLE_NAME,
      'record', row_to_json(NEW)
    )
  );
  return NEW;
end;
$$;

create trigger trg_reservations_sheets_sync
after insert or update on public.reservations
for each row
execute function public.notificar_cambio_reserva();
```

Si alguna vez hay que cambiar la URL del backend o la clave, se actualiza el
`create or replace function` de arriba con los valores nuevos (no hace falta
tocar el trigger).

## 5. Probar

- Hacé una reserva de prueba desde la web (o cambiá el estado de una desde
  el panel).
- En unos segundos debería aparecer (o actualizarse) la fila en la planilla,
  en la pestaña **Reservas** (el script la crea sola con los encabezados la
  primera vez que recibe algo).
- Si no aparece nada: revisá en Supabase → Database → Webhooks → el hook →
  "Logs", ahí se ve si Supabase pudo llamar al backend y qué respondió.

## Qué pasa si algo de esto no está configurado

El backend nunca rompe una reserva real por esto: si falta
`GOOGLE_SHEETS_WEBHOOK_URL`, la sincronización se salta en silencio (se ve
un log, nada más). Es seguro activarlo de a poco.
