import { Router } from 'express';
import { supabaseAdmin } from '../lib/supabaseAdmin.js';
import {
  TURNOS_FUTBOL,
  PADEL_APERTURA,
  PADEL_CIERRE,
  generarCodigoFutbol,
  generarCodigoPadel,
  esDiaHabilitado,
} from '../lib/codeGenerator.js';
import 'dotenv/config';

const router = Router();

function validarDatosCliente(body) {
  if (!body.clientName || !body.clientPhone) return 'Completá tu nombre y teléfono.';
  if (!body.clientEmail) return 'Completá tu email para recibir la confirmación.';
  if (body.lookingForRival) {
    if (!body.teamName) return 'Completá el nombre de tu equipo.';
    if (!body.category) return 'Elegí la categoría del equipo.';
  }
  return null;
}

function armarMensajeWhatsapp(reserva) {
  const cancha = reserva.court === 'PAD' ? 'Paddle' : `Cancha ${reserva.court.slice(1)}`;
  return (
    `Hola! Quiero confirmar mi reserva en El Pinar.\n\n` +
    `▶ CÓDIGO: ${reserva.code} ◀\n\n` +
    `Cancha: ${cancha}\n` +
    `Fecha: ${reserva.reservation_date}\n` +
    `Horario: ${reserva.start_time.slice(0,5)} a ${reserva.end_time.slice(0,5)} hs\n` +
    `Nombre: ${reserva.client_name}\n\n` +
    `Adjunto el comprobante de pago.`
  );
}


router.post('/futbol', async (req, res) => {
  const body = req.body;
  if (!esDiaHabilitado(body.date)) {
    return res.status(400).json({ error: 'Solo se puede reservar los martes, miércoles y jueves.' });
  }
  const errorCliente = validarDatosCliente(body);
  if (errorCliente) return res.status(400).json({ error: errorCliente });
  if (!['C1', 'C2'].includes(body.court)) return res.status(400).json({ error: 'Cancha inválida.' });
  const turnoInfo = TURNOS_FUTBOL[body.turn];
  if (!turnoInfo) return res.status(400).json({ error: 'Turno inválido.' });

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
      client_email: body.clientEmail,
      category: body.category || null,
      team_name: body.teamName || null,
      looking_for_rival: !!body.lookingForRival,
      status: 'pendiente',
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') return res.status(409).json({ error: 'Ese horario ya no está disponible. Elegí otro.' });
    return res.status(500).json({ error: error.message });
  }

  res.json({
    reserva: data,
    mensajeWhatsapp: armarMensajeWhatsapp(data),
    numeroWhatsapp: process.env.WHATSAPP_NUMERO,
    aliasTransferencia: process.env.ALIAS_TRANSFERENCIA,
  });
});

router.post('/padel', async (req, res) => {
  const body = req.body;
  if (!esDiaHabilitado(body.date)) {
    return res.status(400).json({ error: 'Solo se puede reservar los martes, miércoles y jueves.' });
  }
  const errorCliente = validarDatosCliente(body);
  if (errorCliente) return res.status(400).json({ error: errorCliente });
  if (!body.startTime || !body.endTime) return res.status(400).json({ error: 'Faltan horarios.' });
  if (body.startTime < PADEL_APERTURA || body.endTime > PADEL_CIERRE || body.startTime >= body.endTime) {
    return res.status(400).json({ error: 'Horario fuera del rango permitido (20:00 a 23:30).' });
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
      client_name: body.clientName,
      client_phone: body.clientPhone,
      client_email: body.clientEmail,
      category: body.category || null,
      team_name: body.teamName || null,
      looking_for_rival: !!body.lookingForRival,
      status: 'pendiente',
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') return res.status(409).json({ error: 'Ese horario ya no está disponible.' });
    return res.status(500).json({ error: error.message });
  }

  res.json({
    reserva: data,
    mensajeWhatsapp: armarMensajeWhatsapp(data),
    numeroWhatsapp: process.env.WHATSAPP_NUMERO,
    aliasTransferencia: process.env.ALIAS_TRANSFERENCIA,
  });
});

export default router;