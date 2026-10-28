import { Router } from 'express';
import { supabaseAdmin } from '../lib/supabaseAdmin.js';
import { hoyART } from '../lib/anticipacion.js';

const router = Router();

// POST /api/visitas { v, o } - la página pública avisa que alguien entró (una vez por sesión).
// Anónimo: no se guarda IP ni nada que identifique a la persona. Los bots no cuentan.
const ES_BOT = /bot|crawl|spider|slurp|lighthouse|headless|facebookexternalhit|curl|wget|python|axios|node-fetch/i;

router.post('/', async (req, res) => {
  const ua = String(req.headers['user-agent'] || '');
  if (ES_BOT.test(ua)) return res.json({ ok: true });

  const b = req.body || {};
  const visitante = typeof b.v === 'string' && /^[a-z0-9-]{8,60}$/i.test(b.v) ? b.v : null;
  const origen = String(b.o || 'directo').toLowerCase().replace(/[^a-z0-9._:-]/g, '').slice(0, 60) || 'directo';
  const dispositivo = /Mobile|Android|iPhone|iPad/i.test(ua) ? 'movil' : 'compu';

  const { error } = await supabaseAdmin.from('visitas').insert({ dia: hoyART(), visitante, origen, dispositivo });
  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});

export default router;
