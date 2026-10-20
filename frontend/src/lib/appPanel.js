// Convierte /panel en una app instalable (PWA) sin afectar al sitio público:
// el archivo de instalación, los íconos y el service worker solo se activan cuando alguien
// abre el panel, así los visitantes de la página pública nunca reciben la oferta de instalar.
// Devuelve una función que deshace los cambios del <head> (el service worker queda registrado).
export function activarAppPanel() {
  const agregados = [];
  const agregar = (etiqueta, atributos) => {
    const el = document.createElement(etiqueta);
    Object.entries(atributos).forEach(([k, v]) => el.setAttribute(k, v));
    document.head.appendChild(el);
    agregados.push(el);
  };

  agregar('link', { rel: 'manifest', href: '/panel.webmanifest' });
  agregar('link', { rel: 'apple-touch-icon', href: '/icons/apple-touch-icon.png' });
  agregar('meta', { name: 'apple-mobile-web-app-capable', content: 'yes' });
  agregar('meta', { name: 'apple-mobile-web-app-title', content: 'El Pinar Panel' });
  agregar('meta', { name: 'apple-mobile-web-app-status-bar-style', content: 'black' });

  // La barra del celular toma el azul oscuro del panel mientras se usa.
  const tema = document.querySelector('meta[name="theme-color"]');
  const temaAntes = tema ? tema.getAttribute('content') : null;
  if (tema) tema.setAttribute('content', '#0C1E2E');

  if (import.meta.env.PROD && 'serviceWorker' in navigator) {
    navigator.serviceWorker.register('/panel-sw.js', { scope: '/panel' }).catch(() => {
      /* sin service worker la app igual funciona: solo no guarda archivos para abrir más rápido */
    });
  }

  return () => {
    agregados.forEach((el) => el.remove());
    if (tema && temaAntes !== null) tema.setAttribute('content', temaAntes);
  };
}
