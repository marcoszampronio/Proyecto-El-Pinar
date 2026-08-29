import { supabaseAdmin } from './supabaseAdmin.js';

const NOMBRE_CANCHA = { C1: 'Cancha 1', C2: 'Cancha 2', PAD: 'Padel', PAR: 'Parrilla' };
const NOMBRE_ESTADO = { pendiente: 'Pendiente', confirmada: 'Confirmada', cancelada: 'Cancelada' };

// Escapa una celda: comillas duplicadas + siempre entre comillas, y prefija con
// comilla simple los valores que Excel interpretaria como formula (CSV injection).
function celda(valor) {
  let s = valor === null || valor === undefined ? '' : String(valor);
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return '"' + s.replace(/"/g, '""') + '"';
}

const CABECERA = [
  'Codigo', 'Cancha', 'Fecha', 'Inicio', 'Fin', 'Turno',
  'Cliente', 'Telefono', 'Email', 'Categoria', 'Estado',
  'Buscando Rival', 'Equipo', 'Parrilla', 'Confirmado En', 'Confirmado Por',
  'Cancelado En', 'Cancelado Por', 'Creado En',
];

function fila(r) {
  return [
    r.code,
    NOMBRE_CANCHA[r.court] || r.court,
    r.reservation_date,
    r.start_time?.slice(0, 5),
    r.end_time?.slice(0, 5),
    r.turn || 'flexible',
    r.client_name,
    r.client_phone,
    r.client_email || '',
    r.category || '',
    NOMBRE_ESTADO[r.status] || r.status,
    r.looking_for_rival ? 'Si' : 'No',
    r.team_name || '',
    r.parrilla ? 'Si' : 'No',
    r.confirmed_at ? new Date(r.confirmed_at).toLocaleString('es-AR') : '',
    r.confirmed_by || '',
    r.cancelled_at ? new Date(r.cancelled_at).toLocaleString('es-AR') : '',
    r.cancelled_by || '',
    r.created_at ? new Date(r.created_at).toLocaleString('es-AR') : '',
  ];
}

const SELECT =
  'code, court, reservation_date, start_time, end_time, turn, client_name, client_phone, ' +
  'client_email, category, status, looking_for_rival, parrilla, team_name, confirmed_at, ' +
  'confirmed_by, cancelled_at, cancelled_by, created_at';

// Genera el CSV (con BOM para Excel). desde/hasta son opcionales (YYYY-MM-DD).
export async function generarCsvReservas({ desde, hasta } = {}) {
  let query = supabaseAdmin.from('reservations').select(SELECT).order('reservation_date', { ascending: false });
  if (desde) query = query.gte('reservation_date', desde);
  if (hasta) query = query.lte('reservation_date', hasta);

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  const BOM = String.fromCharCode(0xfeff);
  const lineas = [CABECERA.map(celda).join(','), ...data.map((r) => fila(r).map(celda).join(','))];
  return { csv: BOM + lineas.join('\n'), total: data.length };
}
