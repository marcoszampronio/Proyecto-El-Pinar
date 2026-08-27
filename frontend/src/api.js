import { supabase } from './supabaseClient';

const API_URL = import.meta.env.VITE_API_URL;

async function tokenAdmin() {
  const { data } = await supabase.auth.getSession();
  return data?.session?.access_token || null;
}

async function requestPublico(path, options = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error de conexion.');
  return data;
}

async function requestAdmin(path, options = {}) {
  const token = await tokenAdmin();
  const res = await fetch(`${API_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    ...options,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error de conexion.');
  return data;
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
