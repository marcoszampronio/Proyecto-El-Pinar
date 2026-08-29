// Convierte lo que hay guardado en client_phone en un número para wa.me
// (Argentina: 549 + característica + número, sin 0 ni 15).
//
// El formulario nuevo guarda el teléfono ya partido y con prefijo, tipo
// "54 9 343 5134744", así que este normalizador básicamente confía en eso.
// También tolera formatos viejos / cargados a mano:
//   "155134744"          -> 5493435134744  (15 + número, se asume caract. local)
//   "343 15-5134744"     -> 5493435134744
//   "3435134744"         -> 5493435134744
//   "+54 9 11 2345-6789" -> 5491123456789  (otra caracterísitica, se respeta)
//
// AREA_TELEFONO (def 343 = Paraná) solo se usa cuando el número viene sin
// característica ni prefijo internacional.

function areaLocal() {
  return String(process.env.AREA_TELEFONO || '343').replace(/\D/g, '') || '343';
}

export function normalizarTelefonoAR(raw) {
  let d = String(raw || '').replace(/\D/g, '');
  if (!d) return null;
  const area = areaLocal();

  // Ya viene con prefijo internacional: confiar en la característica que trae.
  if (d.startsWith('54')) {
    let r = d.slice(2);
    if (r.startsWith('9')) r = r.slice(1);
    // por las dudas, sacar un "15" que se haya colado tras la característica
    r = r.replace(/^(\d{2,4})15(\d{6,8})$/, '$1$2');
    return r.length >= 8 ? '549' + r : null;
  }

  if (d.startsWith('0')) d = d.slice(1);                     // larga distancia
  if (d.startsWith('15')) return '549' + area + d.slice(2);  // celular sin caract.
  if (d.startsWith(area + '15')) return '549' + area + d.slice(area.length + 2);
  if (d.startsWith(area)) return '549' + d;                  // ya tiene la caract. local
  return '549' + area + d;                                   // número pelado
}
