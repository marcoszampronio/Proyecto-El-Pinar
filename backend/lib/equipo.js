import { supabaseAdmin } from './supabaseAdmin.js';

// Nombre de equipo normalizado: sin espacios de más y todo en mayúsculas.
export function normalizarEquipo(nombre) {
  const limpio = String(nombre || '').trim().replace(/\s+/g, ' ');
  return limpio ? limpio.toLocaleUpperCase('es-AR') : null;
}

// Clave para detectar equipos escritos distinto ("Matador", "Matador FC", "Los Matadores"):
// sin tildes, sin FC/CF/CLUB/artículos y sin símbolos.
const PALABRAS_SUELTAS = new Set(['FC', 'CF', 'CLUB', 'DE', 'DEL', 'LOS', 'LAS', 'EL', 'LA', 'SA']);
export function claveEquipo(nombre) {
  const sinTildes = String(nombre || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();
  const palabras = sinTildes.split(/[^A-Z0-9]+/).filter((p) => p && !PALABRAS_SUELTAS.has(p));
  return palabras.join('');
}

function distancia(a, b) {
  const m = a.length, n = b.length;
  if (Math.abs(m - n) > 1) return 2;
  const d = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 0; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
  }
  return d[m][n];
}

// ¿Estos dos nombres pueden ser el mismo equipo? Solo sirve para SUGERIR unirlos;
// nunca se unen solos.
export function equiposParecidos(a, b) {
  const ka = claveEquipo(a), kb = claveEquipo(b);
  if (!ka || !kb || ka === kb) return !!ka && ka === kb;
  const [corto, largo] = ka.length <= kb.length ? [ka, kb] : [kb, ka];
  if (corto.length >= 4 && largo.startsWith(corto)) return true; // MATADOR / MATADORES
  return corto.length >= 3 && distancia(ka, kb) <= 1;            // PSG / PSGG
}

// Guarda la categoría con la que juega un equipo (para sugerirla la próxima vez).
// Nunca rompe la acción principal.
export async function recordarEquipo(nombre, categoria) {
  const n = normalizarEquipo(nombre);
  if (!n || !categoria) return;
  try {
    const { error } = await supabaseAdmin.from('equipos').upsert({ nombre: n, categoria }, { onConflict: 'nombre' });
    if (error) console.error('[equipos] no se pudo guardar:', error.message);
  } catch (e) {
    console.error('[equipos] error:', e.message);
  }
}
