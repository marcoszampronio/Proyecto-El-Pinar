// Nombre de equipo normalizado para mostrar: sin espacios de más y todo en mayúsculas.
// (El backend lo guarda igual; esto cubre los equipos cargados antes.)
export function nombreEquipo(nombre) {
  return String(nombre || '').trim().replace(/\s+/g, ' ').toLocaleUpperCase('es-AR');
}
