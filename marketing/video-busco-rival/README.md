# Video "Busco rival" (animado, sin grabar pantalla)

Video vertical 1080×1920, 27 s, sin audio, estilo claro de `marketing/ESTILO-PROXIMOS-VIDEOS.md`.
La interfaz del sitio está **recreada en HTML/GSAP** (no es captura de pantalla), con datos de ejemplo
(equipos inventados, sin teléfonos reales).

Guion: 1) problema: chat del equipo, "Partido suspendido" · 2) cae la mascota "¿Buscás rival?" ·
3) Paso 1: reserva y marca "Estoy buscando rival" (equipo + categoría) · 4) Paso 2: el equipo aparece
en la grilla (Mar/Mié/Jue × 20:30/21:30/22:30) · 5) Paso 3: otro equipo toca "Me interesa" y escribe por
WhatsApp, "¡MATCH!" · cierre "Rival para tu partido, en 2 toques." + "Link en la bio".

Para renderizar: carpeta HyperFrames con `index.html` (= `composicion.html`), `assets/grain.png`,
`vendor/gsap.min.js` y `vendor/fonts/` (DM Serif Display, Satoshi), y `npx hyperframes render -o rival.mp4`.
Los cursores se posicionan leyendo el layout (`P(el)`), así que si se cambia el diseño de las tarjetas el cursor las sigue solo.

## Versiones
- **Larga (27 s)**: `composicion.html`.
- **Stories (15 s)**: `composicion-stories.html`. Más corta (sin sticker de chat extra, tipeo y tiempos más rápidos) y con el celular más chico y los textos corridos a la zona segura (Instagram tapa ~250 px arriba y ~340 px abajo).
- Las dos usan fondo azul pino (`#0F2436` → `#14304A`) con grilla fina; titulares en crema con la palabra clave en caja dorada.
