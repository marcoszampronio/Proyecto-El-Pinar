import { supabaseAdmin } from './supabaseAdmin.js';

const MINUTOS_PARA_VENCER = 60;

// Cancela las reservas que quedaron en "pendiente" y nunca se confirmaron
// (el cliente no mando el comprobante). Asi el horario vuelve a quedar libre.
export async function expirarPendientesVencidas() {
  const limite = new Date(Date.now() - MINUTOS_PARA_VENCER * 60 * 1000).toISOString();

  const { data, error } = await supabaseAdmin
    .from('reservations')
    .update({
      status: 'cancelada',
      cancelled_at: new Date().toISOString(),
      cancelled_by: 'sistema (sin comprobante)',
    })
    .eq('status', 'pendiente')
    .lt('created_at', limite)
    .select('code');

  if (error) {
    console.error('[expirarPendientes] error:', error.message);
    return;
  }
  if (data && data.length) {
    console.log(`[expirarPendientes] ${data.length} reserva(s) vencida(s):`, data.map((r) => r.code).join(', '));
  }
}
