import { generarCsvReservas } from './csvReservas.js';
import { enviarBackup } from './mailer.js';

// Hora (0-23, horario de Argentina UTC-3) a la que se manda el backup.
const HORA_BACKUP_ART = 3;

let ultimoBackupISO = null; // fecha del último backup enviado (para no repetir)

function fechaArgentinaISO() {
  const ahora = new Date();
  const art = new Date(ahora.getTime() - 3 * 60 * 60 * 1000);
  return art.toISOString().slice(0, 10);
}
function horaArgentina() {
  const art = new Date(Date.now() - 3 * 60 * 60 * 1000);
  return art.getUTCHours();
}

// Genera el CSV y lo manda por email a los ADMIN_EMAILS.
export async function ejecutarBackupDiario({ forzar = false } = {}) {
  const hoy = fechaArgentinaISO();

  if (!forzar) {
    if (ultimoBackupISO === hoy) return { omitido: 'ya se envió hoy' };
    if (horaArgentina() !== HORA_BACKUP_ART) return { omitido: 'fuera de horario' };
  }

  const para = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim())
    .filter(Boolean);
  if (!para.length) {
    console.warn('[backup] no hay ADMIN_EMAILS configurados');
    return { error: 'sin ADMIN_EMAILS' };
  }

  const { csv, total } = await generarCsvReservas();
  const res = await enviarBackup({ para, csv, fecha: hoy, total });
  ultimoBackupISO = hoy;
  console.log(`[backup] enviado a ${para.join(', ')} (${total} reservas)`, res.simulado ? '[SIMULADO]' : '');
  return { enviado: true, fecha: hoy, total, destinatarios: para, simulado: !!res.simulado };
}

// Arranca el chequeo periódico (cada 20 min mira si toca mandar el backup).
export function iniciarBackupDiario() {
  const tick = () => ejecutarBackupDiario().catch((e) => console.error('[backup] error:', e.message));
  tick();
  setInterval(tick, 20 * 60 * 1000);
}
