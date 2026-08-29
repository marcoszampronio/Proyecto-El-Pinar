// Convierte lo que el cliente escribió en un número que entiende wa.me
// (Argentina: 549 + característica + número, sin 0 ni 15).
//
// El cliente puede escribir su número como se lo da a un amigo:
//   "155134744"        -> 5493435134744   (15 + número, sin característica)
//   "343 155134744"    -> 5493435134744
//   "3435134744"       -> 5493435134744   (característica + número)
//   "5134744"          -> 5493435134744   (número pelado, se asume la caract. local)
//   "+54 9 343 5134744"-> 5493435134744
//
// La característica por defecto se toma de AREA_TELEFONO (por defecto 343 = Paraná).

function areaLocal() {
  return String(process.env.AREA_TELEFONO || '343').replace(/\D/g, '') || '343';
}

// Recibe la parte "local" (lo que va después del 549) y la deja como
// característica + número, sacando el prefijo 15 de celular si está.
function limpiarLocal(d, area) {
  if (d.startsWith('15')) return area + d.slice(2);
  if (d.startsWith(area + '15')) return area + d.slice(area.length + 2);
  if (d.startsWith(area)) return d;
  return area + d; // número sin característica
}

export function normalizarTelefonoAR(raw) {
  let d = String(raw || '').replace(/\D/g, '');
  if (!d) return null;
  const area = areaLocal();

  if (d.startsWith('54')) {
    d = d.slice(2);
    if (d.startsWith('9')) d = d.slice(1);
    return '549' + limpiarLocal(d, area);
  }
  if (d.startsWith('0')) d = d.slice(1);
  return '549' + limpiarLocal(d, area);
}
