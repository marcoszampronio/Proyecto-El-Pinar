// Avisos al celular (push) del panel. Todo pasa por el service worker del panel (/panel-sw.js).
// iPhone: solo funciona con el panel agregado a la pantalla de inicio (iOS 16.4 o más) y el permiso
// se pide con un toque del usuario, por eso `activarPush` se llama desde un botón.
import { api } from '../api';

const esIOS = () => /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const instalada = () => window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;

function aUint8(base64) {
  const relleno = '='.repeat((4 - (base64.length % 4)) % 4);
  const bin = atob((base64 + relleno).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from([...bin].map((c) => c.charCodeAt(0)));
}

async function registro() {
  let reg = await navigator.serviceWorker.getRegistration('/panel');
  if (!reg) reg = await navigator.serviceWorker.register('/panel-sw.js', { scope: '/panel' });
  await navigator.serviceWorker.ready;
  return reg;
}

// 'iphone-sin-instalar' | 'no-soportado' | 'sin-configurar' | 'bloqueado' | 'sin-activar' | 'activado'
export async function estadoPush() {
  const soporta = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  if (!soporta) return esIOS() && !instalada() ? 'iphone-sin-instalar' : 'no-soportado';
  try {
    const { configurado } = await api.adminPushEstado();
    if (!configurado) return 'sin-configurar';
  } catch {
    return 'sin-activar';
  }
  if (Notification.permission === 'denied') return 'bloqueado';
  const reg = await navigator.serviceWorker.getRegistration('/panel');
  const sub = reg ? await reg.pushManager.getSubscription() : null;
  return sub && Notification.permission === 'granted' ? 'activado' : 'sin-activar';
}

export async function activarPush() {
  const permiso = await Notification.requestPermission(); // tiene que ser a partir de un toque
  if (permiso !== 'granted') return permiso === 'denied' ? 'bloqueado' : 'sin-activar';
  const reg = await registro();
  const { clave } = await api.adminPushEstado();
  let sub = await reg.pushManager.getSubscription();
  if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: aUint8(clave) });
  await api.adminPushSuscribir(sub.toJSON());
  return 'activado';
}

export async function desactivarPush() {
  const reg = await navigator.serviceWorker.getRegistration('/panel');
  const sub = reg ? await reg.pushManager.getSubscription() : null;
  if (sub) {
    await api.adminPushBaja({ endpoint: sub.endpoint }).catch(() => {});
    await sub.unsubscribe();
  }
  return 'sin-activar';
}

export const probarPush = () => api.adminPushPrueba();

// Número sobre el ícono de la app: reservas por confirmar. El color lo decide el sistema (no se puede cambiar).
export function numeroEnIcono(n) {
  try {
    if (!('setAppBadge' in navigator)) return;
    if (n > 0) navigator.setAppBadge(n); else navigator.clearAppBadge();
  } catch { /* sin soporte: no pasa nada */ }
}
