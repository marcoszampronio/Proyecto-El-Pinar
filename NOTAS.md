# Notas técnicas del proyecto

Este archivo es para que cualquiera que abra el proyecto (Cursor, Claude, u
otra persona) entienda rápido las decisiones tomadas sin tener que releer
toda la conversación original.

## Stack elegido
- **Frontend**: React + Vite (sin framework de UI, CSS propio en `styles.css`)
- **Backend**: Node.js + Express (API REST simple)
- **Base de datos**: Supabase (Postgres + Auth)
- **Hosting sugerido**: Netlify (frontend) + Railway/Render (backend)

## Decisiones de negocio importantes
- Hay 3 "canchas": `C1`, `C2` (fútbol 11, turnos fijos T1/T2/T3) y `PAD`
  (pádel, horario flexible elegido por el cliente).
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
- [ ] Backup automático diario a Google Drive (hoy no está implementado).
- [ ] Botón de exportar historial a Excel desde el panel.
- [ ] Borrado/archivado automático de reservas después de X tiempo.
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
