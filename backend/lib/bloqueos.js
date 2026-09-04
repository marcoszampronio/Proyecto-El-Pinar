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
export function estaBloqueado(bloqueos, court, turn = null) {
  return bloqueos.some((b) => (!b.court || b.court === court) && (!b.turn || b.turn === turn));
}
