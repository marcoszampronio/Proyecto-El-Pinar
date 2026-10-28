import webpush from 'web-push';
import { supabaseAdmin } from './supabaseAdmin.js';
import { fechaCorta, hora, primerNombre } from './mensajes.js';
import 'dotenv/config';

// Avisos al celular (push). Si faltan las claves VAPID, quedan apagados y nada más se rompe.
const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT } = process.env;
export const pushConfigurado = !!(VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY);
if (pushConfigurado) {
  webpush.setVapidDetails(VAPID_SUBJECT || 'mailto:jmarcoszampronio@gmail.com', VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}
export const clavePublicaPush = VAPID_PUBLIC_KEY || null;

const CANCHA = { C1: 'Cancha 1', C2: 'Cancha 2', PAD: 'Pádel' };

// Tipos de aviso. Cada dispositivo puede apagar los que no quiere (columna `apagados`).
// soloMantenedor: solo lo ve y lo recibe el usuario de las alertas (ver lib/alertas.js).
export const TIPOS_AVISO = [
  { id: 'reserva_nueva', titulo: 'Reserva nueva', detalle: 'Cuando alguien pide un turno y toca "Enviar WhatsApp".' },
  { id: 'lista_espera', titulo: 'Lista de espera', detalle: 'Cuando alguien se anota para que le avisen si se libera un turno.' },
  { id: 'sin_atender', titulo: 'Reservas sin atender', detalle: 'Si una reserva lleva más de 2 horas esperando tu OK (solo de 9 a 22 hs).' },
  { id: 'lluvia', titulo: 'Pronóstico de lluvia', detalle: 'El día anterior a un día de juego, si hay mucha probabilidad de lluvia y reservas para suspender.' },
  { id: 'accion_empleado', titulo: 'Lo que hacen los empleados', detalle: 'Cuando un empleado agenda o cancela un turno desde el panel.', soloAdmin: true },
  { id: 'falla', titulo: 'Fallas del sistema', detalle: 'Cuando el servidor da error o falla un mail.', soloMantenedor: true },
];
export const IDS_TIPOS = TIPOS_AVISO.map((t) => t.id);

// Cuántas reservas esperan confirmación (las que ya mandaron el WhatsApp): es el número del ícono.
async function contarPendientes() {
  const { count } = await supabaseAdmin
    .from('reservations')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'pendiente')
    .not('whatsapp_enviado_at', 'is', null);
  return count || 0;
}

// Manda un aviso a todos los dispositivos suscriptos (o solo a los de un mail) que no tengan apagado ese `tipo`.
// Borra las suscripciones que el servicio de push da por vencidas (404/410).
// Nunca lanza error: devuelve un resumen. Espera como máximo `limiteMs` para no demorar al cliente.
export async function enviarPush(payload, { email = null, limiteMs = 4000, tipo = null, soloAdmins = false } = {}) {
  if (!pushConfigurado) return { omitido: 'sin claves VAPID' };

  const tarea = (async () => {
    let q = supabaseAdmin.from('push_suscripciones').select('*');
    if (email) q = q.ilike('admin_email', email);
    const { data, error } = await q;
    if (error) return { error: error.message };
    const admins = (process.env.ADMIN_EMAILS || '').split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);
    const subs = (data || [])
      .filter((s) => !tipo || !(s.apagados || []).includes(tipo))
      .filter((s) => !soloAdmins || admins.includes(String(s.admin_email).toLowerCase()));
    if (!subs.length) return { enviados: 0 };

    const cuerpo = JSON.stringify(payload);
    let enviados = 0;
    await Promise.all(subs.map(async (s) => {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, cuerpo, { TTL: 3600, urgency: 'high' });
        enviados++;
        await supabaseAdmin.from('push_suscripciones').update({ ultimo_envio_ok: new Date().toISOString() }).eq('id', s.id);
      } catch (e) {
        if (e.statusCode === 404 || e.statusCode === 410) {
          await supabaseAdmin.from('push_suscripciones').delete().eq('id', s.id);
        } else {
          console.error('[push] no se pudo enviar:', e.statusCode || '', e.message);
        }
      }
    }));
    return { enviados };
  })().catch((e) => { console.error('[push] error:', e.message); return { error: e.message }; });

  return Promise.race([tarea, new Promise((r) => setTimeout(() => r({ demorado: true }), limiteMs))]);
}

// "Reserva nueva · Cancha 2 · jue 22 · 21:30" (sin nombre ni teléfono).
export async function avisarReservaNueva(reserva) {
  const badge = await contarPendientes().catch(() => undefined);
  // "LOS PIBES (Lucas) quiere reservar la Cancha 2 el jueves 29/10 a las 22:30"
  const persona = primerNombre(reserva.client_name);
  const quien = reserva.team_name ? `${reserva.team_name} (${persona})` : persona;
  const cuando = reserva.court === 'PAD'
    ? `la cancha de pádel el ${fechaCorta(reserva.reservation_date)} de ${hora(reserva.start_time)} a ${hora(reserva.end_time)}`
    : `la ${CANCHA[reserva.court] || reserva.court} el ${fechaCorta(reserva.reservation_date)} a las ${hora(reserva.start_time)}`;
  return enviarPush({
    titulo: 'Reserva nueva',
    texto: `${quien} quiere reservar ${cuando}`,
    tag: `reserva-${reserva.code}`,
    url: '/panel?tab=hoy',
    badge,
  }, { tipo: 'reserva_nueva' });
}

// Un empleado agendó o canceló un turno: se les avisa a los administradores (nunca a los empleados).
export async function avisarAccionEmpleado({ quien, accion, reserva }) {
  try {
    const lugar = CANCHA[reserva.court] || reserva.court;
    const nombre = reserva.team_name || reserva.client_name;
    return await enviarPush({
      titulo: accion === 'agendó' ? 'Un empleado agendó un turno' : 'Un empleado canceló un turno',
      texto: `${quien} ${accion}: ${lugar} · ${fechaCorta(reserva.reservation_date)} · ${hora(reserva.start_time)} · ${nombre}`,
      tag: `empleado-${accion}-${reserva.code}`,
      url: accion === 'agendó' ? '/panel?tab=hoy' : '/panel?tab=agenda',
    }, { tipo: 'accion_empleado', soloAdmins: true });
  } catch (e) {
    console.error('[push] acción de empleado:', e.message);
    return { error: e.message };
  }
}

// Alguien se anotó en la lista de espera: "Lista de espera · 2 esperan turno el jueves 29/10" (sin nombre ni teléfono).
export async function avisarListaEspera(fecha, nombre = null) {
  const { count } = await supabaseAdmin
    .from('lista_espera')
    .select('id', { count: 'exact', head: true })
    .eq('reservation_date', fecha)
    .eq('status', 'activa');
  const n = count || 1;
  const quien = nombre ? primerNombre(nombre) : 'Una persona';
  return enviarPush({
    titulo: 'Lista de espera',
    texto: `${quien} quiere que le avisen si se libera un turno el ${fechaCorta(fecha)}${n > 1 ? ` (ya son ${n} esperando)` : ''}`,
    tag: `espera-${fecha}`,
    url: '/panel?tab=hoy',
  }, { tipo: 'lista_espera' });
}
