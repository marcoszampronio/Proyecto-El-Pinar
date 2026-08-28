const DIAS = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'];
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

// Dias habilitados: 2=Martes, 3=Miercoles, 4=Jueves
const DIAS_HABILITADOS = [2, 3, 4];

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
export function esDiaHabilitado(iso) {
  return DIAS_HABILITADOS.includes(desdeISO(iso).getDay());
}
// Dado un ISO, devuelve el proximo dia habilitado igual o posterior
export function proximoDiaHabilitado(iso) {
  let fecha = iso;
  for (let i = 0; i < 7; i++) {
    if (esDiaHabilitado(fecha)) return fecha;
    fecha = sumarDias(fecha, 1);
  }
  return iso;
}