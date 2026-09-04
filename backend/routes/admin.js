import { Router } from 'express';
import { supabaseAdmin } from '../lib/supabaseAdmin.js';
import { requireAdmin } from '../middleware/auth.js';
import { enviarEmailConfirmacion, enviarEmailCancelacion } from '../lib/mailer.js';
import {
  TURNOS_FUTBOL,
  PADEL_APERTURA,
  PADEL_CIERRE,
  esDiaHabilitado,
  generarCodigoFutbol,
  generarCodigoPadel,
} from '../lib/codeGenerator.js';
import { obtenerBloqueosDelDia, estaBloqueado } from '../lib/bloqueos.js';
import { normalizarTelefonoAR } from '../lib/telefono.js';

const router = Router();

// Todas las rutas de este archivo requieren estar logueado como admin
router.use(requireAdmin);

const NOMBRE_CANCHA_WA = { C1: 'Cancha 1', C2: 'Cancha 2', PAD: 'Paddle' };

function armarMensajeSuspension(reserva) {
  const cancha = NOMBRE_CANCHA_WA[reserva.court] || reserva.court;
  const horario = `${reserva.start_time.slice(0, 5)} a ${reserva.end_time.slice(0, 5)} hs`;
  return (
    `Hola ${reserva.client_name}! Te escribimos del Complejo El Pinar.\n\n` +
    `Por lluvia, SE SUSPENDE el turno del ${reserva.reservation_date} ` +
    `(${cancha}, ${horario}).\n\n` +
    `Tu reserva ${reserva.code} queda cancelada. Escribinos por aca para reprogramar. ` +
    `Disculpa las molestias.`
  );
}

function armarMensajeCancelacionTurno(reserva) {
  const cancha = NOMBRE_CANCHA_WA[reserva.court] || reserva.court;
  const horario = `${reserva.start_time.slice(0, 5)} a ${reserva.end_time.slice(0, 5)} hs`;
  return (
    `Hola ${reserva.client_name}! Te escribimos del Complejo El Pinar.\n\n` +
    `Tu turno ${reserva.code} del ${reserva.reservation_date} ` +
    `(${cancha}, ${horario}) queda CANCELADO.\n\n` +
    `Cualquier duda o para reprogramar, escribinos por aca.`
  );
}

// Datos de una reserva para mostrar en la agenda del panel (con link de WhatsApp
// de cancelacion ya armado).
function resumenAgenda(r) {
  if (!r) return null;
  const mensaje = armarMensajeCancelacionTurno(r);
  const tel = normalizarTelefonoAR(r.client_phone);
  return {
    id: r.id,
    code: r.code,
    court: r.court,
    start_time: r.start_time,
    end_time: r.end_time,
    turn: r.turn,
    status: r.status,
    client_name: r.client_name,
    client_phone: r.client_phone,
    client_email: r.client_email,
    looking_for_rival: r.looking_for_rival,
    team_name: r.team_name,
    category: r.category,
    parrilla: r.parrilla,
    mensajeCancelacion: mensaje,
    linkWhatsappCancelacion: tel ? `https://wa.me/${tel}?text=${encodeURIComponent(mensaje)}` : null,
  };
}

function fechaDDMM(iso) {
  const [, m, d] = String(iso).split('-');
  return d && m ? `${d}/${m}` : iso;
}

function armarMensajeEspera(e) {
  return (
    `Hola ${e.client_name}! Te escribimos del Complejo El Pinar.\n\n` +
    `Se liberó un turno de fútbol para el ${fechaDDMM(e.reservation_date)}. ` +
    `Si lo querés, respondé este mensaje y te lo reservamos.`
  );
}

function resumenEspera(e) {
  const tel = normalizarTelefonoAR(e.client_phone);
  const mensaje = armarMensajeEspera(e);
  return {
    id: e.id,
    client_name: e.client_name,
    client_phone: e.client_phone,
    created_at: e.created_at,
    mensaje,
    linkWhatsapp: tel ? `https://wa.me/${tel}?text=${encodeURIComponent(mensaje)}` : null,
  };
}

// GET /api/admin/agenda/:date - vista de calendario del dia: grilla de futbol
// (C1/C2 x T1/T2/T3, libre u ocupado) + lista de padel + parrillas usadas.
router.get('/agenda/:date', async (req, res) => {
  const date = req.params.date;

  const [{ data, error }, esperaRes, { bloqueos }] = await Promise.all([
    supabaseAdmin
      .from('reservations')
      .select('*')
      .eq('reservation_date', date)
      .neq('status', 'cancelada')
      .order('start_time', { ascending: true }),
    supabaseAdmin
      .from('lista_espera')
      .select('*')
      .eq('reservation_date', date)
      .eq('status', 'activa')
      .order('created_at', { ascending: true }),
    obtenerBloqueosDelDia(date),
  ]);

  if (error) return res.status(500).json({ error: error.message });

  const futbol = {};
  for (const court of ['C1', 'C2']) {
    futbol[court] = Object.entries(TURNOS_FUTBOL).map(([turn, h]) => {
      const r = data.find((x) => x.court === court && x.turn === turn);
      return {
        turn,
        start: h.start,
        end: h.end,
        label: h.label,
        status: r ? r.status : (estaBloqueado(bloqueos, court, turn) ? 'bloqueado' : 'libre'),
        reserva: resumenAgenda(r),
      };
    });
  }

  const padel = data.filter((x) => x.court === 'PAD').map(resumenAgenda);
  const conParrilla = data.filter((x) => x.parrilla).map(resumenAgenda);

  const espera = (esperaRes.data || []).map(resumenEspera);

  res.json({
    date,
    futbol,
    padel,
    parrilla: { pidieron: conParrilla.length, reservas: conParrilla },
    espera,
    bloqueos,
  });
});

// POST /api/admin/espera/:id/:accion - accion = 'avisado' | 'descartar'
router.post('/espera/:id/:accion', async (req, res) => {
  const { id, accion } = req.params;
  const nuevoEstado = accion === 'avisado' ? 'avisado' : accion === 'descartar' ? 'descartado' : null;
  if (!nuevoEstado) return res.status(400).json({ error: 'Acción inválida.' });

  const { error } = await supabaseAdmin
    .from('lista_espera')
    .update({ status: nuevoEstado, notified_at: new Date().toISOString(), notified_by: req.adminEmail })
    .eq('id', id);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true, status: nuevoEstado });
});

// GET /api/admin/dia/:date - reservas activas de un dia (para la vista previa
// de "suspender por lluvia": Mateo ve a quien va a afectar antes de confirmar)
router.get('/dia/:date', async (req, res) => {
  const date = req.params.date;
  const { data, error } = await supabaseAdmin
    .from('reservations')
    .select('*')
    .eq('reservation_date', date)
    .in('status', ['pendiente', 'confirmada'])
    .order('start_time', { ascending: true });

  if (error) return res.status(500).json({ error: error.message });
  res.json({ date, reservas: data });
});

// POST /api/admin/suspender/:date - cancela todas las reservas activas de ese dia
// y devuelve, por cada cliente, el link de WhatsApp con el mensaje de suspension listo.
router.post('/suspender/:date', async (req, res) => {
  const date = req.params.date;

  const { data: afectadas, error: errorBusqueda } = await supabaseAdmin
    .from('reservations')
    .select('*')
    .eq('reservation_date', date)
    .in('status', ['pendiente', 'confirmada'])
    .order('start_time', { ascending: true });

  if (errorBusqueda) return res.status(500).json({ error: errorBusqueda.message });
  if (!afectadas.length) {
    return res.json({ date, canceladas: 0, clientes: [] });
  }

  const ids = afectadas.map((r) => r.id);
  const { error: errorUpdate } = await supabaseAdmin
    .from('reservations')
    .update({
      status: 'cancelada',
      cancelled_at: new Date().toISOString(),
      cancelled_by: req.adminEmail,
    })
    .in('id', ids);

  if (errorUpdate) return res.status(500).json({ error: errorUpdate.message });

  const clientes = afectadas.map((r) => {
    const mensaje = armarMensajeSuspension(r);
    const telefono = normalizarTelefonoAR(r.client_phone);
    return {
      code: r.code,
      nombre: r.client_name,
      telefonoOriginal: r.client_phone,
      telefono,
      court: r.court,
      start_time: r.start_time,
      end_time: r.end_time,
      mensaje,
      linkWhatsapp: telefono
        ? `https://wa.me/${telefono}?text=${encodeURIComponent(mensaje)}`
        : null,
    };
  });

  res.json({ date, canceladas: afectadas.length, clientes });
});

// GET /api/admin/search/:code
// Busca una reserva por codigo y le dice al frontend que accion corresponde
router.get('/search/:code', async (req, res) => {
  const code = req.params.code.trim();

  const { data, error } = await supabaseAdmin
    .from('reservations')
    .select('*')
    .ilike('code', code)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return res.status(500).json({ error: error.message });
  if (!data) return res.status(404).json({ error: 'No se encontro ninguna reserva con ese codigo.' });

  const vencioPorSistema = data.status === 'cancelada' && (data.cancelled_by || '').startsWith('sistema');

  let accionSugerida = 'ninguna';
  if (data.status === 'pendiente' || vencioPorSistema) accionSugerida = 'confirmar';
  if (data.status === 'confirmada') accionSugerida = 'cancelar';

  res.json({ reserva: data, accionSugerida, vencioPorSistema });
});

// POST /api/admin/confirm/:code
router.post('/confirm/:code', async (req, res) => {
  const code = req.params.code.trim();

  const { data: reserva, error: errorBusqueda } = await supabaseAdmin
    .from('reservations')
    .select('*')
    .ilike('code', code)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (errorBusqueda) return res.status(500).json({ error: errorBusqueda.message });
  if (!reserva) return res.status(404).json({ error: 'No se encontró ninguna reserva con ese código.' });

  if (reserva.status === 'confirmada') {
    return res.status(409).json({ error: 'Esta reserva ya estaba confirmada.' });
  }

  if (reserva.status === 'cancelada') {
    const vencioPorSistema = (reserva.cancelled_by || '').startsWith('sistema');
    if (!vencioPorSistema) {
      return res.status(409).json({ error: 'Esta reserva fue cancelada. El cliente tiene que reservar de nuevo.' });
    }
    // El turno se liberó por falta de comprobante. Se puede reactivar solo si
    // nadie más lo tomó mientras tanto.
    const { data: choque } = await supabaseAdmin
      .from('reservations')
      .select('id')
      .eq('reservation_date', reserva.reservation_date)
      .eq('court', reserva.court)
      .eq('start_time', reserva.start_time)
      .neq('status', 'cancelada')
      .maybeSingle();
    if (choque) {
      return res.status(409).json({ error: 'Ese turno ya lo tomó otra persona. El cliente tiene que elegir otro horario.' });
    }
  }

  const { data: actualizada, error } = await supabaseAdmin
    .from('reservations')
    .update({
      status: 'confirmada',
      confirmed_at: new Date().toISOString(),
      confirmed_by: req.adminEmail,
      cancelled_at: null,
      cancelled_by: null,
    })
    .eq('id', reserva.id)
    .select()
    .single();

  if (error) {
    if (error.code === '23505' || error.code === '23P01') {
      return res.status(409).json({ error: 'Ese turno ya no está libre. El cliente tiene que elegir otro horario.' });
    }
    return res.status(500).json({ error: error.message });
  }

  enviarEmailConfirmacion(actualizada).catch((e) => console.error('Error enviando email:', e));

  res.json({ reserva: actualizada, mensaje: 'Reserva confirmada. Email enviado al cliente.' });
});

// POST /api/admin/cancel/:code
router.post('/cancel/:code', async (req, res) => {
  const code = req.params.code.trim();

  const { data: reserva, error: errorBusqueda } = await supabaseAdmin
    .from('reservations')
    .select('*')
    .ilike('code', code)
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

// POST /api/admin/manual - Mateo agenda un turno el mismo, ya confirmado
// (para clientes que le escriben directo por WhatsApp). Puede marcarlo
// "busca rival" para que salga en el calendario público.
router.post('/manual', async (req, res) => {
  const body = req.body || {};

  if (!body.clientName || !body.clientPhone) {
    return res.status(400).json({ error: 'Falta el nombre y el teléfono del cliente.' });
  }
  if (!esDiaHabilitado(body.date)) {
    return res.status(400).json({ error: 'Solo se puede agendar martes, miércoles o jueves.' });
  }
  if (!['C1', 'C2', 'PAD'].includes(body.court)) {
    return res.status(400).json({ error: 'Cancha inválida.' });
  }
  if (body.lookingForRival && body.court === 'PAD') {
    return res.status(400).json({ error: 'Busco rival es solo para fútbol.' });
  }

  let start_time, end_time, turn = null, code;

  if (body.court === 'PAD') {
    if (!body.startTime || !body.endTime) return res.status(400).json({ error: 'Faltan horarios de pádel.' });
    if (body.startTime < PADEL_APERTURA || body.endTime > PADEL_CIERRE || body.startTime >= body.endTime) {
      return res.status(400).json({ error: 'Horario fuera del rango permitido (20:00 a 23:30).' });
    }
    start_time = body.startTime;
    end_time = body.endTime;
    code = generarCodigoPadel({ date: body.date, startTime: start_time, endTime: end_time });

    const { data: existentes, error: errorConsulta } = await supabaseAdmin
      .from('reservations')
      .select('start_time, end_time')
      .eq('reservation_date', body.date)
      .eq('court', 'PAD')
      .neq('status', 'cancelada');
    if (errorConsulta) return res.status(500).json({ error: errorConsulta.message });
    const seSolapa = existentes.some((r) => start_time < r.end_time && end_time > r.start_time);
    if (seSolapa) return res.status(409).json({ error: 'Ese rango se solapa con otra reserva.' });
  } else {
    const turnoInfo = TURNOS_FUTBOL[body.turn];
    if (!turnoInfo) return res.status(400).json({ error: 'Turno inválido.' });
    turn = body.turn;
    start_time = turnoInfo.start;
    end_time = turnoInfo.end;
    code = generarCodigoFutbol({ court: body.court, date: body.date, turn: body.turn });
  }

  const { data, error } = await supabaseAdmin
    .from('reservations')
    .insert({
      code,
      court: body.court,
      reservation_date: body.date,
      start_time,
      end_time,
      turn,
      client_name: body.clientName,
      client_phone: body.clientPhone,
      client_email: body.clientEmail || null,
      category: body.lookingForRival ? (body.category || null) : null,
      team_name: body.lookingForRival ? (body.teamName || null) : null,
      looking_for_rival: !!body.lookingForRival,
      parrilla: !!body.parrilla,
      status: 'confirmada',
      confirmed_at: new Date().toISOString(),
      confirmed_by: req.adminEmail,
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505' || error.code === '23P01') {
      return res.status(409).json({ error: 'Ese turno ya no está libre.' });
    }
    return res.status(500).json({ error: error.message });
  }

  res.json({ reserva: data, mensaje: 'Turno agendado y confirmado.' });
});

// POST /api/admin/rival/:code - activa o desactiva "busco rival" en una
// reserva confirmada (ej: "ya consiguió rival" la saca del calendario público).
router.post('/rival/:code', async (req, res) => {
  const code = req.params.code.trim();
  const activar = !!req.body.lookingForRival;

  const { data: reserva, error: errorBusqueda } = await supabaseAdmin
    .from('reservations')
    .select('*')
    .ilike('code', code)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (errorBusqueda) return res.status(500).json({ error: errorBusqueda.message });
  if (!reserva) return res.status(404).json({ error: 'No se encontró la reserva.' });
  if (reserva.court === 'PAD') return res.status(400).json({ error: 'Busco rival es solo para fútbol.' });

  const patch = { looking_for_rival: activar };
  if (activar) {
    patch.team_name = req.body.teamName || reserva.team_name || null;
    patch.category = req.body.category || reserva.category || null;
  }

  const { data, error } = await supabaseAdmin
    .from('reservations')
    .update(patch)
    .eq('id', reserva.id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json({ reserva: data });
});

// GET /api/admin/bloqueos/:date - bloqueos preventivos activos ese dia
// (dia completo / cancha entera / turno puntual, sin que haya reserva).
router.get('/bloqueos/:date', async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('bloqueos')
    .select('*')
    .eq('reservation_date', req.params.date)
    .order('created_at', { ascending: true });

  if (error) return res.status(500).json({ error: error.message });
  res.json({ bloqueos: data });
});

// POST /api/admin/bloqueos - crea un bloqueo. court/turn en null = todo.
router.post('/bloqueos', async (req, res) => {
  const { date, court, turn, motivo } = req.body || {};
  if (!date) return res.status(400).json({ error: 'Falta la fecha.' });
  if (court && !['C1', 'C2', 'PAD'].includes(court)) return res.status(400).json({ error: 'Cancha inválida.' });
  if (turn && !TURNOS_FUTBOL[turn]) return res.status(400).json({ error: 'Turno inválido.' });
  if (turn && (!court || court === 'PAD')) return res.status(400).json({ error: 'El turno puntual es solo para fútbol.' });

  const { data, error } = await supabaseAdmin
    .from('bloqueos')
    .insert({
      reservation_date: date,
      court: court || null,
      turn: turn || null,
      motivo: motivo || null,
      created_by: req.adminEmail,
    })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json({ bloqueo: data });
});

// DELETE /api/admin/bloqueos/:id - saca un bloqueo (vuelve a estar disponible).
router.delete('/bloqueos/:id', async (req, res) => {
  const { error } = await supabaseAdmin.from('bloqueos').delete().eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
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

// GET /api/admin/contactos - base de contactos de clientes (deduplicada por telefono).
// Combina los que salen de las reservas con los que Mateo carga a mano.
// Sirve para avisos masivos: cada contacto trae su link de WhatsApp listo.
router.get('/contactos', async (req, res) => {
  const [{ data, error }, manuales] = await Promise.all([
    supabaseAdmin
      .from('reservations')
      .select('client_name, client_phone, client_email, reservation_date, status, court, created_at')
      .order('created_at', { ascending: false }),
    supabaseAdmin
      .from('contactos_manuales')
      .select('*')
      .order('created_at', { ascending: false }),
  ]);

  if (error) return res.status(500).json({ error: error.message });

  const mapa = new Map();
  for (const r of data) {
    const clave = String(r.client_phone || '').replace(/\D/g, '') || (r.client_email || '').toLowerCase() || r.client_name;
    if (!clave) continue;
    if (!mapa.has(clave)) {
      mapa.set(clave, {
        nombre: r.client_name,
        telefono: r.client_phone,
        telefonoWa: normalizarTelefonoAR(r.client_phone),
        email: r.client_email || null,
        totalReservas: 0,
        confirmadas: 0,
        canceladas: 0,
        ultimaReserva: r.reservation_date,
        canchasUsadas: new Set(),
      });
    }
    const c = mapa.get(clave);
    c.totalReservas++;
    if (r.status === 'confirmada') c.confirmadas++;
    if (r.status === 'cancelada') c.canceladas++;
    if (r.reservation_date > c.ultimaReserva) c.ultimaReserva = r.reservation_date;
    c.canchasUsadas.add(r.court);
  }

  // Contactos cargados a mano: solo se agregan si ese teléfono no tiene ya
  // reservas (si las tiene, ya está en el mapa de arriba).
  for (const m of manuales.data || []) {
    const clave = String(m.telefono || '').replace(/\D/g, '') || m.nombre;
    if (!clave || mapa.has(clave)) continue;
    mapa.set(clave, {
      nombre: m.nombre,
      telefono: m.telefono,
      telefonoWa: normalizarTelefonoAR(m.telefono),
      email: null,
      totalReservas: 0,
      confirmadas: 0,
      canceladas: 0,
      ultimaReserva: null,
      canchasUsadas: [],
      manual: true,
    });
  }

  const contactos = [...mapa.values()]
    .map((c) => ({ ...c, canchasUsadas: Array.isArray(c.canchasUsadas) ? c.canchasUsadas : [...c.canchasUsadas] }))
    .sort((a, b) => b.confirmadas - a.confirmadas || b.totalReservas - a.totalReservas);

  res.json({ total: contactos.length, contactos });
});

// POST /api/admin/contactos - Mateo carga un contacto a mano (sin reserva).
router.post('/contactos', async (req, res) => {
  const nombre = String(req.body.nombre || '').trim();
  const telefono = String(req.body.telefono || '').trim();
  if (!nombre || telefono.replace(/\D/g, '').length < 8) {
    return res.status(400).json({ error: 'Completá nombre y teléfono.' });
  }

  const { error } = await supabaseAdmin
    .from('contactos_manuales')
    .insert({ nombre, telefono, created_by: req.adminEmail });

  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});

const DIAS_SEMANA = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const DIAS_HABILITADOS = [2, 3, 4]; // mar, mié, jue

function isoHoy(offsetDias = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDias);
  return d.toISOString().slice(0, 10);
}

// GET /api/admin/stats?dias=7 - dashboard: ventana futura (agenda) + histórico 30 días.
router.get('/stats', async (req, res) => {
  const dias = Number(req.query.dias || 7);
  const hoy = isoHoy(0);
  const finVentana = isoHoy(dias);
  const hace30 = isoHoy(-30);

  const [futuro, historico] = await Promise.all([
    supabaseAdmin
      .from('reservations')
      .select('court, status, reservation_date, turn, looking_for_rival, parrilla')
      .gte('reservation_date', hoy)
      .lte('reservation_date', finVentana),
    supabaseAdmin
      .from('reservations')
      .select('status, reservation_date, client_phone, parrilla')
      .gte('reservation_date', hace30)
      .lt('reservation_date', hoy),
  ]);

  if (futuro.error) return res.status(500).json({ error: futuro.error.message });
  if (historico.error) return res.status(500).json({ error: historico.error.message });

  // ---- Ventana futura ----
  const fData = futuro.data;
  const activas = fData.filter((r) => r.status !== 'cancelada');
  const confirmadas = fData.filter((r) => r.status === 'confirmada');
  const porCancha = { C1: 0, C2: 0, PAD: 0 };
  activas.forEach((r) => { if (porCancha[r.court] != null) porCancha[r.court]++; });

  // ocupación de turnos de fútbol: turnos ocupados / (3 turnos x 2 canchas x días hábiles)
  let diasHabiles = 0;
  for (let i = 0; i <= dias; i++) {
    const d = new Date(hoy + 'T00:00:00');
    d.setDate(d.getDate() + i);
    if (DIAS_HABILITADOS.includes(d.getDay())) diasHabiles++;
  }
  const turnosFutbolPosibles = diasHabiles * 3 * 2;
  const turnosFutbolOcupados = activas.filter((r) => r.court === 'C1' || r.court === 'C2').length;
  const ocupacionFutbol = turnosFutbolPosibles
    ? Math.round((turnosFutbolOcupados / turnosFutbolPosibles) * 100)
    : 0;

  // ---- Histórico 30 días ----
  const hData = historico.data;
  const hConfirmadas = hData.filter((r) => r.status === 'confirmada').length;
  const hCanceladas = hData.filter((r) => r.status === 'cancelada').length;
  const clientesUnicos = new Set(
    hData.map((r) => String(r.client_phone || '').replace(/\D/g, '')).filter(Boolean)
  ).size;
  const porDiaSemana = DIAS_SEMANA.map((nombre, idx) => ({
    dia: nombre,
    reservas: hData.filter((r) => new Date(r.reservation_date + 'T00:00:00').getDay() === idx && r.status !== 'cancelada').length,
  })).filter((d) => DIAS_HABILITADOS.includes(DIAS_SEMANA.indexOf(d.dia)));

  res.json({
    rangoDias: dias,
    ventana: {
      confirmadas: confirmadas.length,
      pendientes: fData.filter((r) => r.status === 'pendiente').length,
      reservasPorCancha: porCancha,
      parrillasReservadas: activas.filter((r) => r.parrilla).length,
      equiposBuscandoRival: activas.filter((r) => r.looking_for_rival && r.status === 'confirmada').length,
      ocupacionFutbolPct: ocupacionFutbol,
      turnosFutbolOcupados,
      turnosFutbolPosibles,
    },
    historico30: {
      totalActivas: hData.filter((r) => r.status !== 'cancelada').length,
      confirmadas: hConfirmadas,
      canceladas: hCanceladas,
      tasaCancelacionPct: hData.length ? Math.round((hCanceladas / hData.length) * 100) : 0,
      clientesUnicos,
      parrillas: hData.filter((r) => r.parrilla && r.status !== 'cancelada').length,
      porDiaSemana,
    },
  });
});

export default router;
