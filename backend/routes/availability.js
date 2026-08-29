import { Router } from 'express';
import { supabaseAdmin } from '../lib/supabaseAdmin.js';
import {
  TURNOS_FUTBOL,
  PADEL_APERTURA,
  PADEL_CIERRE,
  CAPACIDAD_PARRILLA,
} from '../lib/codeGenerator.js';
import { contarParrillas } from '../lib/parrilla.js';

const router = Router();

// GET /api/availability/futbol?date=2026-08-30&court=C1
router.get('/futbol', async (req, res) => {
  const { date, court } = req.query;
  if (!date || !court) {
    return res.status(400).json({ error: 'Faltan parametros: date y court son requeridos.' });
  }

  const { data, error } = await supabaseAdmin
    .from('reservations')
    .select('turn, status')
    .eq('reservation_date', date)
    .eq('court', court)
    .neq('status', 'cancelada');

  if (error) return res.status(500).json({ error: error.message });

  const ocupados = Object.fromEntries(data.map((r) => [r.turn, r.status]));

  const turnos = Object.entries(TURNOS_FUTBOL).map(([turn, horario]) => ({
    turn,
    start: horario.start,
    end: horario.end,
    status: ocupados[turn] || 'libre',
  }));

  res.json({ court, date, turnos });
});

// GET /api/availability/padel?date=2026-08-30
router.get('/padel', async (req, res) => {
  const { date } = req.query;
  if (!date) return res.status(400).json({ error: 'Falta el parametro date.' });

  const { data, error } = await supabaseAdmin
    .from('reservations')
    .select('start_time, end_time, status')
    .eq('reservation_date', date)
    .eq('court', 'PAD')
    .neq('status', 'cancelada');

  if (error) return res.status(500).json({ error: error.message });

  res.json({
    date,
    apertura: PADEL_APERTURA,
    cierre: PADEL_CIERRE,
    ocupados: data, // el frontend calcula los huecos libres visualmente
  });
});

// GET /api/availability/parrilla?date=2026-08-30
// Cuántas de las 2 parrillas quedan para esa fecha.
router.get('/parrilla', async (req, res) => {
  const { date } = req.query;
  if (!date) return res.status(400).json({ error: 'Falta el parametro date.' });

  const { count, error, columnaFalta } = await contarParrillas(date);
  if (error) return res.status(500).json({ error: error.message });

  res.json({
    date,
    capacidad: CAPACIDAD_PARRILLA,
    ocupadas: count,
    disponibles: columnaFalta ? 0 : Math.max(0, CAPACIDAD_PARRILLA - count),
    habilitada: !columnaFalta,
  });
});

export default router;
