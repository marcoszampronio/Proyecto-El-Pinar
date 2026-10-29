import { supabaseAdmin } from './supabaseAdmin.js';
import { fechaCorta, hora } from './mensajes.js';

const CANCHA = { C1: 'Cancha 1', C2: 'Cancha 2', PAD: 'Pádel', FUT: 'Fútbol' };

// "Juan Pérez (Cancha 1, martes 20/10 20:30)"
export function descripcionTurno(r) {
  const quien = r.team_name ? `${r.team_name} · ${r.client_name}` : r.client_name;
  return `${quien} (${CANCHA[r.court] || r.court}, ${fechaCorta(r.reservation_date)} ${hora(r.start_time)})`;
}

// Quién hizo qué con estas reservas: { codigo: [{ accion, quien, email, cuando }] } (de la más vieja a la más nueva).
// `quien` es el nombre si es un empleado (tabla `empleados_panel`) y null si es un administrador.
// Lo ven los administradores en la grilla y en el detalle del turno. Solo cuentan los movimientos hechos
// después de crearse la reserva (los códigos se reusan si un turno se cancela y se vuelve a reservar).
// Nunca lanza error: si algo falla devuelve {}.
export async function accionesDelPanel(reservas) {
  try {
    if (!reservas?.length) return {};
    const creada = Object.fromEntries(reservas.map((r) => [r.code, new Date(r.created_at).getTime() - 5000]));
    const [{ data: emps }, { data }] = await Promise.all([
      supabaseAdmin.from('empleados_panel').select('email, nombre'),
      supabaseAdmin
        .from('movimientos')
        .select('reservation_code, accion, admin_email, created_at')
        .in('reservation_code', reservas.map((r) => r.code))
        .in('accion', ['agendo', 'confirmo', 'cancelo'])
        .order('created_at', { ascending: true }),
    ]);
    const nombres = Object.fromEntries((emps || []).map((e) => [e.email.toLowerCase(), e.nombre || e.email.split('@')[0]]));
    const porCodigo = {};
    for (const m of data || []) {
      if (!m.admin_email || new Date(m.created_at).getTime() < creada[m.reservation_code]) continue;
      const email = String(m.admin_email).toLowerCase();
      (porCodigo[m.reservation_code] ||= []).push({ accion: m.accion, quien: nombres[email] || null, email, cuando: m.created_at });
    }
    return porCodigo;
  } catch (e) {
    console.error('[movimientos] acciones del panel:', e.message);
    return {};
  }
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
