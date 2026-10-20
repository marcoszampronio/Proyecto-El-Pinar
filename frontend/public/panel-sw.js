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
