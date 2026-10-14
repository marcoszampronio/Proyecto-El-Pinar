import { Router } from 'express';
import { sincronizarReservaConSheet } from '../lib/sheetsSync.js';
import 'dotenv/config';

const router = Router();

// POST /api/internal/sheets-sync
// Lo llama un Database Webhook de Supabase (INSERT/UPDATE en `reservations`)
// cada vez que una reserva se crea, confirma o cancela, sin importar qué
// parte del backend hizo el cambio (cliente, admin, o los procesos
// automáticos de turnos fijos / vencimiento de pendientes).
router.post('/sheets-sync', async (req, res) => {
  const secret = req.headers['x-webhook-secret'];
  if (!process.env.SUPABASE_WEBHOOK_SECRET || secret !== process.env.SUPABASE_WEBHOOK_SECRET) {
    return res.status(401).json({ error: 'No autorizado.' });
  }

  const record = req.body?.record;
  if (!record) return res.status(400).json({ error: 'Falta el registro.' });

  // No bloqueamos la respuesta a Supabase esperando a Google: si Sheets está
  // lento o caído, el webhook no debe acumularse ni reintentar de más.
  sincronizarReservaConSheet(record);
  res.json({ ok: true });
});

export default router;
