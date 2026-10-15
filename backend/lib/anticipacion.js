// Regla de anticipación: un turno se puede reservar por la web como máximo hasta
// MIN_ANTICIPACION_MIN minutos antes de que empiece (61 por defecto: hace falta
// 1 hora de margen). Mateo (panel) no está sujeto a esta regla.
// Las horas del complejo son de Argentina (UTC-3, sin horario de verano); el
// servidor corre en UTC, por eso se arma la hora con el desfase explícito.
export const MINUTOS_ANTICIPACION = Number(process.env.MIN_ANTICIPACION_MIN || 61);
const DESFASE_ART = '-03:00';

export function minutosHastaInicio(fecha, horaInicio) {
  const inicio = new Date(`${fecha}T${String(horaInicio).slice(0, 5)}:00${DESFASE_ART}`);
  return (inicio.getTime() - Date.now()) / 60000;
}

// true si el turno empieza demasiado pronto (o ya empezó) para reservarlo por la web.
export function demasiadoTarde(fecha, horaInicio) {
  return minutosHastaInicio(fecha, horaInicio) < MINUTOS_ANTICIPACION;
}

export const MENSAJE_ANTICIPACION =
  'Ese horario ya no se puede reservar online: las reservas se cierran 1 hora antes del turno.';

// Para el pádel (el cliente elige la hora de inicio): primera hora de inicio permitida
// en esa fecha, como 'HH:MM'. null = sin restricción (el día es posterior a hoy);
// '24:00' = ya no queda ningún horario ese día.
export function inicioMinimoPadel(fecha) {
  const limite = new Date(Date.now() + MINUTOS_ANTICIPACION * 60000);
  const enART = new Date(limite.getTime() - 3 * 3600000); // reloj de Argentina leído como UTC
  const diaLimite = enART.toISOString().slice(0, 10);
  if (fecha > diaLimite) return null;
  if (fecha < diaLimite) return '24:00';
  const hh = String(enART.getUTCHours()).padStart(2, '0');
  const mm = String(enART.getUTCMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}
