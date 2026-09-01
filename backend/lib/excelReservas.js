import ExcelJS from 'exceljs';
import { supabaseAdmin } from './supabaseAdmin.js';

const NOMBRE_CANCHA = { C1: 'Cancha 1', C2: 'Cancha 2', PAD: 'Pádel' };
const NOMBRE_ESTADO = { pendiente: 'Pendiente', confirmada: 'Confirmada', cancelada: 'Cancelada' };
const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

const NAVY = 'FF123C6E';
const GOLD = 'FFC09A46';
const CREMA = 'FFFAF3E3';

const SELECT =
  'code, court, reservation_date, start_time, end_time, turn, client_name, client_phone, ' +
  'client_email, category, status, looking_for_rival, parrilla, team_name, confirmed_at, ' +
  'confirmed_by, cancelled_at, cancelled_by, created_at';

function pct(n, total) {
  return total ? Math.round((n / total) * 100) / 100 : 0;
}

// Genera el .xlsx y devuelve un Buffer.
export async function generarExcelReservas({ desde, hasta } = {}) {
  let q = supabaseAdmin.from('reservations').select(SELECT).order('reservation_date', { ascending: true });
  if (desde) q = q.gte('reservation_date', desde);
  if (hasta) q = q.lte('reservation_date', hasta);
  const { data, error } = await q;
  if (error) throw new Error(error.message);

  const wb = new ExcelJS.Workbook();
  wb.creator = 'Complejo El Pinar';
  wb.created = new Date();

  construirResumen(wb, data, { desde, hasta });
  construirDetalle(wb, data);

  return wb.xlsx.writeBuffer();
}

// ---------------------------------------------------------------------------
function tituloFila(ws, fila, texto) {
  const c = ws.getCell(`A${fila}`);
  c.value = texto;
  c.font = { bold: true, size: 12, color: { argb: NAVY } };
  ws.mergeCells(`A${fila}:E${fila}`);
}

function encabezadoTabla(ws, fila, cols) {
  cols.forEach((t, i) => {
    const c = ws.getCell(fila, i + 1);
    c.value = t;
    c.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } };
    c.alignment = { horizontal: i === 0 ? 'left' : 'center' };
  });
}

function construirResumen(wb, data, { desde, hasta }) {
  const ws = wb.addWorksheet('Resumen', { views: [{ showGridLines: false }] });
  ws.columns = [{ width: 26 }, { width: 14 }, { width: 14 }, { width: 14 }, { width: 16 }];

  const activas = data.filter((r) => r.status !== 'cancelada');
  const confirmadas = data.filter((r) => r.status === 'confirmada');
  const canceladas = data.filter((r) => r.status === 'cancelada');
  const pendientes = data.filter((r) => r.status === 'pendiente');
  const total = data.length;

  // --- Encabezado ---
  ws.getCell('A1').value = 'COMPLEJO EL PINAR — Reporte de reservas';
  ws.getCell('A1').font = { bold: true, size: 16, color: { argb: NAVY } };
  ws.mergeCells('A1:E1');
  ws.getCell('A2').value = `Período: ${desde || 'todo'} a ${hasta || 'todo'}   ·   Generado: ${new Date().toLocaleString('es-AR')}`;
  ws.getCell('A2').font = { italic: true, color: { argb: 'FF666666' } };
  ws.mergeCells('A2:E2');

  let f = 4;
  // --- Totales del complejo ---
  tituloFila(ws, f, 'TOTALES DEL COMPLEJO'); f += 1;
  const totales = [
    ['Reservas totales', total],
    ['Confirmadas', confirmadas.length],
    ['Canceladas', canceladas.length],
    ['Pendientes', pendientes.length],
    ['Tasa de cancelación', total ? pct(canceladas.length, total) : 0, '0%'],
    ['Clientes distintos', new Set(data.map((r) => (r.client_phone || '').replace(/\D/g, '')).filter(Boolean)).size],
    ['Reservas con parrilla', activas.filter((r) => r.parrilla).length],
    ['Equipos que buscaron rival', confirmadas.filter((r) => r.looking_for_rival).length],
  ];
  for (const [label, val, fmt] of totales) {
    ws.getCell(`A${f}`).value = label;
    const c = ws.getCell(`B${f}`);
    c.value = val;
    if (fmt) c.numFmt = fmt;
    c.font = { bold: true };
    f += 1;
  }
  f += 1;

  // --- Por cancha (con total del complejo) ---
  tituloFila(ws, f, 'POR CANCHA'); f += 1;
  encabezadoTabla(ws, f, ['Cancha', 'Reservas', 'Confirmadas', 'Canceladas', '% del total']); f += 1;
  const inicioCancha = f;
  for (const court of ['C1', 'C2', 'PAD']) {
    const delCourt = data.filter((r) => r.court === court);
    ws.getCell(f, 1).value = NOMBRE_CANCHA[court];
    ws.getCell(f, 2).value = delCourt.length;
    ws.getCell(f, 3).value = delCourt.filter((r) => r.status === 'confirmada').length;
    ws.getCell(f, 4).value = delCourt.filter((r) => r.status === 'cancelada').length;
    const p = ws.getCell(f, 5);
    p.value = pct(delCourt.length, total);
    p.numFmt = '0%';
    f += 1;
  }
  // fila TOTAL
  ws.getCell(f, 1).value = 'TOTAL COMPLEJO';
  ws.getCell(f, 2).value = { formula: `SUM(B${inicioCancha}:B${f - 1})` };
  ws.getCell(f, 3).value = { formula: `SUM(C${inicioCancha}:C${f - 1})` };
  ws.getCell(f, 4).value = { formula: `SUM(D${inicioCancha}:D${f - 1})` };
  ws.getCell(f, 5).value = 1;
  ws.getCell(f, 5).numFmt = '0%';
  for (let col = 1; col <= 5; col++) {
    ws.getCell(f, col).font = { bold: true };
    ws.getCell(f, col).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: CREMA } };
  }
  // barra visual en "Reservas" por cancha
  ws.addConditionalFormatting({
    ref: `B${inicioCancha}:B${f - 1}`,
    rules: [{ type: 'dataBar', cfvo: [{ type: 'num', value: 0 }, { type: 'max' }], color: { argb: GOLD }, gradient: false }],
  });
  f += 2;

  // --- Por mes ---
  tituloFila(ws, f, 'POR MES'); f += 1;
  encabezadoTabla(ws, f, ['Mes', 'Reservas', 'Confirmadas', 'Canceladas', '']); f += 1;
  const porMes = {};
  for (const r of data) {
    const k = r.reservation_date.slice(0, 7);
    (porMes[k] = porMes[k] || []).push(r);
  }
  const inicioMes = f;
  for (const k of Object.keys(porMes).sort()) {
    const [a, m] = k.split('-');
    ws.getCell(f, 1).value = `${MESES[Number(m) - 1]} ${a}`;
    ws.getCell(f, 2).value = porMes[k].length;
    ws.getCell(f, 3).value = porMes[k].filter((r) => r.status === 'confirmada').length;
    ws.getCell(f, 4).value = porMes[k].filter((r) => r.status === 'cancelada').length;
    f += 1;
  }
  if (f > inicioMes) {
    ws.addConditionalFormatting({ ref: `B${inicioMes}:B${f - 1}`, rules: [{ type: 'dataBar', cfvo: [{ type: 'num', value: 0 }, { type: 'max' }], color: { argb: GOLD }, gradient: false }] });
  }
  f += 2;

  // --- Por día de la semana ---
  tituloFila(ws, f, 'POR DÍA DE LA SEMANA'); f += 1;
  encabezadoTabla(ws, f, ['Día', 'Reservas', 'Confirmadas', '', '']); f += 1;
  const inicioDia = f;
  const conteoDia = {};
  for (const r of data) {
    const d = new Date(r.reservation_date + 'T00:00:00').getDay();
    (conteoDia[d] = conteoDia[d] || []).push(r);
  }
  for (const d of [1, 2, 3, 4, 5, 6, 0]) {
    if (!conteoDia[d]) continue;
    ws.getCell(f, 1).value = DIAS[d];
    ws.getCell(f, 2).value = conteoDia[d].length;
    ws.getCell(f, 3).value = conteoDia[d].filter((r) => r.status === 'confirmada').length;
    f += 1;
  }
  if (f > inicioDia) {
    ws.addConditionalFormatting({ ref: `B${inicioDia}:B${f - 1}`, rules: [{ type: 'dataBar', cfvo: [{ type: 'num', value: 0 }, { type: 'max' }], color: { argb: GOLD }, gradient: false }] });
  }
  f += 2;

  // --- Top clientes ---
  tituloFila(ws, f, 'CLIENTES MÁS FRECUENTES (por confirmadas)'); f += 1;
  encabezadoTabla(ws, f, ['Cliente', 'Confirmadas', 'Total', 'Teléfono', '']); f += 1;
  const porCliente = new Map();
  for (const r of data) {
    const k = (r.client_phone || '').replace(/\D/g, '') || r.client_name;
    if (!porCliente.has(k)) porCliente.set(k, { nombre: r.client_name, tel: r.client_phone, conf: 0, total: 0 });
    const c = porCliente.get(k);
    c.total += 1;
    if (r.status === 'confirmada') c.conf += 1;
  }
  const topInicio = f;
  [...porCliente.values()].sort((a, b) => b.conf - a.conf || b.total - a.total).slice(0, 15).forEach((c) => {
    ws.getCell(f, 1).value = c.nombre;
    ws.getCell(f, 2).value = c.conf;
    ws.getCell(f, 3).value = c.total;
    ws.getCell(f, 4).value = c.tel;
    f += 1;
  });
  if (f > topInicio) {
    ws.addConditionalFormatting({ ref: `B${topInicio}:B${f - 1}`, rules: [{ type: 'dataBar', cfvo: [{ type: 'num', value: 0 }, { type: 'max' }], color: { argb: GOLD }, gradient: false }] });
  }

  ws.getCell(`A${f + 2}`).value =
    'Tip: en la hoja "Detalle" tenés todas las reservas como tabla. Filtrá por cancha o fecha, ' +
    'y con Insertar → Gráfico dinámico armás el gráfico que quieras.';
  ws.getCell(`A${f + 2}`).font = { italic: true, color: { argb: 'FF666666' } };
  ws.mergeCells(`A${f + 2}:E${f + 3}`);
}

// ---------------------------------------------------------------------------
function construirDetalle(wb, data) {
  const ws = wb.addWorksheet('Detalle');

  const columnas = [
    'Código', 'Cancha', 'Fecha', 'Día', 'Inicio', 'Fin', 'Turno', 'Estado',
    'Cliente', 'Teléfono', 'Email', 'Categoría', 'Busca rival', 'Equipo', 'Parrilla',
    'Confirmada', 'Cancelada', 'Cancelada por', 'Creada',
  ];

  const filas = data.map((r) => {
    const d = new Date(r.reservation_date + 'T00:00:00');
    return [
      r.code,
      NOMBRE_CANCHA[r.court] || r.court,
      r.reservation_date,
      DIAS[d.getDay()],
      r.start_time?.slice(0, 5) || '',
      r.end_time?.slice(0, 5) || '',
      r.turn || 'flexible',
      NOMBRE_ESTADO[r.status] || r.status,
      r.client_name,
      r.client_phone,
      r.client_email || '',
      r.category || '',
      r.looking_for_rival ? 'Sí' : 'No',
      r.team_name || '',
      r.parrilla ? 'Sí' : 'No',
      r.confirmed_at ? new Date(r.confirmed_at).toLocaleString('es-AR') : '',
      r.cancelled_at ? new Date(r.cancelled_at).toLocaleString('es-AR') : '',
      r.cancelled_by || '',
      r.created_at ? new Date(r.created_at).toLocaleString('es-AR') : '',
    ];
  });

  ws.addTable({
    name: 'Reservas',
    ref: 'A1',
    headerRow: true,
    style: { theme: 'TableStyleMedium2', showRowStripes: true },
    columns: columnas.map((name) => ({ name, filterButton: true })),
    rows: filas.length ? filas : [columnas.map(() => '')],
  });

  ws.columns.forEach((col, i) => {
    const anchos = [20, 12, 12, 11, 8, 8, 10, 12, 22, 16, 26, 12, 11, 18, 9, 18, 18, 22, 18];
    col.width = anchos[i] || 14;
  });
  ws.views = [{ state: 'frozen', ySplit: 1 }];
}
