# Google Sheets en vivo — guía de armado

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
(sin importar qué parte del código lo hizo) dispare la sincronización.

1. Entrá al proyecto en supabase.com → **Database** → **Webhooks**.
2. **Create a new hook**.
3. Nombre: `sheets-sync` (o lo que quieras).
4. Tabla: `reservations`.
5. Eventos: tildar **Insert** y **Update** (no hace falta Delete).
6. Tipo: **HTTP Request**.
7. URL: `https://<tu-backend-en-render>.onrender.com/api/internal/sheets-sync`
8. Método: `POST`.
9. HTTP Headers → agregar uno:
   - Nombre: `X-Webhook-Secret`
   - Valor: el mismo `SUPABASE_WEBHOOK_SECRET` del paso 3.
10. Guardar.

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
