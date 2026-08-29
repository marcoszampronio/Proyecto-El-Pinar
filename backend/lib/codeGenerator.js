// Turnos fijos para las canchas de futbol 11 (C1 y C2)
// SOLO martes, miercoles y jueves
export const TURNOS_FUTBOL = {
  T1: { start: '20:30:00', end: '21:30:00', label: '20:30 a 21:30' },
  T2: { start: '21:30:00', end: '22:30:00', label: '21:30 a 22:30' },
  T3: { start: '22:30:00', end: '23:30:00', label: '22:30 a 23:30' },
};

export const DIAS_HABILITADOS = [2, 3, 4];
export const NOMBRES_DIAS = { 2: 'Martes', 3: 'Miércoles', 4: 'Jueves' };

export const PADEL_APERTURA = '20:00:00';
export const PADEL_CIERRE = '23:30:00';

// La parrilla es un adicional opcional de cualquier reserva. Hay 2 parrillas.
export const CAPACIDAD_PARRILLA = 2;

const MESES = ['ENE','FEB','MAR','ABR','MAY','JUN','JUL','AGO','SEP','OCT','NOV','DIC'];

function formatearFecha(fechaISO) {
  const [anio, mes, dia] = fechaISO.split('-').map(Number);
  return `${String(dia).padStart(2,'0')}${MESES[mes-1]}`;
}

function horaSinDosPuntos(horaHHMMSS) {
  return horaHHMMSS.slice(0,5).replace(':','');
}

export function esDiaHabilitado(fechaISO) {
  const d = new Date(fechaISO + 'T00:00:00');
  return DIAS_HABILITADOS.includes(d.getDay());
}

export function generarCodigoFutbol({ court, date, turn }) {
  return `RES-${court}-${formatearFecha(date)}-${turn}`;
}

export function generarCodigoPadel({ date, startTime, endTime }) {
  return `RES-PAD-${formatearFecha(date)}-${horaSinDosPuntos(startTime)}a${horaSinDosPuntos(endTime)}`;
}