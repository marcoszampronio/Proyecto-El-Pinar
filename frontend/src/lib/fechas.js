const DIAS = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'];
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

// Fecha de hoy en horario local (no UTC): evita que despues de las 21hs
// en Argentina la pagina muestre el dia siguiente.
export function hoyISO() {
  return aISO(new Date());
}

export function aISO(fecha) {
  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${anio}-${mes}-${dia}`;
}

export function desdeISO(iso) {
  const [anio, mes, dia] = iso.split('-').map(Number);
  return new Date(anio, mes - 1, dia);
}

export function sumarDias(iso, dias) {
  const fecha = desdeISO(iso);
  fecha.setDate(fecha.getDate() + dias);
  return aISO(fecha);
}

export function nombreDia(iso) {
  return DIAS[desdeISO(iso).getDay()];
}

export function numeroDia(iso) {
  return String(desdeISO(iso).getDate());
}

export function fechaLarga(iso) {
  const fecha = desdeISO(iso);
  return `${nombreDia(iso)} ${fecha.getDate()} de ${MESES[fecha.getMonth()]}`;
}

export function hhmm(hora) {
  return hora ? hora.slice(0, 5) : '';
}
