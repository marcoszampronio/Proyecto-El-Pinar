// Service worker del PANEL (app instalable). Se registra solo desde /panel y con alcance /panel.
// Regla de oro: NUNCA toca datos. Todo lo que no sea de este mismo sitio (la API de Render, Supabase,
// la sesión) va directo a la red, sin pasar por acá. Solo guarda archivos estáticos para que abra rápido.
const CACHE = 'elpinar-panel-v1';
const PANTALLA = '/panel';

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (evento) => {
  evento.waitUntil((async () => {
    for (const k of await caches.keys()) {
      if (k.startsWith('elpinar-panel-') && k !== CACHE) await caches.delete(k);
    }
    await self.clients.claim();
  })());
});

// ---- Avisos push ----
// El servidor manda { titulo, texto, tag, url, badge }. Sin datos sensibles: solo cancha, día y hora.
self.addEventListener('push', (evento) => {
  let d = {};
  try { d = evento.data ? evento.data.json() : {}; } catch { /* aviso sin datos */ }
  evento.waitUntil((async () => {
    // El número del ícono de la app (reservas por confirmar), donde el sistema lo permite.
    if (typeof d.badge === 'number' && self.navigator && 'setAppBadge' in self.navigator) {
      try { await (d.badge > 0 ? self.navigator.setAppBadge(d.badge) : self.navigator.clearAppBadge()); } catch { /* sin soporte */ }
    }
    await self.registration.showNotification(d.titulo || 'Reserva nueva', {
      body: d.texto || '',
      icon: '/icons/icon-192.png',
      tag: d.tag || 'reserva',
      renotify: true,
      data: { url: d.url || '/panel' },
    });
  })());
});

// Tocar el aviso: abre (o trae al frente) el panel en la pantalla de "Confirmar".
self.addEventListener('notificationclick', (evento) => {
  evento.notification.close();
  const destino = new URL((evento.notification.data && evento.notification.data.url) || '/panel', self.location.origin).href;
  evento.waitUntil((async () => {
    const abiertas = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const panel = abiertas.find((c) => new URL(c.url).pathname.startsWith('/panel'));
    if (panel) {
      await panel.focus();
      if ('navigate' in panel) { try { await panel.navigate(destino); } catch { /* queda donde estaba */ } }
      return;
    }
    await self.clients.openWindow(destino);
  })());
});

self.addEventListener('fetch', (evento) => {
  const pedido = evento.request;
  if (pedido.method !== 'GET') return;
  const url = new URL(pedido.url);
  if (url.origin !== self.location.origin) return; // API / Supabase / terceros: directo a la red

  // Abrir la app: siempre la versión más nueva; sin internet, la última pantalla guardada.
  if (pedido.mode === 'navigate') {
    evento.respondWith(
      fetch(pedido)
        .then((resp) => {
          if (resp.ok) { const copia = resp.clone(); caches.open(CACHE).then((c) => c.put(PANTALLA, copia)); }
          return resp;
        })
        .catch(async () => (await caches.match(PANTALLA)) || Response.error())
    );
    return;
  }

  // Archivos estáticos con nombre único por versión (assets), íconos y fuentes: del caché si están.
  if (/^\/(assets|icons|fonts)\//.test(url.pathname)) {
    evento.respondWith((async () => {
      const cache = await caches.open(CACHE);
      const guardado = await cache.match(pedido);
      const red = fetch(pedido)
        .then((resp) => { if (resp.ok) cache.put(pedido, resp.clone()); return resp; })
        .catch(() => guardado);
      return guardado || red;
    })());
  }
});
