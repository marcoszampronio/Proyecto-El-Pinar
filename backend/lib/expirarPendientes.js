import { supabaseAdmin } from './supabaseAdmin.js';

// Una reserva "pendiente" pasa por dos etapas:
//
// 1) GUARDADA (la persona apretó "Continuar" pero todavía no "Enviar WhatsApp"):
//    el turno se le guarda solo unos minutos. Si no aprieta WhatsApp, se libera.
//    Configurable con HOLD_SIN_WHATSAPP_MIN (minutos, 10 por defecto).
// 2) FIRME (apretó "Enviar WhatsApp"): el turno queda reservado hasta que Mateo
//    lo confirme o lo cancele a mano. Como por ahora no se trabaja con transferencias,
//    NO se libera solo (VENCIMIENTO_FIRME_MIN=0, el valor por defecto). Si algún día
//    se quiere de nuevo un vencimiento automático, poner los minutos en esa variable
//    (contados desde que se creó la reserva).
export const MINUTOS_HOLD_SIN_WHATSAPP = Number(process.env.HOLD_SIN_WHATSAPP_MIN || 10);
export const MINUTOS_VENCIMIENTO_FIRME = Number(process.env.VENCIMIENTO_FIRME_MIN || 0);

// aplicarFiltros recibe el "update" ya armado y le agrega las condiciones.
async function cancelar(aplicarFiltros, motivo) {
  const { data, error } = await aplicarFiltros(
    supabaseAdmin.from('reservations').update({
      status: 'cancelada',
      cancelled_at: new Date().toISOString(),
      cancelled_by: motivo, // siempre empieza con "sistema": el panel lo muestra como "se liberó solo"
    })
  ).select('code');

  if (error) {
    console.error('[expirarPendientes] error:', error.message);
    return;
  }
  if (data && data.length) {
    console.log(`[expirarPendientes] ${data.length} reserva(s) liberada(s) (${motivo}):`, data.map((r) => r.code).join(', '));
  }
}

export async function expirarPendientesVencidas() {
  const ahora = Date.now();
  const limiteGuardada = new Date(ahora - MINUTOS_HOLD_SIN_WHATSAPP * 60 * 1000).toISOString();

  // Etapa 1: guardadas que nunca apretaron "Enviar WhatsApp".
  await cancelar(
    (q) => q.eq('status', 'pendiente').is('whatsapp_enviado_at', null).lt('created_at', limiteGuardada),
    'sistema (no envió WhatsApp)'
  );

  // Etapa 2 (apagada por defecto): firmes que nunca mandaron el comprobante.
  if (MINUTOS_VENCIMIENTO_FIRME > 0) {
    const limiteFirme = new Date(ahora - MINUTOS_VENCIMIENTO_FIRME * 60 * 1000).toISOString();
    await cancelar(
      (q) => q.eq('status', 'pendiente').not('whatsapp_enviado_at', 'is', null).lt('created_at', limiteFirme),
      'sistema (sin comprobante)'
    );
  }
}
