import { enviarPush } from './push.js';
import { enviarAlertaMail } from './mailer.js';
import 'dotenv/config';

// Alertas de fallas del sistema: llegan SOLO al mantenedor (no a Mateo ni al equipo),
// por mail y por aviso al celular (a los dispositivos de ese usuario del panel).
// Nunca lanzan error ni frenan lo que estaba pasando.
export const ALERTAS_EMAIL = (process.env.ALERTAS_EMAIL || 'jmarcoszampronio@gmail.com').trim().toLowerCase();

const ESPERA_MISMO_ERROR_MS = 60 * 60 * 1000; // el mismo tipo de falla avisa como mucho 1 vez por hora
const MAX_POR_HORA = 6;                        // y nunca más de 6 alertas por hora en total
const ultimoAviso = new Map();
let enLaHora = [];

const horaART = () => new Date().toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', hour12: false });
const escapar = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

// tipo: identifica la falla (ej. "http:POST /api/admin/confirm/:code") para no repetir el aviso.
// mail: false cuando la falla es del propio mail (no tiene sentido avisar por mail).
export async function alertar({ tipo, titulo, detalle = '', mail = true }) {
  try {
    const ahora = Date.now();
    if (ahora - (ultimoAviso.get(tipo) || 0) < ESPERA_MISMO_ERROR_MS) return { omitida: 'repetida' };
    enLaHora = enLaHora.filter((t) => ahora - t < ESPERA_MISMO_ERROR_MS);
    if (enLaHora.length >= MAX_POR_HORA) return { omitida: 'tope por hora' };
    ultimoAviso.set(tipo, ahora);
    enLaHora.push(ahora);

    const corto = String(detalle).replace(/\s+/g, ' ').trim().slice(0, 180);
    const tareas = [
      enviarPush(
        { titulo: 'Falla en El Pinar', texto: `${titulo}${corto ? ` — ${corto}` : ''}`.slice(0, 220), tag: `alerta-${tipo}`.slice(0, 80), url: '/panel?tab=stats' },
        { email: ALERTAS_EMAIL, limiteMs: 3000 }
      ),
    ];
    if (mail) {
      tareas.push(
        enviarAlertaMail({
          to: ALERTAS_EMAIL,
          asunto: `Falla en El Pinar: ${titulo}`,
          html: `
            <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:20px;">
              <h2 style="margin-top:0;color:#B3402A;">Falla en El Pinar</h2>
              <p><strong>${escapar(titulo)}</strong></p>
              <p style="background:#f6f4ea;border-radius:8px;padding:12px;color:#333;white-space:pre-wrap;">${escapar(detalle || 'Sin más detalle.')}</p>
              <p style="color:#777;font-size:12px;">${horaART()} (hora de Argentina). Si se repite, este aviso no vuelve a llegar durante 1 hora. Los detalles completos están en los registros de Render.</p>
            </div>`,
        }).catch((e) => console.error('[alertas] no se pudo mandar el mail:', e.message))
      );
    }
    await Promise.allSettled(tareas);
    return { enviada: true };
  } catch (e) {
    console.error('[alertas] error:', e.message);
    return { error: e.message };
  }
}
