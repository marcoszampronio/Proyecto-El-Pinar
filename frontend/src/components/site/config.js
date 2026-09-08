// Datos de contacto del complejo. Cuando estén los definitivos, cambiar acá
// (o setear las variables VITE_* en Cloudflare y no tocar el código).

// Número de WhatsApp de El Pinar, formato internacional sin signos: 549 + área + número.
export const WHATSAPP = import.meta.env.VITE_WHATSAPP || '5493435134744';
export const WA_URL = `https://wa.me/${WHATSAPP}`;

export const IG_URL = import.meta.env.VITE_IG_URL || 'https://www.instagram.com/elpinarcomplejo/';
export const MAPS_URL = import.meta.env.VITE_MAPS_URL || 'https://maps.app.goo.gl/iwggmLmbxJggAMPP7';

// Imagen del mapa para "Cómo llegar". Guardar el archivo en frontend/public/
// con este nombre. Si no está, se muestra un mapa dibujado como fallback.
export const MAPA_IMG = '/mapa-elpinar.jpg';
