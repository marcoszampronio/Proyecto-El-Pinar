// Deja el teléfono en formato que entiende wa.me (Argentina: 549 + área + número).
// "Best effort": si el cliente cargó algo raro se devuelve lo que se pudo armar.
export function normalizarTelefonoAR(raw) {
  let d = String(raw || '').replace(/\D/g, '');
  if (!d) return null;
  if (d.startsWith('54')) {
    if (!d.startsWith('549')) d = '549' + d.slice(2);
    return d;
  }
  if (d.startsWith('0')) d = d.slice(1);
  return '549' + d;
}
