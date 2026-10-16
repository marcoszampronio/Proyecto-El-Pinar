import { Router } from 'express';
import { supabaseAdmin } from '../lib/supabaseAdmin.js';
import {
  TURNOS_FUTBOL,
  PADEL_APERTURA,
  PADEL_CIERRE,
} from '../lib/codeGenerator.js';
import { obtenerBloqueosDelDia, estaBloqueado } from '../lib/bloqueos.js';
import { listarAperturasEspeciales } from '../lib/aperturasEspeciales.js';
import { demasiadoTarde, inicioMinimoPadel } from '../lib/anticipacion.js';

const router = Router();

// GET /api/availability/dias-especiales?desde=2026-10-01&hasta=2026-11-30
// Fechas (fuera de mar/mié/jue) que Mateo abrió puntualmente, para que el
// sitio sepa qué días marcar como habilitados en la tira de fechas.
router.get('/dias-especiales', async (req, res) => {
  const { desde, hasta } = req.query;
  try {
    const data = await listarAperturasEspeciales({ desde, hasta });
    res.json({ fechas: data.map((a) => a.reservation_date) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/availability/futbol?date=2026-08-30&court=C1
router.get('/futbol', async (req, res) => {
  const { date, court } = req.query;
  // ?sinAnticipacion=1 (agendar a mano en el panel): no aplica la regla de la hora. Solo cambia lo que se
  // muestra; el POST público igual la valida, así que no abre ninguna puerta.
  const aplicaAnticipacion = req.query.sinAnticipacion !== '1';
  if (!date || !court) {
    return res.status(400).json({ error: 'Faltan parametros: date y court son requeridos.' });
  }

  const [{ data, error }, { bloqueos }] = await Promise.all([
    supabaseAdmin
      .from('reservations')
      .select('turn, status')
      .eq('reservation_date', date)
      .eq('court', court)
      .neq('status', 'cancelada'),
    obtenerBloqueosDelDia(date),
  ]);

  if (error) return res.status(500).json({ error: error.message });

  const ocupados = Object.fromEntries(data.map((r) => [r.turn, r.status]));

  const turnos = Object.entries(TURNOS_FUTBOL).map(([turn, horario]) => ({
    turn,
    start: horario.start,
    end: horario.end,
    status:
      ocupados[turn] ||
      (estaBloqueado(bloqueos, court, turn) ? 'bloqueado' : aplicaAnticipacion && demasiadoTarde(date, horario.start) ? 'cerrado' : 'libre'),
  }));

  res.json({ court, date, turnos });
});

// GET /api/availability/padel?date=2026-08-30
router.get('/padel', async (req, res) => {
  const { date } = req.query;
  const aplicaAnticipacion = req.query.sinAnticipacion !== '1';
  if (!date) return res.status(400).json({ error: 'Falta el parametro date.' });

  const [{ data, error }, { bloqueos }] = await Promise.all([
    supabaseAdmin
      .from('reservations')
      .select('start_time, end_time, status')
      .eq('reservation_date', date)
      .eq('court', 'PAD')
      .neq('status', 'cancelada'),
    obtenerBloqueosDelDia(date),
  ]);

  if (error) return res.status(500).json({ error: error.message });

  // Si el complejo bloqueó el pádel ese día, se lo mostramos al frontend
  // como si estuviera ocupado de punta a punta (reusa el calculo de huecos).
  const ocupados = estaBloqueado(bloqueos, 'PAD')
    ? [{ start_time: PADEL_APERTURA, end_time: PADEL_CIERRE, status: 'bloqueado' }]
    : data;

  res.json({
    date,
    apertura: PADEL_APERTURA,
    cierre: PADEL_CIERRE,
    ocupados, // el frontend calcula los huecos libres visualmente
    inicioMinimo: aplicaAnticipacion ? inicioMinimoPadel(date) : null, // 'HH:MM' = antes de esa hora ya no se reserva (anticipación)
  });
});

export default router;
