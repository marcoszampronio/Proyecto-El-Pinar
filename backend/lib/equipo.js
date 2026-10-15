// Nombre de equipo normalizado: sin espacios de más y todo en mayúsculas.
export function normalizarEquipo(nombre) {
  const limpio = String(nombre || '').trim().replace(/\s+/g, ' ');
  return limpio ? limpio.toLocaleUpperCase('es-AR') : null;
}
