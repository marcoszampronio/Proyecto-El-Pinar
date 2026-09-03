import { Router } from 'express';
import { supabaseAdmin } from '../lib/supabaseAdmin.js';
import { esDiaHabilitado } from '../lib/codeGenerator.js';

const router = Router();

// POST /api/espera - un cliente pide que le avisen si se libera un turno de
// fútbol ese día (cualquier cancha).
router.post('/', async (req, res) => {
  const body = req.body || {};
  const date = String(body.date || '').trim();
  const clientName = String(body.clientName || '').trim();
  const clientPhone = String(body.clientPhone || '').trim();

  if (!date || !esDiaHabilitado(date)) {
    return res.status(400).json({ error: 'Elegí un día habilitado (martes, miércoles o jueves).' });
  }
  if (!clientName || clientPhone.replace(/\D/g, '').length < 8) {
    return res.status(400).json({ error: 'Completá tu nombre y tu WhatsApp.' });
  }

  const { error } = await supabaseAdmin
    .from('lista_espera')
    .insert({ reservation_date: date, court: 'cualquiera', client_name: clientName, client_phone: clientPhone });

  if (error) {
    // 23505 = ya está anotado para ese día/cancha. Lo tratamos como éxito.
    if (error.code === '23505') {
      return res.json({ ok: true, yaAnotado: true });
    }
    return res.status(500).json({ error: error.message });
  }

  res.json({ ok: true });
});

export default router;
