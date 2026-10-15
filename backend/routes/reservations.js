import { Router } from 'express';
import { supabaseAdmin } from '../lib/supabaseAdmin.js';
import {
  TURNOS_FUTBOL,
  PADEL_APERTURA,
  PADEL_CIERRE,
  generarCodigoFutbol,
  generarCodigoPadel,
} from '../lib/codeGenerator.js';
import { enviarAvisoNuevaReserva } from '../lib/mailer.js';
import { normalizarEquipo } from '../lib/equipo.js';
import { demasiadoTarde, MENSAJE_ANTICIPACION } from '../lib/anticipacion.js';
import { MINUTOS_HOLD_SIN_WHATSAPP } from '../lib/expirarPendientes.js';
import { obtenerBloqueosDelDia, estaBloqueado } from '../lib/bloqueos.js';
import { esFechaAbierta } from '../lib/aperturasEspeciales.js';
import 'dotenv/config';

const router = Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validarDatosCliente(body) {
  // Honeypot: campo oculto que solo un bot completa.
  if (body.contacto_alterno) return 'Solicitud inválida.';

  const nombre = String(body.clientName || '').trim();
  const telefono = String(body.clientPhone || '').trim();
  const email = String(body.clientEmail || '').trim();

  if (!nombre || !telefono) return 'Completá tu nombre y teléfono.';
  if (nombre.length > 80) return 'El nombre es demasiado largo.';
  if (telefono.replace(/\D/g, '').length < 8) return 'Revisá tu número de WhatsApp.';
  // El mail es opcional (ya no se pide en el formulario); si llega, tiene que ser válido.
  if (email && (email.length > 120 || !EMAIL_RE.test(email))) return 'Revisá tu email, no parece válido.';
  if (body.lookingForRival) {
    const equipo = String(body.teamName || '').trim();
    if (!equipo) return 'Completá el nombre de tu equipo.';
    if (equipo.length > 80) return 'El nombre del equipo es demasiado largo.';
    if (!body.category) return 'Elegí la categoría del equipo.';
  }
  return null;
}

const NOMBRE_CANCHA = { C1: 'Cancha 1', C2: 'Cancha 2', PAD: 'Pádel' };

const DIAS_SEM = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MESES_LARGO = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
function fechaLinda(iso) {
  const d = new Date(iso + 'T00:00:00');
  const dia = DIAS_SEM[d.getDay()];
  return `${dia.charAt(0).toUpperCase()}${dia.slice(1)} ${d.getDate()} de ${MESES_LARGO[d.getMonth()]}`;
}

function armarMensajeWhatsapp(reserva) {
  const cancha = NOMBRE_CANCHA[reserva.court] || reserva.court;
  const horario = `${reserva.start_time.slice(0, 5)} a ${reserva.end_time.slice(0, 5)} hs`;
  return (
    `¡Hola! Quiero reservar en El Pinar.\n\n` +
    `${cancha} · ${fechaLinda(reserva.reservation_date)} · ${horario}\n` +
    `A nombre de ${reserva.client_name}`
  );
}

function respuestaReserva(res, data) {
  // El aviso por mail a los admins ya NO sale acá: sale cuando la persona aprieta
  // "Enviar WhatsApp" (ruta /whatsapp-enviado), así no avisamos de turnos que
  // alguien abandonó y se liberan solos.
  res.json({
    reserva: data,
    holdMinutos: MINUTOS_HOLD_SIN_WHATSAPP,
    mensajeWhatsapp: armarMensajeWhatsapp(data),
    numeroWhatsapp: process.env.WHATSAPP_NUMERO,
  });
}

// GET /api/reservations/estado/:code - consulta pública del estado de una reserva.
// Solo devuelve datos del turno (sin teléfono ni email), y el estado ya se ve
// igual en la grilla de disponibilidad, así que no expone nada nuevo.
router.get('/estado/:code', async (req, res) => {
  const code = (req.params.code || '').trim();
  if (!code) return res.status(400).json({ error: 'Ingresá tu código de reserva.' });

  // Escapamos % y _ (comodines de ILIKE) para que alguien no pueda mandar
  // "%" y pescar la reserva ajena más reciente sin saber el código real.
  const codeSeguro = code.replace(/[%_]/g, '\\$&');

  const { data, error } = await supabaseAdmin
    .from('reservations')
    .select('code, court, reservation_date, start_time, end_time, turn, status, parrilla, cancelled_by')
    .ilike('code', codeSeguro)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return res.status(500).json({ error: error.message });
  if (!data) return res.status(404).json({ error: 'No encontramos ninguna reserva con ese código. Revisá que esté bien escrito.' });

  const vencioPorSistema = data.status === 'cancelada' && (data.cancelled_by || '').startsWith('sistema');
  res.json({
    code: data.code,
    cancha: NOMBRE_CANCHA[data.court] || data.court,
    fecha: data.reservation_date,
    inicio: data.start_time.slice(0, 5),
    fin: data.end_time.slice(0, 5),
    turno: data.turn,
    estado: data.status,
    parrilla: !!data.parrilla,
    vencioPorSistema,
  });
});


// POST /api/reservations/whatsapp-enviado  { code, clientPhone }
// La persona apretó "Enviar WhatsApp": el turno deja de ser una reserva "guardada"
// por unos minutos y queda firme, esperando el comprobante. Recién ahora se avisa
// por mail a los admins. Se exige el teléfono con el que se reservó (además del
// código, que es fácil de adivinar) para que nadie pueda firmar turnos ajenos.
router.post('/whatsapp-enviado', async (req, res) => {
  const code = String(req.body?.code || '').trim();
  const digitos = String(req.body?.clientPhone || '').replace(/\D/g, '');
  if (!code || digitos.length < 8) return res.status(400).json({ error: 'Faltan datos.' });

  // Un mismo código puede repetirse en distintos años: tomamos el más reciente.
  const { data: filas, error } = await supabaseAdmin
    .from('reservations')
    .select('*')
    .eq('code', code)
    .order('created_at', { ascending: false })
    .limit(1);
  if (error) return res.status(500).json({ error: error.message });

  const r = filas?.[0];
  if (!r || String(r.client_phone || '').replace(/\D/g, '') !== digitos) {
    return res.status(404).json({ error: 'No encontramos esa reserva.' });
  }

  // Ya se había liberado (pasaron los minutos): Mateo puede reactivarla desde el panel
  // si el turno sigue libre ("Este turno se había liberado por falta de comprobante").
  if (r.status === 'cancelada') return res.json({ ok: false, vencida: true });
  if (r.status === 'confirmada' || r.whatsapp_enviado_at) return res.json({ ok: true, yaEnviado: true });

  // Solo si sigue pendiente y sin marcar (evita carreras con el vencimiento automático).
  const { data: act, error: e2 } = await supabaseAdmin
    .from('reservations')
    .update({ whatsapp_enviado_at: new Date().toISOString() })
    .eq('id', r.id)
    .eq('status', 'pendiente')
    .is('whatsapp_enviado_at', null)
    .select()
    .maybeSingle();
  if (e2) return res.status(500).json({ error: e2.message });
  if (!act) return res.json({ ok: false, vencida: true }); // se liberó justo en este instante

  enviarAvisoNuevaReserva(act).catch((e) => console.error('[aviso reserva] error:', e.message));
  res.json({ ok: true });
});

router.post('/futbol', async (req, res) => {
  const body = req.body;
  if (!(await esFechaAbierta(body.date))) {
    return res.status(400).json({ error: 'Ese día no está habilitado para reservar.' });
  }
  const errorCliente = validarDatosCliente(body);
  if (errorCliente) return res.status(400).json({ error: errorCliente });
  if (!['C1', 'C2'].includes(body.court)) return res.status(400).json({ error: 'Cancha inválida.' });
  const turnoInfo = TURNOS_FUTBOL[body.turn];
  if (!turnoInfo) return res.status(400).json({ error: 'Turno inválido.' });
  if (demasiadoTarde(body.date, turnoInfo.start)) return res.status(409).json({ error: MENSAJE_ANTICIPACION });

  const { bloqueos } = await obtenerBloqueosDelDia(body.date);
  if (estaBloqueado(bloqueos, body.court, body.turn)) {
    return res.status(409).json({ error: 'Ese turno no está disponible.' });
  }

  const code = generarCodigoFutbol({ court: body.court, date: body.date, turn: body.turn });

  const { data, error } = await supabaseAdmin
    .from('reservations')
    .insert({
      code,
      court: body.court,
      reservation_date: body.date,
      start_time: turnoInfo.start,
      end_time: turnoInfo.end,
      turn: body.turn,
      client_name: String(body.clientName).trim(),
      client_phone: String(body.clientPhone).trim(),
      client_email: String(body.clientEmail || '').trim() || null,
      category: body.category || null,
      team_name: normalizarEquipo(body.teamName),
      looking_for_rival: !!body.lookingForRival,
      ...(body.parrilla ? { parrilla: true } : {}),
      status: 'pendiente',
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') return res.status(409).json({ error: 'Ese horario ya no está disponible. Elegí otro.' });
    return res.status(500).json({ error: error.message });
  }

  respuestaReserva(res, data);
});

router.post('/padel', async (req, res) => {
  const body = req.body;
  if (!(await esFechaAbierta(body.date))) {
    return res.status(400).json({ error: 'Ese día no está habilitado para reservar.' });
  }
  const errorCliente = validarDatosCliente(body);
  if (errorCliente) return res.status(400).json({ error: errorCliente });
  if (!body.startTime || !body.endTime) return res.status(400).json({ error: 'Faltan horarios.' });
  if (body.startTime < PADEL_APERTURA || body.endTime > PADEL_CIERRE || body.startTime >= body.endTime) {
    return res.status(400).json({ error: 'Horario fuera del rango permitido (20:00 a 23:30).' });
  }
  if (demasiadoTarde(body.date, body.startTime)) return res.status(409).json({ error: MENSAJE_ANTICIPACION });

  const { bloqueos } = await obtenerBloqueosDelDia(body.date);
  if (estaBloqueado(bloqueos, 'PAD')) {
    return res.status(409).json({ error: 'El pádel no está disponible ese día.' });
  }

  const { data: existentes, error: errorConsulta } = await supabaseAdmin
    .from('reservations')
    .select('start_time, end_time')
    .eq('reservation_date', body.date)
    .eq('court', 'PAD')
    .neq('status', 'cancelada');

  if (errorConsulta) return res.status(500).json({ error: errorConsulta.message });

  const seSolapa = existentes.some((r) => body.startTime < r.end_time && body.endTime > r.start_time);
  if (seSolapa) return res.status(409).json({ error: 'Ese rango se solapa con otra reserva.' });

  const code = generarCodigoPadel({ date: body.date, startTime: body.startTime, endTime: body.endTime });

  const { data, error } = await supabaseAdmin
    .from('reservations')
    .insert({
      code,
      court: 'PAD',
      reservation_date: body.date,
      start_time: body.startTime,
      end_time: body.endTime,
      turn: null,
      client_name: String(body.clientName).trim(),
      client_phone: String(body.clientPhone).trim(),
      client_email: String(body.clientEmail || '').trim() || null,
      category: null,
      team_name: null,
      looking_for_rival: false,
      ...(body.parrilla ? { parrilla: true } : {}),
      status: 'pendiente',
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') return res.status(409).json({ error: 'Ese horario ya no está disponible.' });
    return res.status(500).json({ error: error.message });
  }

  respuestaReserva(res, data);
});

export default router;
