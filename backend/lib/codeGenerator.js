// Turnos fijos para las canchas de futbol 11 (C1 y C2)
export const TURNOS_FUTBOL = {
  T1: { start: '20:00:00', end: '21:30:00' },
  T2: { start: '21:30:00', end: '22:30:00' },
  T3: { start: '22:30:00', end: '23:30:00' },
};

// Horario de la cancha de padel (el cliente elige el rango dentro de esto)
export const PADEL_APERTURA = '20:00:00';
export const PADEL_CIERRE = '23:30:00';

const MESES = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];

function formatearFecha(fechaISO) {
  // fechaISO viene como 'YYYY-MM-DD'
  const [anio, mes, dia] = fechaISO.split('-').map(Number);
  return `${String(dia).padStart(2, '0')}${MESES[mes - 1]}`;
}

function horaSinDosPuntos(horaHHMMSS) {
  // '20:30:00' -> '2030'
  return horaHHMMSS.slice(0, 5).replace(':', '');
}

// Genera el codigo para una reserva de futbol 11
// Ej: RES-C1-30AGO-T1
export function generarCodigoFutbol({ court, date, turn }) {
  return `RES-${court}-${formatearFecha(date)}-${turn}`;
}

// Genera el codigo para una reserva de padel
// Ej: RES-PAD-30AGO-2000a2100
export function generarCodigoPadel({ date, startTime, endTime }) {
  return `RES-PAD-${formatearFecha(date)}-${horaSinDosPuntos(startTime)}a${horaSinDosPuntos(endTime)}`;
}
