import 'dotenv/config';

// Sincroniza reservas con una Google Sheet en vivo, vía un Apps Script Web
// App publicado en la propia planilla (ver docs/google-sheets-setup.md).
// GOOGLE_SHEETS_WEBHOOK_URL -> URL de "Implementación" del Apps Script.
// GOOGLE_SHEETS_WEBHOOK_SECRET -> compartido con el script, evita que
//   cualquiera que encuentre la URL pueda escribir en la planilla.
// Si no están configuradas, la sincronización queda desactivada en
// silencio: nunca debe romper el flujo real de reservas.

const WEBHOOK_URL = process.env.GOOGLE_SHEETS_WEBHOOK_URL;
const WEBHOOK_SECRET = process.env.GOOGLE_SHEETS_WEBHOOK_SECRET;

const NOMBRE_CANCHA = { C1: 'Cancha 1', C2: 'Cancha 2', PAD: 'Pádel' };

function conTimeout(promesa, ms) {
  return Promise.race([
    promesa,
    new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms)),
  ]);
}

// Convierte una fila de la tabla `reservations` (tal como llega del webhook
// de Supabase) al formato plano que espera el Apps Script.
function aFilaPlana(r) {
  return {
    code: r.code,
    cancha: NOMBRE_CANCHA[r.court] || r.court,
    fecha: r.reservation_date,
    horario: r.start_time && r.end_time ? `${r.start_time.slice(0, 5)} a ${r.end_time.slice(0, 5)}` : '',
    cliente: r.client_name || '',
    telefono: r.client_phone || '',
    email: r.client_email || '',
    equipo: r.team_name || '',
    estado: r.status || '',
    creada: r.created_at || '',
    confirmada: r.confirmed_at || '',
    cancelada: r.cancelled_at || '',
    canceladaPor: r.cancelled_by || '',
  };
}

// Manda la fila al Apps Script. No tira: un problema acá nunca debe afectar
// una reserva real (ni bloquear la respuesta al cliente ni al webhook).
export async function sincronizarReservaConSheet(record) {
  if (!WEBHOOK_URL) return { omitido: 'Google Sheets no configurado' };
  if (!record || !record.code) return { omitido: 'registro sin código' };

  try {
    const res = await conTimeout(
      fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ secret: WEBHOOK_SECRET, fila: aFilaPlana(record) }),
      }),
      10000
    );
    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      console.error('[sheetsSync] Apps Script respondió', res.status, txt.slice(0, 200));
      return { error: true };
    }
    return { ok: true };
  } catch (e) {
    console.error('[sheetsSync] error:', e.message);
    return { error: true };
  }
}
