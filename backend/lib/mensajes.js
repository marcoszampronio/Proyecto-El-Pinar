// Ayudantes para escribir los mensajes de WhatsApp y los mails con tono cercano.
const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

// "martes 20/10" (en vez de la fecha cruda 2026-10-20).
export function fechaCorta(iso) {
  const [anio, mes, dia] = String(iso).split('-').map(Number);
  return `${DIAS[new Date(anio, mes - 1, dia).getDay()]} ${dia}/${mes}`;
}

// "Juan" de "Juan Pérez".
export function primerNombre(nombre) {
  return String(nombre || '').trim().split(/\s+/)[0] || '';
}

// "20:30" de "20:30:00".
export function hora(h) {
  return String(h || '').slice(0, 5);
}

// ["20:30", "21:30", "22:30"] -> "20:30, 21:30 y 22:30"
export function unir(lista) {
  if (lista.length <= 1) return lista.join('');
  return `${lista.slice(0, -1).join(', ')} y ${lista[lista.length - 1]}`;
}
