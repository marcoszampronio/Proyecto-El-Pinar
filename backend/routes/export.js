import { Router } from 'express';
import { requireAdmin } from '../middleware/auth.js';
import { generarCsvReservas } from '../lib/csvReservas.js';
import { ejecutarBackupDiario } from '../lib/backupDiario.js';

const router = Router();
router.use(requireAdmin);

// GET /api/admin/export/csv?desde=YYYY-MM-DD&hasta=YYYY-MM-DD
// Descarga el historial de reservas como CSV (se abre en Excel).
router.get('/csv', async (req, res) => {
  const { desde, hasta } = req.query;
  try {
    const { csv } = await generarCsvReservas({ desde, hasta });
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="reservas-${desde || 'todo'}-a-${hasta || 'todo'}.csv"`);
    res.send(csv);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/admin/export/backup-ahora - dispara el backup diario a mano.
router.post('/backup-ahora', async (req, res) => {
  try {
    const r = await ejecutarBackupDiario({ forzar: true });
    res.json(r);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
