import { Router } from 'express';
import { supabaseAdmin } from '../lib/supabaseAdmin.js';
import { normalizarTelefonoAR } from '../lib/telefono.js';

const router = Router();

const NOMBRE_CANCHA = { C1: 'Cancha 1', C2: 'Cancha 2', PAD: 'Paddle' };

function ddmm(fechaISO) {
  const [, m, d] = fechaISO.split('-');
  return `${d}/${m}`;
}

function armarMensajeContacto(r) {
  const cancha = NOMBRE_CANCHA[r.court] || r.court;
  const hs = `${r.start_time.slice(0, 5)} a ${r.end_time.slice(0, 5)}`;
  return (
    `Hola! Vi en El Pinar que buscás rival el ${ddmm(r.reservation_date)} ` +
    `en ${cancha} de ${hs} hs. Tenemos equipo y queremos jugar. ¿Coordinamos?`
  );
}

// GET /api/rivals - lista publica de equipos que buscan rival (confirmados, futuros).
router.get('/', async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('public_rivals')
    .select('*')
    .order('reservation_date', { ascending: true })
    .order('start_time', { ascending: true });

  if (error) return res.status(500).json({ error: error.message });

  const rivales = data.map((r) => {
    const mensaje = armarMensajeContacto(r);
    const tel = normalizarTelefonoAR(r.contact_phone);
    return {
      ...r,
      canchaNombre: NOMBRE_CANCHA[r.court] || r.court,
      mensajeContacto: mensaje,
      linkWhatsapp: tel ? `https://wa.me/${tel}?text=${encodeURIComponent(mensaje)}` : null,
    };
  });

  res.json({ rivales });
});

export default router;
