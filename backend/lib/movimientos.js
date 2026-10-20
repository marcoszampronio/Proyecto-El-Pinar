import { supabaseAdmin } from './supabaseAdmin.js';
import { fechaCorta, hora } from './mensajes.js';

const CANCHA = { C1: 'Cancha 1', C2: 'Cancha 2', PAD: 'Pádel', FUT: 'Fútbol' };

// "Juan Pérez (Cancha 1, martes 20/10 20:30)"
export function descripcionTurno(r) {
  const quien = r.team_name ? `${r.team_name} · ${r.client_name}` : r.client_name;
  return `${quien} (${CANCHA[r.court] || r.court}, ${fechaCorta(r.reservation_date)} ${hora(r.start_time)})`;
}

// Anota un movimiento del panel. Nunca rompe la acción principal: si falla
// (ej. la tabla todavía no existe) solo deja un aviso en el log.
export async function registrarMovimiento({ email, accion, detalle, code = null, fecha = null }) {
  try {
    const { error } = await supabaseAdmin.from('movimientos').insert({
      admin_email: email || null,
      accion,
      detalle,
      reservation_code: code,
      reservation_date: fecha,
    });
    if (error) console.error('[movimientos] no se pudo registrar:', error.message);
  } catch (e) {
    console.error('[movimientos] error:', e.message);
  }
}
