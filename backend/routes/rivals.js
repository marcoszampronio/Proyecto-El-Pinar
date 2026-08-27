import { Router } from 'express';
import { supabaseAdmin } from '../lib/supabaseAdmin.js';

const router = Router();

// GET /api/rivals - lista publica de equipos que buscan rival (turnos confirmados y futuros)
router.get('/', async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('public_rivals')
    .select('*')
    .order('reservation_date', { ascending: true });

  if (error) return res.status(500).json({ error: error.message });

  res.json({ rivales: data });
});

export default router;
