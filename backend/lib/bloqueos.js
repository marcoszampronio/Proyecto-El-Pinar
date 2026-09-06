import { supabaseAdmin } from './supabaseAdmin.js';

// Trae los bloqueos activos de una fecha.
export async function obtenerBloqueosDelDia(date) {
  const { data, error } = await supabaseAdmin
    .from('bloqueos')
    .select('*')
    .eq('reservation_date', date);
  if (error) return { bloqueos: [], error };
  return { bloqueos: data, error: null };
}

// Un bloqueo aplica a un slot si su court/turn coinciden o son NULL (comodin).
// court 'FUT' = las dos canchas de futbol (C1 y C2), el padel queda libre.
export function estaBloqueado(bloqueos, court, turn = null) {
  return bloqueos.some((b) => {
    const matchCourt =
      !b.court ||
      b.court === court ||
      (b.court === 'FUT' && (court === 'C1' || court === 'C2'));
    const matchTurn = !b.turn || b.turn === turn;
    return matchCourt && matchTurn;
  });
}
