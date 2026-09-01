# Notas técnicas del proyecto

Este archivo es para que cualquiera que abra el proyecto (Cursor, Claude, u
otra persona) entienda rápido las decisiones tomadas sin tener que releer
toda la conversación original.

## Stack elegido
- **Frontend**: React + Vite (sin framework de UI, CSS propio en `styles.css`)
- **Backend**: Node.js + Express (API REST simple)
- **Base de datos**: Supabase (Postgres + Auth)
- **Hosting**: Cloudflare Pages (frontend) + Render (backend) + Supabase (base)

## Decisiones de negocio importantes
- Hay 4 espacios reservables: `C1`, `C2` (fútbol 11, turnos fijos T1/T2/T3),
  `PAD` (pádel, rango flexible 20:00–23:30) y `PAR` (parrilla, rango flexible
  11:00–23:30). Todos se reservan solo martes/miércoles/jueves.
- Migraciones pendientes de correr en Supabase (carpeta `database/migrations/`):
  `2026-08-29_fix_rivals_view.sql` (hecha), `2026-08-29_agregar_parrilla.sql`
  (habilita `PAR`), `2026-08-29_anti_solape_flexible.sql` (opcional, robustez).
- El cliente **paga primero** (transferencia externa al sistema) y después
  envía el comprobante + código por WhatsApp de forma manual.
- El código de reserva es **determinístico** (no aleatorio): se arma solo
  con cancha + fecha + turno/horario. Esto tiene una ventaja extra: la base
  de datos usa ese mismo horario como restricción única, así que es
  imposible que dos personas reserven el mismo turno sin que uno choque.
- Mateo (o cualquier admin) confirma o cancela **pegando el código** en el
  panel — el sistema le sugiere automáticamente la acción según el estado
  actual de esa reserva (pendiente → sugiere confirmar; confirmada → sugiere
  cancelar).
- La sección "Buscando Rival" se llena sola cuando una reserva confirmada
  tenía marcado el checkbox correspondiente. Los equipos se contactan
  directamente por WhatsApp entre ellos — Mateo no es intermediario.
- El panel de administración usa el login real de Supabase Auth. La lista
  de quién puede entrar se controla con la variable de entorno
  `ADMIN_EMAILS` en el backend (no hace falta tocar código para agregar a
  alguien, solo agregarlo en Supabase Auth + esa variable).

## Lo que falta para producción (ver también CHECKLIST_PROYECTO.md)
- [x] Backup automático diario: el backend manda el CSV completo por email a
      `ADMIN_EMAILS` todos los días a las 3:00 ART (`backend/lib/backupDiario.js`).
      Se puede disparar a mano desde el panel (Estadísticas → "Enviar backup ahora").
      Se descartó Google Drive por la complejidad de la service account.
- [x] Deploy: Render (backend) + Cloudflare Pages (frontend). Ver `DEPLOY.md`.
- [x] Botón de exportar historial a Excel desde el panel.
- [x] Expiración automática de reservas pendientes sin comprobante (60 min,
      `backend/lib/expirarPendientes.js`, corre cada 15 min).
- [x] Rate limit en la creación de reservas (`express-rate-limit`, 8 cada 15 min).
- [x] `helmet` para cabeceras de seguridad + CORS restringible por `CORS_ORIGINS`.
- [x] Escapado seguro del CSV (evita CSV injection en Excel).
- [ ] Definir alias de transferencia y número de WhatsApp reales en el
      archivo `.env` del backend.
- [ ] Configurar SMTP real para que los emails salgan de verdad (hoy están
      simulados si no se configura).
- [ ] Revisar textos/copys con Mateo antes de lanzar (nombre del complejo,
      mensajes de WhatsApp, etc. son placeholders).
- [ ] Ajustar el diseño visual con lo que definamos en base a las imágenes
      que mande el usuario.

## Convenciones de código
- Todo el texto de cara al usuario está en español.
- Las variables/funciones internas están en español también, para que sea
  consistente y fácil de seguir para quien continúe el proyecto.
- Cada carpeta (`backend`, `frontend`) tiene su propio `package.json` y se
  instalan/corren por separado.
