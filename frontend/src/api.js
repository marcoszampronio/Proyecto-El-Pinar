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

// fetch tira "Failed to fetch" cuando el backend no esta levantado.
async function pedir(url, options) {
  try {
    return await fetch(url, options);
  } catch {
    throw new Error(`No pudimos conectarnos con el servidor (${API_URL}). Verificá que el backend esté corriendo con npm run dev.`);
  }
}

async function requestPublico(path, options = {}) {
  const res = await pedir(`${API_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
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
};
