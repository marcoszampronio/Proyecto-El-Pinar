import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import 'dotenv/config';

import availabilityRoutes from './routes/availability.js';
import reservationsRoutes from './routes/reservations.js';
import esperaRoutes from './routes/espera.js';
import rivalsRoutes from './routes/rivals.js';
import adminRoutes from './routes/admin.js';
import exportRoutes from './routes/export.js';
import statusRoutes from './routes/status.js';
import { expirarPendientesVencidas } from './lib/expirarPendientes.js';
import { iniciarBackupDiario } from './lib/backupDiario.js';

const app = express();

app.use(helmet());

// CORS: en produccion se restringe a los dominios propios via CORS_ORIGINS
// (separados por coma). Si la variable no esta, acepta cualquier origen (dev).
const origenesPermitidos = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
app.use(cors(origenesPermitidos.length ? { origin: origenesPermitidos } : {}));

app.use(express.json());

// Limita la CREACION de reservas (POST) para evitar que llenen la agenda con
// turnos falsos. Las consultas (GET, ej. "buscar mi reserva") no se limitan.
const limiteReservas = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 8,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiados intentos seguidos. Probá de nuevo en unos minutos.' },
});
app.use('/api/reservations', (req, res, next) =>
  req.method === 'GET' ? next() : limiteReservas(req, res, next)
);
app.use('/api/espera', (req, res, next) =>
  req.method === 'GET' ? next() : limiteReservas(req, res, next)
);

app.get('/', (req, res) => {
  res.json({ ok: true, mensaje: 'API de Complejo El Pinar funcionando.' });
});

app.use('/api/status', statusRoutes);
app.use('/api/availability', availabilityRoutes);
app.use('/api/reservations', reservationsRoutes);
app.use('/api/espera', esperaRoutes);
app.use('/api/rivals', rivalsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/admin/export', exportRoutes);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});

// Cada 15 min pasa a "cancelada" las reservas que quedaron "pendiente" sin
// comprobante por mas de 60 min, para que el horario vuelva a estar libre.
expirarPendientesVencidas();
setInterval(expirarPendientesVencidas, 15 * 60 * 1000);

// Backup diario: manda el CSV de todas las reservas por email a los admins (3:00 ART).
iniciarBackupDiario();
