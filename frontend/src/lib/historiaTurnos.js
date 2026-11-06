// Dibuja la imagen de "turnos libres" para subir a una historia de Instagram (1080×1920).
// Se hace con canvas (sin librerías): el dibujo es siempre el mismo y se descarga como PNG.
// Zona segura de Instagram: arriba ~250 px y abajo ~300 px quedan tapados por la app, ahí no va nada importante.
import { desdeISO, fechaLargaCompleta, partesFecha } from './fechas';

export const HISTORIA_W = 1080;
export const HISTORIA_H = 1920;

// Estilo único: azul pino con el dorado de la marca (el de los videos de "Busco rival").
const COL = {
  fondo: '#0F2436', tinta: '#F3EEE1', verde: '#F2C14E', sobreVerde: '#0F2436', gris: '#9FB6C9',
  lineas: 'rgba(243,238,225,0.08)', tarjeta: 'rgba(243,238,225,0.08)', chip: '#F2C14E', textoChip: '#0F2436', borde: 'rgba(243,238,225,0.55)',
  pildora: '#F3EEE1', pildoraTexto: '#0F2436', diaFondo: '#F3EEE1', diaTexto: '#0F2436',
};

const FUENTE = 'Satoshi, system-ui, sans-serif';
const SERIF = '"DM Serif Display", Georgia, serif';

const DIA_CORTO_MAYUS = { domingo: 'DOM', lunes: 'LUN', martes: 'MAR', miércoles: 'MIÉ', jueves: 'JUE', viernes: 'VIE', sábado: 'SÁB' };

function rect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function texto(ctx, t, x, y, { size, peso = 700, color = COL.tinta, align = 'center', fuente = FUENTE, espaciado = 0 }) {
  ctx.font = `${peso} ${size}px ${fuente}`;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  if ('letterSpacing' in ctx) ctx.letterSpacing = `${espaciado}px`;
  ctx.fillText(t, x, y);
  if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
}

// Titular pesado: se engorda el trazo para que parezca una tipografía "black".
function titular(ctx, t, x, y, size, { relleno = null, contorno = null, color = COL.tinta, grosor = 6, alpha = 1 }) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.font = `700 ${size}px ${FUENTE}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.lineJoin = 'round';
  if ('letterSpacing' in ctx) ctx.letterSpacing = '-4px';
  if (relleno) {
    ctx.fillStyle = color;
    ctx.strokeStyle = color;
    ctx.lineWidth = grosor;
    ctx.strokeText(t, x, y);
    ctx.fillText(t, x, y);
  }
  if (contorno) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 4;
    ctx.strokeText(t, x, y);
  }
  ctx.restore();
}

function fondo(ctx) {
  const g = ctx.createLinearGradient(0, 0, 0, HISTORIA_H);
  g.addColorStop(0, '#12304A');
  g.addColorStop(1, '#0B1B2A');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, HISTORIA_W, HISTORIA_H);
  // líneas de cancha muy suaves: círculo central y línea de mitad de cancha, que pasa justo por su centro
  const cx = 860;
  const cy = 1200;
  const ang = -0.52;             // inclinación de la línea de mitad de cancha
  const dx = Math.cos(ang);
  const dy = Math.sin(ang);
  ctx.save();
  ctx.strokeStyle = COL.lineas;
  ctx.fillStyle = COL.lineas;
  ctx.lineWidth = 16;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(cx, cy, 520, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx - dx * 2200, cy - dy * 2200);
  ctx.lineTo(cx + dx * 2200, cy + dy * 2200);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, cy, 20, 0, Math.PI * 2);   // punto central
  ctx.fill();
  ctx.restore();
}

function encabezado(ctx, subtitulo) {
  // contorno repetido hacia arriba, y la palabra llena abajo
  titular(ctx, 'TURNOS', 540, 400, 200, { contorno: true, alpha: 0.14 });
  titular(ctx, 'TURNOS', 540, 510, 200, { contorno: true, alpha: 0.3 });
  titular(ctx, 'TURNOS', 540, 620, 200, { relleno: true });

  // "LIBRES" sobre un bloque verde
  ctx.font = `700 200px ${FUENTE}`;
  if ('letterSpacing' in ctx) ctx.letterSpacing = '-4px';
  const wl = ctx.measureText('LIBRES').width;
  if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
  ctx.fillStyle = COL.verde;
  rect(ctx, 540 - wl / 2 - 36, 656, wl + 72, 196, 40);
  ctx.fill();
  titular(ctx, 'LIBRES', 540, 800, 200, { relleno: true, color: COL.sobreVerde });

  // etiqueta con el día o la semana
  ctx.font = `700 40px ${FUENTE}`;
  if ('letterSpacing' in ctx) ctx.letterSpacing = '2px';
  const w = ctx.measureText(subtitulo).width + 84;
  if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
  ctx.fillStyle = COL.pildora;
  rect(ctx, 540 - w / 2, 890, w, 84, 42);
  ctx.fill();
  texto(ctx, subtitulo, 540, 948, { size: 40, peso: 700, color: COL.pildoraTexto, espaciado: 2 });
}

// Solo la marca: pino + "El Pinar", centrados.
function pie(ctx, handle = null) {
  const size = 76;
  ctx.font = `400 ${size}px ${SERIF}`;
  const wt = ctx.measureText('El Pinar').width;
  const esc = 1.7;                 // tamaño del pino
  const wp = 28 * esc;
  const gap = 22;
  const x0 = 540 - (wp + gap + wt) / 2;
  ctx.save();
  ctx.translate(x0, 1600);
  ctx.scale(esc, esc);
  ctx.fillStyle = COL.verde;
  ctx.beginPath();
  ctx.moveTo(14, 0); ctx.lineTo(20, 11); ctx.lineTo(17, 11); ctx.lineTo(22, 21); ctx.lineTo(19, 21);
  ctx.lineTo(25, 32); ctx.lineTo(3, 32); ctx.lineTo(9, 21); ctx.lineTo(6, 21); ctx.lineTo(11, 11); ctx.lineTo(8, 11);
  ctx.closePath();
  ctx.fill();
  ctx.fillRect(12, 31, 4, 7);
  ctx.restore();
  texto(ctx, 'El Pinar', x0 + wp + gap, 1658, { size, peso: 400, color: COL.tinta, align: 'left', fuente: SERIF });
  if (handle) texto(ctx, handle, 540, 1722, { size: 32, peso: 500, color: COL.gris, espaciado: 1 });
}

// Vista "del día": una sola tarjeta con los horarios libres, separados por líneas finas.
function cuerpoDia(ctx, dia) {
  const filas = dia.turnos.filter((t) => t.libres.length && !t.cerrado);
  const alto = filas.length > 2 ? 124 : 140;
  const y0 = 1040;
  const total = filas.length * alto;
  ctx.fillStyle = COL.tarjeta;
  rect(ctx, 100, y0, 880, total, 44);
  ctx.fill();
  ctx.strokeStyle = COL.borde;
  ctx.lineWidth = 4;
  rect(ctx, 100, y0, 880, total, 44);
  ctx.stroke();
  filas.forEach((t, i) => {
    const y = y0 + i * alto;
    if (i > 0) {
      ctx.save();
      ctx.globalAlpha = 0.22;
      ctx.strokeStyle = COL.borde;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(150, y);
      ctx.lineTo(930, y);
      ctx.stroke();
      ctx.restore();
    }
    ctx.fillStyle = COL.verde;
    ctx.beginPath();
    ctx.arc(190, y + alto / 2, 15, 0, Math.PI * 2);
    ctx.fill();
    texto(ctx, `${t.hora} hs`, 560, y + alto / 2 + 28, { size: 80, peso: 700 });
  });
}

// Vista "de la semana": una fila por día, con los horarios libres escritos en una sola línea.
function cuerpoSemana(ctx, dias) {
  const conLibres = dias.filter((d) => d.turnos.some((t) => t.libres.length && !t.cerrado));
  const n = Math.max(conLibres.length, 1);
  const sep = 22;
  const alto = Math.min(150, Math.floor((510 - (n - 1) * sep) / n));
  conLibres.forEach((d, i) => {
    const y = 1030 + i * (alto + sep);
    // día
    ctx.fillStyle = COL.diaFondo;
    rect(ctx, 80, y, 200, alto, alto / 2);
    ctx.fill();
    texto(ctx, d.diaCorto, 180, y + alto * 0.46, { size: Math.min(42, alto * 0.28), peso: 700, color: COL.diaTexto, espaciado: 2 });
    texto(ctx, d.diaNum, 180, y + alto * 0.8, { size: Math.min(46, alto * 0.3), peso: 700, color: COL.diaTexto });
    // horarios libres en una línea
    ctx.fillStyle = COL.chip;
    rect(ctx, 300, y, 700, alto, alto / 2);
    ctx.fill();
    const horas = d.turnos.filter((t) => t.libres.length && !t.cerrado).map((t) => t.hora);
    const linea = horas.join('   ·   ');
    let size = Math.min(60, alto * 0.42);
    ctx.font = `700 ${size}px ${FUENTE}`;
    while (ctx.measureText(linea).width > 620 && size > 30) { size -= 2; ctx.font = `700 ${size}px ${FUENTE}`; }
    texto(ctx, linea, 650, y + alto / 2 + size * 0.34, { size, peso: 700, color: COL.textoChip || COL.tinta });
  });
}

// ¿hay algún turno libre para mostrar? (si no, no tiene sentido armar la historia)
export function hayTurnosLibres(dias) {
  return (dias || []).some((d) => d.turnos.some((t) => t.libres.length && !t.cerrado));
}

/**
 * datos = {
 *   modo: 'dia' | 'semana',
 *   subtitulo: string ("MARTES 4 DE NOVIEMBRE" / "DEL 3 AL 5 DE NOVIEMBRE"),
 *   dias: [{ fecha, diaCorto, diaNum, turnos: [{ hora, libres: ['C1','C2'], cerrado }] }],
 * }
 * Solo se dibujan los turnos libres: lo reservado no se muestra.
 */
export async function dibujarHistoria(canvas, datos) {
  try {
    await Promise.all([
      document.fonts.load(`700 100px Satoshi`),
      document.fonts.load(`500 40px Satoshi`),
      document.fonts.load(`400 40px "DM Serif Display"`),
    ]);
  } catch { /* si no cargan, se usan las de respaldo */ }

  canvas.width = HISTORIA_W;
  canvas.height = HISTORIA_H;
  const ctx = canvas.getContext('2d');
  fondo(ctx);
  encabezado(ctx, datos.subtitulo);
  if (datos.modo === 'dia' && datos.dias[0]) cuerpoDia(ctx, datos.dias[0]);
  else cuerpoSemana(ctx, datos.dias);
  pie(ctx);
}

// Achica la letra hasta que el texto entre en `anchoMax` (los nombres de equipo los escribe el público y pueden ser largos).
function ajustarFuente(ctx, t, peso, sizeMax, anchoMax, { sizeMin = 22, espaciado = 0 } = {}) {
  let size = sizeMax;
  const medir = () => {
    ctx.font = `${peso} ${size}px ${FUENTE}`;
    if ('letterSpacing' in ctx) ctx.letterSpacing = `${espaciado}px`;
    return ctx.measureText(t).width;
  };
  while (medir() > anchoMax && size > sizeMin) size -= 2;
  if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
  return size;
}

function cuerpoRival(ctx, d) {
  const filas = [
    { etiqueta: 'DÍA', valor: d.dia },
    { etiqueta: 'HORA', valor: d.hora, chip: true },
    { etiqueta: 'CANCHA', valor: d.cancha },
  ];
  const alto = 132;
  const y0 = 1040;
  const total = filas.length * alto;
  ctx.fillStyle = COL.tarjeta;
  rect(ctx, 100, y0, 880, total, 44);
  ctx.fill();
  ctx.strokeStyle = COL.borde;
  ctx.lineWidth = 4;
  rect(ctx, 100, y0, 880, total, 44);
  ctx.stroke();
  filas.forEach((f, i) => {
    const y = y0 + i * alto;
    if (i > 0) {
      ctx.save();
      ctx.globalAlpha = 0.22;
      ctx.strokeStyle = COL.borde;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(150, y);
      ctx.lineTo(930, y);
      ctx.stroke();
      ctx.restore();
    }
    ctx.fillStyle = COL.verde;
    ctx.beginPath();
    ctx.arc(170, y + alto / 2, 14, 0, Math.PI * 2);
    ctx.fill();
    texto(ctx, f.etiqueta, 206, y + alto / 2 + 10, { size: 28, peso: 700, color: COL.gris, align: 'left', espaciado: 4 });
    const size = ajustarFuente(ctx, f.valor, 700, 56, f.chip ? 380 : 520);
    if (f.chip) {
      ctx.font = `700 ${size}px ${FUENTE}`;
      const w = ctx.measureText(f.valor).width + 64;
      ctx.fillStyle = COL.chip;
      rect(ctx, 940 - w, y + (alto - 86) / 2, w, 86, 43);
      ctx.fill();
      texto(ctx, f.valor, 940 - w / 2, y + alto / 2 + size * 0.34, { size, peso: 700, color: COL.textoChip || COL.tinta });
    } else {
      texto(ctx, f.valor, 940, y + alto / 2 + size * 0.34, { size, peso: 700, align: 'right' });
    }
  });
  texto(ctx, 'Nos falta un equipo para jugar', 540, 1514, { size: 40, peso: 700, color: COL.tinta });
}

/**
 * Imagen de historia para una reserva que busca rival (misma estética que "Turnos libres").
 * datos = { equipo, cancha: 'Cancha 2', dia: 'Jueves 22/11', hora: '21:30 hs', handle: '@elpinarcomplejo' }
 */
export async function dibujarBuscoRival(canvas, datos) {
  try {
    await Promise.all([
      document.fonts.load(`700 100px Satoshi`),
      document.fonts.load(`500 40px Satoshi`),
      document.fonts.load(`400 40px "DM Serif Display"`),
    ]);
  } catch { /* si no cargan, se usan las de respaldo */ }

  canvas.width = HISTORIA_W;
  canvas.height = HISTORIA_H;
  const ctx = canvas.getContext('2d');
  fondo(ctx);

  // titular: "BUSCAMOS" (contorno repetido + lleno) y "RIVAL" sobre un bloque de color
  const tam = ajustarFuente(ctx, 'BUSCAMOS', 700, 200, 920, { espaciado: -4 });
  const paso = tam * 0.55;
  const yS = 620;
  titular(ctx, 'BUSCAMOS', 540, yS - paso * 2, tam, { contorno: true, alpha: 0.14 });
  titular(ctx, 'BUSCAMOS', 540, yS - paso, tam, { contorno: true, alpha: 0.3 });
  titular(ctx, 'BUSCAMOS', 540, yS, tam, { relleno: true });
  ctx.font = `700 ${tam}px ${FUENTE}`;
  if ('letterSpacing' in ctx) ctx.letterSpacing = '-4px';
  const wr = ctx.measureText('RIVAL').width;
  if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
  ctx.fillStyle = COL.verde;
  rect(ctx, 540 - wr / 2 - 36, yS + tam * 0.18, wr + 72, tam * 0.98, 40);
  ctx.fill();
  titular(ctx, 'RIVAL', 540, yS + tam * 0.9, tam, { relleno: true, color: COL.sobreVerde });

  // nombre del equipo en la pastilla
  const nombre = (datos.equipo || '').toUpperCase();
  const tn = ajustarFuente(ctx, nombre, 700, 40, 800, { espaciado: 2 });
  ctx.font = `700 ${tn}px ${FUENTE}`;
  if ('letterSpacing' in ctx) ctx.letterSpacing = '2px';
  const wn = ctx.measureText(nombre).width + 84;
  if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
  ctx.fillStyle = COL.pildora;
  rect(ctx, 540 - wn / 2, 890, wn, 84, 42);
  ctx.fill();
  texto(ctx, nombre, 540, 890 + 42 + tn * 0.35, { size: tn, peso: 700, color: COL.pildoraTexto, espaciado: 2 });

  cuerpoRival(ctx, datos);
  pie(ctx, datos.handle);
}

// ---- armado de los datos a partir de la agenda del panel ----

// 'YYYY-MM-DD' + 'HH:MM:SS' ya pasó (hora del celular, que en el complejo es la de Paraná)
function yaPaso(fecha, horaInicio, ahora = new Date()) {
  const [h, m] = horaInicio.split(':').map(Number);
  const f = desdeISO(fecha);
  f.setHours(h, m, 0, 0);
  return f.getTime() <= ahora.getTime();
}

// agenda = respuesta de GET /api/admin/agenda/:fecha
export function turnosDeAgenda(fecha, agenda, ahora = new Date()) {
  const horarios = agenda.futbol.C1.map((s) => s.turn);
  return horarios.map((turn) => {
    const c1 = agenda.futbol.C1.find((s) => s.turn === turn);
    const c2 = agenda.futbol.C2.find((s) => s.turn === turn);
    const cerrado = yaPaso(fecha, c1.start, ahora);
    const libres = [];
    if (c1.status === 'libre') libres.push('C1');
    if (c2.status === 'libre') libres.push('C2');
    return { hora: c1.start.slice(0, 5), fin: c1.end.slice(0, 5), libres, cerrado };
  });
}

export function etiquetasDia(fecha) {
  const p = partesFecha(fecha);
  return {
    diaCorto: DIA_CORTO_MAYUS[p.diaSemana] || p.diaSemana.slice(0, 3).toUpperCase(),
    diaNum: `${p.diaNum}/${String(desdeISO(fecha).getMonth() + 1).padStart(2, '0')}`,
  };
}

export function subtituloDia(fecha) {
  return fechaLargaCompleta(fecha).toUpperCase();
}

export function subtituloSemana(fechas) {
  if (!fechas.length) return 'DE LA SEMANA';
  const a = partesFecha(fechas[0]);
  const b = partesFecha(fechas[fechas.length - 1]);
  if (fechas.length === 1) return `${a.diaNum} DE ${a.mes.toUpperCase()}`;
  return a.mes === b.mes
    ? `DEL ${a.diaNum} AL ${b.diaNum} DE ${b.mes.toUpperCase()}`
    : `DEL ${a.diaNum} DE ${a.mes.toUpperCase()} AL ${b.diaNum} DE ${b.mes.toUpperCase()}`;
}
