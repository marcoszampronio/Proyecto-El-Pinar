import express from 'express';
import cors from 'cors';
import 'dotenv/config';

import availabilityRoutes from './routes/availability.js';
import reservationsRoutes from './routes/reservations.js';
import rivalsRoutes from './routes/rivals.js';
import adminRoutes from './routes/admin.js';
import exportRoutes from './routes/export.js';

const app = express();

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ ok: true, mensaje: 'API de Complejo El Potrero funcionando.' });
});

app.use('/api/availability', availabilityRoutes);
app.use('/api/reservations', reservationsRoutes);
app.use('/api/rivals', rivalsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/admin/export', exportRoutes);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
