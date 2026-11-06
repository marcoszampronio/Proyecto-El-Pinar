import { Router } from 'express';
import { supabaseAdmin } from '../lib/supabaseAdmin.js';
import { normalizarTelefonoAR } from '../lib/telefono.js';
import { hoyART } from '../lib/anticipacion.js';

const router = Router();

const NOMBRE_CANCHA = { C1: 'Cancha 1', C2: 'Cancha 2', PAD: 'Pádel' };

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

// POST /api/rivals/toque { f, h, c, v } - alguien tocó "Me interesa" / "Escribiles por WhatsApp" para escribirle a un equipo
// que busca rival. Solo se cuenta el toque (no sabemos si después mandó el mensaje). Anónimo: sin IP ni datos personales.
// Llega como texto simple (sendBeacon) o como JSON. Siempre responde ok: contar nunca debe molestar a quien navega.
const ES_BOT = /bot|crawl|spider|slurp|lighthouse|headless|facebookexternalhit|curl|wget|python|axios|node-fetch/i;
router.post('/toque', async (req, res) => {
  try {
    if (ES_BOT.test(String(req.headers['user-agent'] || ''))) return res.json({ ok: true });

    let b = req.body;
    if (typeof b === 'string') { try { b = JSON.parse(b); } catch { b = {}; } }
    b = b || {};
    const fecha = /^\d{4}-\d{2}-\d{2}$/.test(String(b.f)) ? String(b.f) : null;
    const hora = /^\d{2}:\d{2}(:\d{2})?$/.test(String(b.h)) ? `${String(b.h).slice(0, 5)}:00` : null;
    const cancha = ['C1', 'C2', 'PAD'].includes(b.c) ? b.c : null;
    if (!fecha || !hora || !cancha) return res.json({ ok: true });
    const visitante = typeof b.v === 'string' && /^[a-z0-9-]{8,60}$/i.test(b.v) ? b.v : null;

    // solo cuenta si ese turno realmente está en la lista pública de equipos que buscan rival
    const { data: rival } = await supabaseAdmin
      .from('public_rivals')
      .select('team_name')
      .eq('reservation_date', fecha).eq('start_time', hora).eq('court', cancha)
      .limit(1).maybeSingle();
    if (!rival) return res.json({ ok: true });

    // la misma persona tocando lo mismo varias veces seguidas (o desde la tarjeta y desde la ventana) cuenta una sola vez
    if (visitante) {
      const hace10min = new Date(Date.now() - 10 * 60000).toISOString();
      const { data: ya } = await supabaseAdmin
        .from('rival_toques')
        .select('id')
        .eq('visitante', visitante).eq('reservation_date', fecha).eq('start_time', hora).eq('court', cancha)
        .gte('created_at', hace10min)
        .limit(1).maybeSingle();
      if (ya) return res.json({ ok: true });
    }

    const ua = String(req.headers['user-agent'] || '');
    const { error } = await supabaseAdmin.from('rival_toques').insert({
      dia: hoyART(),
      reservation_date: fecha,
      start_time: hora,
      court: cancha,
      equipo: rival.team_name || null,
      visitante,
      dispositivo: /Mobile|Android|iPhone|iPad/i.test(ua) ? 'movil' : 'compu',
    });
    if (error) console.error('[rival toque] no se pudo anotar:', error.message);
  } catch (e) {
    console.error('[rival toque] error:', e.message);
  }
  res.json({ ok: true });
});

export default router;
