import webpush from 'web-push';
import { supabaseAdmin } from './supabaseAdmin.js';
import { fechaCorta, hora } from './mensajes.js';
import 'dotenv/config';

// Avisos al celular (push). Si faltan las claves VAPID, quedan apagados y nada más se rompe.
const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT } = process.env;
export const pushConfigurado = !!(VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY);
if (pushConfigurado) {
  webpush.setVapidDetails(VAPID_SUBJECT || 'mailto:jmarcoszampronio@gmail.com', VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}
export const clavePublicaPush = VAPID_PUBLIC_KEY || null;

const CANCHA = { C1: 'Cancha 1', C2: 'Cancha 2', PAD: 'Pádel' };

// Cuántas reservas esperan confirmación (las que ya mandaron el WhatsApp): es el número del ícono.
async function contarPendientes() {
  const { count } = await supabaseAdmin
    .from('reservations')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'pendiente')
    .not('whatsapp_enviado_at', 'is', null);
  return count || 0;
}

// Manda un aviso a todos los dispositivos suscriptos (o solo a los de un mail).
// Borra las suscripciones que el servicio de push da por vencidas (404/410).
// Nunca lanza error: devuelve un resumen. Espera como máximo `limiteMs` para no demorar al cliente.
export async function enviarPush(payload, { email = null, limiteMs = 4000 } = {}) {
  if (!pushConfigurado) return { omitido: 'sin claves VAPID' };

  const tarea = (async () => {
    let q = supabaseAdmin.from('push_suscripciones').select('*');
    if (email) q = q.ilike('admin_email', email);
    const { data: subs, error } = await q;
    if (error) return { error: error.message };
    if (!subs?.length) return { enviados: 0 };

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
  const lugar = CANCHA[reserva.court] || reserva.court;
  const badge = await contarPendientes().catch(() => undefined);
  return enviarPush({
    titulo: 'Reserva nueva',
    texto: `${lugar} · ${fechaCorta(reserva.reservation_date)} · ${hora(reserva.start_time)}`,
    tag: `reserva-${reserva.code}`,
    url: '/panel?tab=hoy',
    badge,
  });
}

// Alguien se anotó en la lista de espera: "Lista de espera · 2 esperan turno el jueves 29/10" (sin nombre ni teléfono).
export async function avisarListaEspera(fecha) {
  const { count } = await supabaseAdmin
    .from('lista_espera')
    .select('id', { count: 'exact', head: true })
    .eq('reservation_date', fecha)
    .eq('status', 'activa');
  const n = count || 1;
  return enviarPush({
    titulo: 'Lista de espera',
    texto: n === 1 ? `Una persona quiere que le avisen si se libera un turno · ${fechaCorta(fecha)}` : `${n} personas quieren que les avisen si se libera un turno · ${fechaCorta(fecha)}`,
    tag: `espera-${fecha}`,
    url: '/panel?tab=hoy',
  });
}
