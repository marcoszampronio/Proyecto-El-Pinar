import { Router } from 'express';
import { supabaseAdmin } from '../lib/supabaseAdmin.js';
import {
  TURNOS_FUTBOL,
  PADEL_APERTURA,
  PADEL_CIERRE,
  generarCodigoFutbol,
  generarCodigoPadel,
} from '../lib/codeGenerator.js';
import 'dotenv/config';

const router = Router();

function validarDatosCliente(body) {
  if (!body.clientName || !body.clientPhone) {
    return 'Faltan datos del cliente (nombre y telefono son obligatorios).';
  }
  if (body.lookingForRival && !body.category) {
    return 'Si buscas rival, tenes que indicar la categoria del equipo.';
  }
  return null;
}

// POST /api/reservations/futbol
// body: { court: 'C1'|'C2', date, turn: 'T1'|'T2'|'T3', clientName, clientPhone, clientEmail, category, lookingForRival }
router.post('/futbol', async (req, res) => {
  const body = req.body;
  const errorCliente = validarDatosCliente(body);
  if (errorCliente) return res.status(400).json({ error: errorCliente });

  if (!['C1', 'C2'].includes(body.court)) {
    return res.status(400).json({ error: 'Cancha invalida.' });
  }
  const turnoInfo = TURNOS_FUTBOL[body.turn];
  if (!turnoInfo) {
    return res.status(400).json({ error: 'Turno invalido.' });
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
      client_name: body.clientName,
      client_phone: body.clientPhone,
      client_email: body.clientEmail || null,
      category: body.category || null,
      looking_for_rival: !!body.lookingForRival,
      status: 'pendiente',
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Ese horario ya no esta disponible. Elegi otro.' });
    }
    return res.status(500).json({ error: error.message });
  }

  res.json({ reserva: data, mensajeWhatsapp: armarMensajeWhatsapp(data), numeroWhatsapp: process.env.WHATSAPP_NUMERO, aliasTransferencia: process.env.ALIAS_TRANSFERENCIA });
});

// POST /api/reservations/padel
// body: { date, startTime, endTime, clientName, clientPhone, clientEmail, category, lookingForRival }
router.post('/padel', async (req, res) => {
  const body = req.body;
  const errorCliente = validarDatosCliente(body);
  if (errorCliente) return res.status(400).json({ error: errorCliente });

  if (!body.startTime || !body.endTime) {
    return res.status(400).json({ error: 'Faltan horarios de inicio y fin.' });
  }
  if (body.startTime < PADEL_APERTURA || body.endTime > PADEL_CIERRE || body.startTime >= body.endTime) {
    return res.status(400).json({ error: 'El horario elegido esta fuera del rango permitido (20:00 a 23:30).' });
  }

  // Chequeo de solapamiento con otras reservas activas de padel ese dia
  const { data: existentes, error: errorConsulta } = await supabaseAdmin
    .from('reservations')
    .select('start_time, end_time')
    .eq('reservation_date', body.date)
    .eq('court', 'PAD')
    .neq('status', 'cancelada');

  if (errorConsulta) return res.status(500).json({ error: errorConsulta.message });

  const seSolapa = existentes.some(
    (r) => body.startTime < r.end_time && body.endTime > r.start_time
  );
  if (seSolapa) {
    return res.status(409).json({ error: 'Ese rango se solapa con otra reserva. Elegi otro horario.' });
  }

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
      client_name: body.clientName,
      client_phone: body.clientPhone,
      client_email: body.clientEmail || null,
      category: body.category || null,
      looking_for_rival: !!body.lookingForRival,
      status: 'pendiente',
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Ese horario ya no esta disponible. Elegi otro.' });
    }
    return res.status(500).json({ error: error.message });
  }

  res.json({ reserva: data, mensajeWhatsapp: armarMensajeWhatsapp(data), numeroWhatsapp: process.env.WHATSAPP_NUMERO, aliasTransferencia: process.env.ALIAS_TRANSFERENCIA });
});

function armarMensajeWhatsapp(reserva) {
  const cancha = reserva.court === 'PAD' ? 'Padel' : `Cancha ${reserva.court.slice(1)}`;
  return (
    `Hola! Quiero confirmar mi reserva.\n` +
    `${cancha} - ${reserva.reservation_date} de ${reserva.start_time.slice(0, 5)} a ${reserva.end_time.slice(0, 5)}\n` +
    `Codigo: ${reserva.code}\n` +
    `Adjunto el comprobante de la transferencia.`
  );
}

export default router;
