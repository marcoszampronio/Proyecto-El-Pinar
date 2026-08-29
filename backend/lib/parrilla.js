import { supabaseAdmin } from './supabaseAdmin.js';
import { CAPACIDAD_PARRILLA } from './codeGenerator.js';

// Cuenta cuántas reservas con parrilla activa hay para una fecha.
// Si la columna todavía no existe (migración sin correr) devuelve columnaFalta: true.
export async function contarParrillas(date) {
  const { count, error } = await supabaseAdmin
    .from('reservations')
    .select('id', { count: 'exact', head: true })
    .eq('reservation_date', date)
    .eq('parrilla', true)
    .neq('status', 'cancelada');

  if (error) {
    // La única falla realista de esta consulta es que la columna 'parrilla'
    // todavía no exista (migración sin correr).
    console.warn('[parrilla] no se pudo contar (¿falta la migración?):', error.message || error.code || error);
    return { count: 0, error: null, columnaFalta: true };
  }
  return { count: count || 0, error: null, columnaFalta: false };
}

// Cuenta reservas con parrilla activa en un rango de fechas [desde, hasta).
// Tolerante a que la columna no exista todavía.
export async function contarParrillasRango(desde, hasta) {
  const { count, error } = await supabaseAdmin
    .from('reservations')
    .select('id', { count: 'exact', head: true })
    .gte('reservation_date', desde)
    .lt('reservation_date', hasta)
    .eq('parrilla', true)
    .neq('status', 'cancelada');

  if (error) return 0;
  return count || 0;
}

// Devuelve un mensaje de error si no quedan parrillas para esa fecha, o null si hay.
export async function validarParrillaDisponible(date) {
  const { count, error, columnaFalta } = await contarParrillas(date);
  if (columnaFalta) {
    return { error: 'La parrilla todavía no está habilitada. Avisá al complejo.' };
  }
  if (error) return { error: error.message };
  if (count >= CAPACIDAD_PARRILLA) {
    return { error: `No quedan parrillas disponibles para esa fecha (hay ${CAPACIDAD_PARRILLA}).` };
  }
  return { error: null };
}
