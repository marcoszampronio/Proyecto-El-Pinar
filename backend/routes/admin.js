import { Router } from 'express';
import { supabaseAdmin } from '../lib/supabaseAdmin.js';
import { requireAdmin } from '../middleware/auth.js';
import { enviarEmailConfirmacion, enviarEmailCancelacion } from '../lib/mailer.js';

const router = Router();

// Todas las rutas de este archivo requieren estar logueado como admin
router.use(requireAdmin);

// GET /api/admin/search/:code
// Busca una reserva por codigo y le dice al frontend que accion corresponde
router.get('/search/:code', async (req, res) => {
  const code = req.params.code.trim().toUpperCase();

  const { data, error } = await supabaseAdmin
    .from('reservations')
    .select('*')
    .eq('code', code)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return res.status(500).json({ error: error.message });
  if (!data) return res.status(404).json({ error: 'No se encontro ninguna reserva con ese codigo.' });

  let accionSugerida = 'ninguna';
  if (data.status === 'pendiente') accionSugerida = 'confirmar';
  if (data.status === 'confirmada') accionSugerida = 'cancelar';

  res.json({ reserva: data, accionSugerida });
});

// POST /api/admin/confirm/:code
router.post('/confirm/:code', async (req, res) => {
  const code = req.params.code.trim().toUpperCase();

  const { data: reserva, error: errorBusqueda } = await supabaseAdmin
    .from('reservations')
    .select('*')
    .eq('code', code)
    .eq('status', 'pendiente')
    .maybeSingle();

  if (errorBusqueda) return res.status(500).json({ error: errorBusqueda.message });
  if (!reserva) return res.status(404).json({ error: 'No hay una reserva pendiente con ese codigo.' });

  const { data: actualizada, error } = await supabaseAdmin
    .from('reservations')
    .update({ status: 'confirmada', confirmed_at: new Date().toISOString(), confirmed_by: req.adminEmail })
    .eq('id', reserva.id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });

  enviarEmailConfirmacion(actualizada).catch((e) => console.error('Error enviando email:', e));

  res.json({ reserva: actualizada, mensaje: 'Reserva confirmada. Email enviado al cliente.' });
});

// POST /api/admin/cancel/:code
router.post('/cancel/:code', async (req, res) => {
  const code = req.params.code.trim().toUpperCase();

  const { data: reserva, error: errorBusqueda } = await supabaseAdmin
    .from('reservations')
    .select('*')
    .eq('code', code)
    .neq('status', 'cancelada')
    .maybeSingle();

  if (errorBusqueda) return res.status(500).json({ error: errorBusqueda.message });
  if (!reserva) return res.status(404).json({ error: 'No hay una reserva activa con ese codigo.' });

  const { data: actualizada, error } = await supabaseAdmin
    .from('reservations')
    .update({ status: 'cancelada', cancelled_at: new Date().toISOString(), cancelled_by: req.adminEmail })
    .eq('id', reserva.id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });

  enviarEmailCancelacion(actualizada).catch((e) => console.error('Error enviando email:', e));

  res.json({ reserva: actualizada, mensaje: 'Reserva cancelada. Email enviado al cliente.' });
});

// GET /api/admin/pending - lista de reservas pendientes (para el listado rapido del panel)
router.get('/pending', async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('reservations')
    .select('*')
    .eq('status', 'pendiente')
    .order('reservation_date', { ascending: true });

  if (error) return res.status(500).json({ error: error.message });
  res.json({ pendientes: data });
});

// GET /api/admin/stats?dias=7
router.get('/stats', async (req, res) => {
  const dias = Number(req.query.dias || 7);
  const desde = new Date();
  const hasta = new Date();
  hasta.setDate(hasta.getDate() + dias);

  const { data, error } = await supabaseAdmin
    .from('reservations')
    .select('court, status, reservation_date')
    .gte('reservation_date', desde.toISOString().slice(0, 10))
    .lte('reservation_date', hasta.toISOString().slice(0, 10));

  if (error) return res.status(500).json({ error: error.message });

  const confirmadas = data.filter((r) => r.status === 'confirmada');
  const porCancha = { C1: 0, C2: 0, PAD: 0 };
  confirmadas.forEach((r) => { porCancha[r.court] = (porCancha[r.court] || 0) + 1; });

  res.json({
    rangoDias: dias,
    totalConfirmadas: confirmadas.length,
    totalPendientes: data.filter((r) => r.status === 'pendiente').length,
    reservasPorCancha: porCancha,
  });
});

export default router;
