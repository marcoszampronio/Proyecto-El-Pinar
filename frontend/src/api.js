import { supabase } from './supabaseClient';

// Debe apuntar al backend incluyendo /api (ej: http://localhost:3001/api).
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

async function tokenAdmin() {
  const { data } = await supabase.auth.getSession();
  return data?.session?.access_token || null;
}

// Lee la respuesta aunque el servidor devuelva HTML o este caido,
// para que el usuario vea un mensaje entendible y no un error de parseo.
async function leerRespuesta(res) {
  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  if (!res.ok) {
    throw new Error(data?.error || 'No pudimos conectarnos con el servidor. Probá de nuevo en unos minutos.');
  }
  if (!data) throw new Error('Respuesta invalida del servidor.');
  return data;
}

const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

// El backend gratis de Render se "duerme" tras 15 min sin uso y tarda ~40-60s
// en despertar (mientras tanto la request puede colgarse o devolver 502/503).
// Por eso reintentamos con paciencia antes de mostrar un error.
async function pedir(url, options, { reintentos = 4, esperaMs = 4000, reintentarRed = true } = {}) {
  for (let intento = 0; ; intento++) {
    try {
      const res = await fetch(url, options);
      // 502/503/504 = el proxy de Render respondió antes de llegar a la app
      // (backend arrancando): reintentar siempre, no hubo procesamiento.
      if ([502, 503, 504].includes(res.status) && intento < reintentos) {
        await dormir(esperaMs);
        continue;
      }
      return res;
    } catch (e) {
      // Error de red: reintentar solo si es seguro (GET). En un POST el pedido
      // podría haber llegado igual, así que no reintentamos a ciegas.
      if (reintentarRed && intento < reintentos) {
        await dormir(esperaMs);
        continue;
      }
      throw new Error('No pudimos conectarnos con el servidor. Esperá unos segundos y recargá la página.');
    }
  }
}

async function requestPublico(path, options = {}) {
  const esPost = (options.method || 'GET').toUpperCase() !== 'GET';
  const res = await pedir(
    `${API_URL}${path}`,
    { headers: { 'Content-Type': 'application/json' }, ...options },
    { reintentarRed: !esPost }
  );
  return leerRespuesta(res);
}

async function requestAdmin(path, options = {}) {
  const token = await tokenAdmin();
  const res = await pedir(`${API_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    ...options,
  });
  return leerRespuesta(res);
}

export const api = {
  disponibilidadFutbol: (court, date) =>
    requestPublico(`/availability/futbol?court=${court}&date=${date}`),

  disponibilidadPadel: (date) =>
    requestPublico(`/availability/padel?date=${date}`),

  // cuántas parrillas quedan para esa fecha (capacidad total: 2)
  disponibilidadParrilla: (date) =>
    requestPublico(`/availability/parrilla?date=${date}`),

  reservarFutbol: (payload) =>
    requestPublico('/reservations/futbol', { method: 'POST', body: JSON.stringify(payload) }),

  reservarPadel: (payload) =>
    requestPublico('/reservations/padel', { method: 'POST', body: JSON.stringify(payload) }),

  rivales: () => requestPublico('/rivals'),

  adminBuscar: (code) => requestAdmin(`/admin/search/${encodeURIComponent(code)}`),
  adminConfirmar: (code) => requestAdmin(`/admin/confirm/${encodeURIComponent(code)}`, { method: 'POST' }),
  adminCancelar: (code) => requestAdmin(`/admin/cancel/${encodeURIComponent(code)}`, { method: 'POST' }),
  adminPendientes: () => requestAdmin('/admin/pending'),
  adminStats: (dias = 7) => requestAdmin(`/admin/stats?dias=${dias}`),
  adminContactos: () => requestAdmin('/admin/contactos'),
  adminBackupAhora: () => requestAdmin('/admin/export/backup-ahora', { method: 'POST' }),
  adminAgenda: (date) => requestAdmin(`/admin/agenda/${date}`),
  adminReservasDelDia: (date) => requestAdmin(`/admin/dia/${date}`),
  adminSuspenderPorLluvia: (date) =>
    requestAdmin(`/admin/suspender/${date}`, { method: 'POST' }),
};
