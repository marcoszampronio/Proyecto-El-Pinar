import { supabaseAdmin } from './supabaseAdmin.js';
import { enviarPush } from './push.js';
import { esFechaAbierta } from './aperturasEspeciales.js';
import { fechaCorta } from './mensajes.js';
import { hoyART } from './anticipacion.js';
import { ALERTAS_EMAIL } from './alertas.js';

// Avisos que salen por horario. Se revisan cada 10 minutos (ver server.js). Nunca lanzan error.

const horaART = () => new Date(Date.now() - 3 * 3600000).getUTCHours(); // hora de Argentina (0-23)
const sumarDiasISO = (iso, n) => new Date(new Date(`${iso}T12:00:00Z`).getTime() + n * 86400000).toISOString().slice(0, 10);

const HORAS_SIN_ATENDER = 2;
const LATITUD = -31.7333;   // Paraná
const LONGITUD = -60.5297;
const PROBABILIDAD_ALTA = 60; // % de lluvia a partir del cual se avisa
const MILIMETROS_ALTOS = 5;   // o milímetros previstos

// 1) Reservas que mandaron el WhatsApp y llevan más de 2 horas sin que nadie las confirme o cancele.
//    Se avisa una sola vez por reserva y solo de 9 a 22 hs (de noche se avisa a la mañana siguiente).
export async function avisarReservasSinAtender() {
  const h = horaART();
  if (h < 9 || h >= 22) return { omitido: 'fuera de horario' };

  const limite = new Date(Date.now() - HORAS_SIN_ATENDER * 3600000).toISOString();
  const { data, error } = await supabaseAdmin
    .from('reservations')
    .select('id')
    .eq('status', 'pendiente')
    .not('whatsapp_enviado_at', 'is', null)
    .lt('whatsapp_enviado_at', limite)
    .is('aviso_demora_at', null);
  if (error) { console.error('[avisos] sin atender:', error.message); return { error: error.message }; }
  if (!data?.length) return { omitido: 'ninguna' };

  // se marcan primero, así nunca se repite el aviso aunque el envío demore o el servidor se reinicie
  const { error: e2 } = await supabaseAdmin
    .from('reservations')
    .update({ aviso_demora_at: new Date().toISOString() })
    .in('id', data.map((r) => r.id));
  if (e2) { console.error('[avisos] marcar demora:', e2.message); return { error: e2.message }; }

  const n = data.length;
  return enviarPush({
    titulo: 'Reservas sin atender',
    texto: n === 1 ? `Una reserva lleva más de ${HORAS_SIN_ATENDER} horas esperando tu OK.` : `${n} reservas llevan más de ${HORAS_SIN_ATENDER} horas esperando tu OK.`,
    tag: 'sin-atender',
    url: '/panel?tab=hoy',
    badge: n,
  }, { tipo: 'sin_atender' });
}

// 2) A las 17 hs: si mañana es día de juego, hay mucha probabilidad de lluvia y hay reservas, se avisa.
//    Se intenta una vez por día (clave en `avisos_programados`).
export async function avisarPronosticoLluvia() {
  if (horaART() !== 17) return { omitido: 'no es la hora' };
  const manana = sumarDiasISO(hoyART(), 1);
  const clave = `lluvia-${manana}`;

  const { error: eClave } = await supabaseAdmin.from('avisos_programados').insert({ clave });
  if (eClave) return { omitido: 'ya se intentó hoy' }; // clave repetida: otro ciclo ya lo hizo

  const volverAIntentar = () => supabaseAdmin.from('avisos_programados').delete().eq('clave', clave);
  try {
    if (!(await esFechaAbierta(manana))) return { omitido: 'mañana no se juega' };

    const url = `https://api.open-meteo.com/v1/forecast?latitude=${LATITUD}&longitude=${LONGITUD}`
      + '&daily=precipitation_probability_max,precipitation_sum&timezone=America%2FArgentina%2FBuenos_Aires&forecast_days=3';
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 8000);
    const res = await fetch(url, { signal: ctrl.signal }).finally(() => clearTimeout(t));
    if (!res.ok) throw new Error(`pronóstico respondió ${res.status}`);
    const j = await res.json();
    const i = (j.daily?.time || []).indexOf(manana);
    if (i < 0) throw new Error('el pronóstico no trae mañana');
    const prob = Number(j.daily.precipitation_probability_max?.[i] ?? 0);
    const mm = Number(j.daily.precipitation_sum?.[i] ?? 0);
    if (prob < PROBABILIDAD_ALTA && mm < MILIMETROS_ALTOS) return { omitido: 'poca lluvia' };

    const { count } = await supabaseAdmin
      .from('reservations')
      .select('id', { count: 'exact', head: true })
      .eq('reservation_date', manana)
      .neq('status', 'cancelada');
    if (!count) return { omitido: 'sin reservas para suspender' };

    return await enviarPush({
      titulo: 'Pronóstico de lluvia',
      texto: `${fechaCorta(manana)}: ${prob}% de lluvia y ${count} ${count === 1 ? 'reserva' : 'reservas'}. ¿Suspendés?`,
      tag: clave,
      url: '/panel?tab=suspender',
    }, { tipo: 'lluvia' });
  } catch (e) {
    console.error('[avisos] lluvia:', e.message);
    await volverAIntentar().catch(() => {}); // si falló el pronóstico, se reintenta en la próxima vuelta (dentro de la misma hora)
    return { error: e.message };
  }
}

// 3) Alguien pidió recuperar su contraseña o la cambió (los anota un trigger en la base: `eventos_cuenta`).
//    Solo le llega al usuario de las alertas, una sola vez por evento, y únicamente si hubo alguno: si no pasó nada, no se manda nada.
const MAX_ANTIGUEDAD_EVENTO_MS = 2 * 3600000; // si el servidor estuvo caído y el evento es viejo, no tiene sentido avisarlo tarde
export async function avisarCambiosDeCuenta() {
  const { data, error } = await supabaseAdmin
    .from('eventos_cuenta')
    .select('id, tipo, email, created_at')
    .is('avisado_at', null)
    .order('created_at')
    .limit(50);
  if (error) { console.error('[avisos] cuentas:', error.message); return { error: error.message }; }
  if (!data?.length) return { omitido: 'ninguno' };

  // se marcan primero, así nunca se repite el aviso aunque el envío demore o el servidor se reinicie
  const { error: e2 } = await supabaseAdmin.from('eventos_cuenta').update({ avisado_at: new Date().toISOString() }).in('id', data.map((e) => e.id));
  if (e2) { console.error('[avisos] marcar cuentas:', e2.message); return { error: e2.message }; }

  // lo mismo pedido dos veces seguidas (misma cuenta, mismo tipo) se avisa una sola vez
  const vistos = new Set();
  const vigentes = data
    .filter((e) => Date.now() - new Date(e.created_at).getTime() < MAX_ANTIGUEDAD_EVENTO_MS)
    .filter((e) => { const k = `${e.tipo}|${e.email}`; if (vistos.has(k)) return false; vistos.add(k); return true; });
  if (!vigentes.length) return { omitido: 'eventos viejos' };

  const frase = (e) => (e.tipo === 'clave_pedida' ? `Pidieron recuperar la contraseña de ${e.email}` : `Se cambió la contraseña de ${e.email}`);
  const texto = vigentes.length <= 3 ? vigentes.map(frase).join('. ') : `${vigentes.length} movimientos de contraseñas en las cuentas del panel.`;
  return enviarPush({
    titulo: 'Contraseñas',
    texto,
    tag: 'cuentas',
    url: '/panel',
  }, { email: ALERTAS_EMAIL, tipo: 'cuenta' });
}

export async function correrAvisosProgramados() {
  for (const tarea of [avisarReservasSinAtender, avisarPronosticoLluvia, avisarCambiosDeCuenta]) {
    try { await tarea(); } catch (e) { console.error('[avisos] error:', e.message); }
  }
}
