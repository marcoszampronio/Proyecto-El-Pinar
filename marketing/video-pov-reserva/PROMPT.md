# Video "Así se reserva" (POV de alguien reservando) — prompt y receta

**Versión actual: v5** (21 de octubre 2026): sin audio, estilo claro de `ESTILO-PROXIMOS-VIDEOS.md` (fondo crema con grilla, celular de marco navy grueso con sombra dorada dura, titulares Satoshi Bold con la palabra clave en caja dorada, stickers "PASO N"), 29 s, sin chat simulado, grabado cuadro por cuadro (30 fps, 2x) para que sea fluido. `grabar-recorrido.mjs` y `composicion.html` son los de v5; lo que sigue describe v4 (referencia histórica), salvo música/chat que v5 ya no usa.

Grabador v5: tiempo virtual de Chrome (CDP `Emulation.setVirtualTimePolicy`), un `Page.captureScreenshot` por cuadro con `clip.y = scrollY` y `scale:2`; los eventos de entrada se despachan con el tiempo en marcha y se vuelve a pausar; se precargan las imágenes del modal. Codificar: `ffmpeg -framerate 30 -i frames/%05d.jpg -vf scale=660:1350:flags=lanczos,unsharp=5:5:0.5:5:5:0 -c:v libx264 -crf 14 -pix_fmt yuv420p -an assets/pov.mp4`.

Versión anterior: **v4** (19 de octubre 2026, sobre el sitio ya rediseñado). Es el video de ~44 s, vertical (1080×1920, para Reels / Stories),
que simula a una persona entrando al sitio, reservando una cancha y mandando el WhatsApp.
Gustó mucho; este archivo sirve para rehacerlo o variarlo (otro día, otro texto, otra música).

---

## 1. El prompt (copiar y pegar a Claude)

> Armá un video vertical (1080×1920, ~44 s) de El Pinar que muestre, como un POV, cómo una persona
> reserva una cancha en la página. Tiene que verse como un celular de verdad (proporción alta y angosta, ~660 px de pantalla en el video;
> v3 lo hizo más ancho y parecía una tablet), con el recorrido REAL del sitio grabado, no una maqueta inventada.
>
> **Estructura y tiempos**
> - 0–3 s, intro: "Así se reserva una cancha *en El Pinar.*" (sobre fondo azul oscuro con el pino de marca).
> - 3,9–10,5 s, **Paso 1** "Entrás a la página y bajás hasta Reservar": se ve la portada y un scroll suave hasta la sección de reservas.
> - 10,5–18,2 s, **Paso 2** "Elegís cancha, día y horario": toca el miércoles (ya visible en la tira de días) y un turno libre de la Cancha 2.
> - 18,2–28,5 s, **Paso 3** "Completás tus datos": se abre el formulario (modal tipo ticket) y escribe, letra por letra, nombre y teléfono (el sitio ya no pide email); toca Continuar y aparece "¡Ya casi!" con el resumen y el botón verde de WhatsApp.
> - 28,5–37,2 s, **Paso 4** "Enviás tu reserva por WhatsApp": toca "Enviar WhatsApp", se abre un chat con el mensaje ya armado, toca enviar, y llega la respuesta del complejo confirmando el turno.
> - 37,4–44 s, cierre: "Mirá qué *fácil* que es." + pino + "El Pinar" + botón "Reservá tu cancha" + "Link en la bio".
>
> **Cursor:** una flecha de mouse blanca con borde oscuro y sombra (NO un círculo amarillo). Al tocar,
> la flecha se achica un poco y sale un anillo blanco que se expande y se desvanece.
>
> **Textos de paso:** arriba, centrados, con "PASO N" chico en dorado y el título grande en DM Serif Display;
> debajo, 4 puntitos de progreso (el activo se alarga y se pone dorado).
>
> **Estilo:** paleta del sitio (navy `#0F2436`/fondo degradado oscuro, dorado `#F2C14E`, crema `#F3EEE1`),
> DM Serif Display para títulos (con la palabra clave en cursiva dorada) y Satoshi para texto/UI.
> Grano sutil encima (estándar anti-banding). Brillo dorado + destello que cruza en el cierre.
>
> **Música:** guitarra acústica alegre, volumen medio, que baja al final. Sin voz.
>
> **Importante:** grabar el sitio real con la API simulada, para NO crear reservas ni mandar mails.
> El chat de WhatsApp es un diseño propio (oscuro, burbuja verde) con el mismo texto que arma el backend.

---

## 2. Cómo se hizo (receta técnica)

1. **Grabar el recorrido del sitio real** con Playwright (`grabar-recorrido.mjs`):
   - Viewport **540×1170** (proporción de celular real; el sitio sigue en versión celular hasta 620 px de ancho; Playwright graba a 1x, así que no se puede grabar más chico y escalar sin perder nitidez).
   - Se intercepta `**/api/**` y se responden datos de prueba (todo libre; el POST de reserva devuelve una reserva de mentira) → no se toca la base ni se manda nada a Mateo.
   - Cursor falso inyectado con `addInitScript` (flecha SVG + anillo de clic), movimiento con easing, scroll suave con `requestAnimationFrame`, tipeo humano (`keyboard.type` con delay).
   - Los toques del final se hacen "a medias": el video corta antes del clic real en "Enviar WhatsApp" (el chat lo reemplaza un diseño propio).
   - El script imprime marcas de tiempo (`landing`, `board`, `dia`, `turno`, `confirmacion`, …) para sincronizar los textos de cada paso.
2. **Recortar y escalar** el clip: arrancar cuando aparece el contenido (~1,5 s), durar ~27,4 s, pasar a **660×1430** con `lanczos` + `unsharp` (altura par obligatoria para h264):
   ```bash
   ffmpeg -ss 1.55 -i pov-raw.webm -t 27.4 -vf "fps=30,scale=660:1430:flags=lanczos,unsharp=5:5:0.6:5:5:0" \
     -c:v libx264 -crf 14 -preset slow -pix_fmt yuv420p -an assets/pov.mp4
   ```
3. **Componer en HyperFrames** (`composicion.html`): fondo + pino, intro, celular (680×1450, pantalla 660×1430) con el `<video>` adentro, 4 textos de paso con sus puntitos, chat de WhatsApp (con cursor propio), cierre. Un solo timeline GSAP; el video entra a los 3,6 s (marcas que imprime el script, relativas al recorte: scroll 1,4 s, tabla 6,9 s, turno 13,4 s, confirmación 25,1 s).
   Validar con `npx hyperframes check` y renderizar con `npx hyperframes render -o pov.mp4` (~3,5 min).
4. **Assets que necesita la carpeta del proyecto HyperFrames** (no están en el repo por peso/licencia):
   `assets/pov.mp4`, `assets/music/track.mp3`, `assets/grain.png` (ruido 256×256), `vendor/gsap.min.js`,
   `vendor/fonts/` (DM Serif Display regular/italic y Satoshi 400/500/700, copiadas de `frontend/public/fonts`).

## 3. Música usada

- **v3 (actual):** Adobe Stock *"Acoustic Guitar Happy"* (id `511566836`, gratis). Se usó el primer minuto (50 s).
- v2 (descartada, no gustó): *"Modern Inspirational Music Loop"* (id `675781788`).
- Para cambiarla: licenciar otro id gratuito de Adobe Stock y reemplazar `assets/music/track.mp3`.
  Volver a pedir un id ya licenciado no consume otra licencia.

## 4. Cosas a tener en cuenta

- **Alias y monto** que se ven en "¡Ya casi!" son de ejemplo (`elpinar.canchas.mp`, `$10.000`); si hace falta, poner los reales en la API simulada del script.
- Los textos del **chat** y la **respuesta del complejo** ("¡Listo, Juan! Tu turno quedó confirmado…") son de demostración.
- Si el sitio cambia (selectores `#reservar`, `.cancha-card`, `.dia-btn`, `.grilla-pub-celda`, `.tel-num`, textos "Continuar" / "Enviar WhatsApp"), hay que ajustar `grabar-recorrido.mjs`. En v4 ya se adaptó al rediseño de octubre (sin campo de email, sin flecha de semana).
- Para Reels de Instagram, el botón de enviar del chat queda cerca de la zona que tapa la app (abajo): revisar antes de publicar.
- Si se cambia el largo del recorrido, hay que reajustar los tiempos de los 4 pasos y del chat en `composicion.html` según las marcas que imprime el script.
