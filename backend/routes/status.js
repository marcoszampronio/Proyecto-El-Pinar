import { Router } from 'express';
import { supabaseAdmin } from '../lib/supabaseAdmin.js';
import { requireAdmin } from '../middleware/auth.js';
import { verificarEmail } from '../lib/mailer.js';
import { estadoBackup } from '../lib/backupDiario.js';

const router = Router();
const ARRANQUE = Date.now();

// GET /api/status - liviano, público. Sirve para el keep-alive y para UptimeRobot.
router.get('/', (req, res) => {
  res.json({
    ok: true,
    hora: new Date().toISOString(),
    uptimeSegundos: Math.round((Date.now() - ARRANQUE) / 1000),
  });
});

// GET /api/status/diagnostico - detalle para el panel (requiere admin).
router.get('/diagnostico', requireAdmin, async (req, res) => {
  const [smtp, db] = await Promise.all([
    verificarEmail(),
    supabaseAdmin
      .from('reservations')
      .select('id', { count: 'exact', head: true })
      .then(({ error }) => ({ ok: !error, error: error?.message || null })),
  ]);

  res.json({
    hora: new Date().toISOString(),
    uptimeSegundos: Math.round((Date.now() - ARRANQUE) / 1000),
    baseDatos: db,
    email: smtp,
    backup: estadoBackup(),
    ventanaPendientesMin: Number(process.env.PENDING_EXPIRE_MIN || 180),
    corsOrigenes: (process.env.CORS_ORIGINS || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
  });
});

export default router;
