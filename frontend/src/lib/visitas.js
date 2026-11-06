// Conteo de visitas a la página pública. Anónimo y sin cookies: un código al azar por navegador y una visita por sesión.
// No cuenta los navegadores donde se abrió el panel (el equipo): al abrirlo se los marca como "internos".
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

// Alguien tocó "Me interesa" para escribirle a un equipo que busca rival (rival = fila de la lista pública de rivales).
// Solo cuenta el toque; misma regla que las visitas: anónimo, y no cuenta al equipo ni las pruebas en la compu.
export function registrarToqueRival(rival) {
  try {
    if (import.meta.env.DEV) return;
    if (esInterno() || navigator.webdriver || /bot|crawl|spider|lighthouse|headless/i.test(navigator.userAgent)) return;
    if (!rival || !rival.reservation_date || !rival.start_time || !rival.court) return;
    let v = localStorage.getItem('elpinar-v');
    if (!v) {
      v = crypto.randomUUID ? crypto.randomUUID() : String(Math.random()).slice(2) + Date.now();
      localStorage.setItem('elpinar-v', v);
    }
    api.registrarToqueRival({ f: rival.reservation_date, h: rival.start_time, c: rival.court, v }).catch(() => {});
  } catch { /* contar nunca debe romper la página */ }
}

export function registrarVisita() {
  try {
    if (import.meta.env.DEV) return; // las pruebas en la compu no cuentan
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
