import { Router } from 'express';
import { supabaseAdmin } from '../lib/supabaseAdmin.js';
import { requireAdmin } from '../middleware/auth.js';

const router = Router();
router.use(requireAdmin);

// GET /api/admin/export/csv?desde=YYYY-MM-DD&hasta=YYYY-MM-DD
// Devuelve un archivo CSV descargable con el historial de reservas
router.get('/csv', async (req, res) => {
  const { desde, hasta } = req.query;

  let query = supabaseAdmin
    .from('reservations')
    .select('code, court, reservation_date, start_time, end_time, turn, client_name, client_phone, client_email, category, status, looking_for_rival, confirmed_at, confirmed_by, cancelled_at, cancelled_by, created_at')
    .order('reservation_date', { ascending: false });

  if (desde) query = query.gte('reservation_date', desde);
  if (hasta) query = query.lte('reservation_date', hasta);

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });

  const NOMBRE_CANCHA = { C1: 'Cancha 1', C2: 'Cancha 2', PAD: 'Padel' };
  const NOMBRE_ESTADO = { pendiente: 'Pendiente', confirmada: 'Confirmada', cancelada: 'Cancelada' };

  const cabecera = [
    'Codigo', 'Cancha', 'Fecha', 'Inicio', 'Fin', 'Turno',
    'Cliente', 'Telefono', 'Email', 'Categoria', 'Estado',
    'Buscando Rival', 'Confirmado En', 'Confirmado Por',
    'Cancelado En', 'Cancelado Por', 'Creado En',
  ].join(',');

  const filas = data.map((r) => [
    r.code,
    NOMBRE_CANCHA[r.court] || r.court,
    r.reservation_date,
    r.start_time?.slice(0, 5),
    r.end_time?.slice(0, 5),
    r.turn || 'flexible',
    `"${r.client_name}"`,
    r.client_phone,
    r.client_email || '',
    `"${r.category || ''}"`,
    NOMBRE_ESTADO[r.status] || r.status,
    r.looking_for_rival ? 'Si' : 'No',
    r.confirmed_at ? new Date(r.confirmed_at).toLocaleString('es-AR') : '',
    r.confirmed_by || '',
    r.cancelled_at ? new Date(r.cancelled_at).toLocaleString('es-AR') : '',
    r.cancelled_by || '',
    new Date(r.created_at).toLocaleString('es-AR'),
  ].join(','));

  const csv = [cabecera, ...filas].join('\n');

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="reservas-${desde || 'todo'}-a-${hasta || 'todo'}.csv"`);
  res.send('\uFEFF' + csv); // BOM para que Excel lo abra bien con tildes
});

// GET /api/admin/export/backup-gdrive
// Genera el CSV del día y lo devuelve listo para que el frontend
// lo descargue o lo suba a Google Drive via script externo.
// (La integración real con Google Drive API requiere credenciales OAuth
//  que se configuran aparte — ver NOTAS.md)
router.get('/backup-gdrive', async (req, res) => {
  const hoy = new Date().toISOString().slice(0, 10);

  const { data, error } = await supabaseAdmin
    .from('reservations')
    .select('*')
    .order('reservation_date', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });

  // Devuelve JSON para que un cron externo (ej: GitHub Actions)
  // lo tome y lo suba a Google Drive
  res.json({
    generadoEn: hoy,
    totalReservas: data.length,
    datos: data,
  });
});

export default router;
