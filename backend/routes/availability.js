import { Router } from 'express';
import { supabaseAdmin } from '../lib/supabaseAdmin.js';
import {
  TURNOS_FUTBOL,
  PADEL_APERTURA,
  PADEL_CIERRE,
} from '../lib/codeGenerator.js';
import { obtenerBloqueosDelDia, estaBloqueado } from '../lib/bloqueos.js';

const router = Router();

// GET /api/availability/futbol?date=2026-08-30&court=C1
router.get('/futbol', async (req, res) => {
  const { date, court } = req.query;
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
    status: ocupados[turn] || (estaBloqueado(bloqueos, court, turn) ? 'bloqueado' : 'libre'),
  }));

  res.json({ court, date, turnos });
});

// GET /api/availability/padel?date=2026-08-30
router.get('/padel', async (req, res) => {
  const { date } = req.query;
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
  });
});

export default router;
