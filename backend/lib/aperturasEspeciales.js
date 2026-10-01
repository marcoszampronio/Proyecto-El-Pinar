import { supabaseAdmin } from './supabaseAdmin.js';
import { esDiaHabilitado } from './codeGenerator.js';

// Días de semana que se pueden abrir puntualmente (1=Lunes, 5=Viernes).
// Sábado/domingo quedan afuera de esta primera versión.
const DIAS_APERTURA_PERMITIDOS = [1, 5];

export function esDiaDeAperturaPermitido(fechaISO) {
  const d = new Date(fechaISO + 'T00:00:00');
  return DIAS_APERTURA_PERMITIDOS.includes(d.getDay());
}

// true si ese día ya está habilitado normalmente, o si Mateo lo abrió
// puntualmente con una apertura especial.
export async function esFechaAbierta(fechaISO) {
  if (esDiaHabilitado(fechaISO)) return true;
  const { data } = await supabaseAdmin
    .from('aperturas_especiales')
    .select('id')
    .eq('reservation_date', fechaISO)
    .maybeSingle();
  return !!data;
}

export async function listarAperturasEspeciales({ desde, hasta } = {}) {
  let q = supabaseAdmin.from('aperturas_especiales').select('*').order('reservation_date');
  if (desde) q = q.gte('reservation_date', desde);
  if (hasta) q = q.lte('reservation_date', hasta);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return data;
}

export async function crearAperturaEspecial({ date, nota, createdBy }) {
  const { data, error } = await supabaseAdmin
    .from('aperturas_especiales')
    .insert({ reservation_date: date, nota: nota || null, created_by: createdBy || null })
    .select()
    .single();
  if (error) throw new Error(error.code === '23505' ? 'Ese día ya está marcado como abierto.' : error.message);
  return data;
}

export async function quitarAperturaEspecial(id) {
  const { error } = await supabaseAdmin.from('aperturas_especiales').delete().eq('id', id);
  if (error) throw new Error(error.message);
}
