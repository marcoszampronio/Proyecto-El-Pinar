// Conteo de visitas a la página pública. Anónimo y sin cookies: un código al azar por navegador y una visita por sesión.
// NO cuenta a quienes trabajan en el panel (Mateo, el equipo, el mantenedor): se marca el navegador como "interno"
// al abrir el panel, o al abrir la página una vez con ?interno=1 (sirve para el celular que no entra al panel).
import { api } from '../api';

const CLAVE_INTERNO = 'elpinar-interno';

export function marcarComoInterno() {
  try { localStorage.setItem(CLAVE_INTERNO, '1'); } catch { /* sin almacenamiento: no pasa nada */ }
}

function esInterno() {
  try {
    if (localStorage.getItem(CLAVE_INTERNO)) return true;
    // si en este navegador hay una sesión iniciada del panel, también es interno
    return Object.keys(localStorage).some((k) => /^sb-.+-auth-token$/.test(k));
  } catch { return false; }
}

function origenDeLaVisita() {
  const p = new URLSearchParams(location.search);
  const utm = p.get('utm_source');
  if (utm) return utm.toLowerCase();
  try {
    const host = new URL(document.referrer).hostname.replace(/^www\./, '');
    if (host && host !== location.hostname) return host;
  } catch { /* sin referrer */ }
  return 'directo';
}

export function registrarVisita() {
  try {
    if (import.meta.env.DEV) return; // las pruebas en la compu no cuentan
    const p = new URLSearchParams(location.search);
    if (p.get('interno') === '1') { marcarComoInterno(); return; }
    if (esInterno() || navigator.webdriver || /bot|crawl|spider|lighthouse|headless/i.test(navigator.userAgent)) return;
    if (sessionStorage.getItem('elpinar-visita')) return; // una visita por sesión
    sessionStorage.setItem('elpinar-visita', '1');

    let v = localStorage.getItem('elpinar-v');
    if (!v) {
      v = crypto.randomUUID ? crypto.randomUUID() : String(Math.random()).slice(2) + Date.now();
      localStorage.setItem('elpinar-v', v);
    }
    api.registrarVisita({ v, o: origenDeLaVisita() }).catch(() => {});
  } catch { /* contar visitas nunca debe romper la página */ }
}
