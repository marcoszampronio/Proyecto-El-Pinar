# Video "Así se reserva" (POV de alguien reservando) — prompt y receta

Versión guardada: **v3** (octubre 2026). Es el video de ~50 s, vertical (1080×1920, para Reels / Stories),
que simula a una persona entrando al sitio, reservando una cancha y mandando el WhatsApp.
Gustó mucho; este archivo sirve para rehacerlo o variarlo (otro día, otro texto, otra música).

---

## 1. El prompt (copiar y pegar a Claude)

> Armá un video vertical (1080×1920, ~50 s) de El Pinar que muestre, como un POV, cómo una persona
> reserva una cancha en la página. Tiene que verse como la pantalla de un celular grande (que ocupe
> casi todo el ancho del video), con el recorrido REAL del sitio grabado, no una maqueta inventada.
>
> **Estructura y tiempos**
> - 0–3 s, intro: "Así se reserva una cancha *en El Pinar.*" (sobre fondo azul oscuro con el pino de marca).
> - 3–10,6 s, **Paso 1** "Entrás a la página y bajás hasta Reservar": se ve la portada y un scroll suave hasta la sección de reservas.
> - 10,6–20,4 s, **Paso 2** "Elegís cancha, día y horario": toca Fútbol 11, pasa a la semana siguiente, elige el miércoles y toca un turno libre de la Cancha 2.
> - 20,4–34,4 s, **Paso 3** "Completás tus datos": se abre el formulario y escribe, letra por letra, nombre, teléfono y email; toca Continuar y aparece "¡Ya casi!" con el alias y el resumen.
> - 34,4–43 s, **Paso 4** "Enviás tu reserva por WhatsApp": toca "Enviar WhatsApp", se abre un chat con el mensaje ya armado, toca enviar, y llega la respuesta del complejo confirmando el turno.
> - 43,4–50 s, cierre: "Mirá qué *fácil* que es." + pino + "El Pinar" + botón "Reservá tu cancha" + "Link en la bio".
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
   - Viewport **620×1197** (el sitio sigue en versión celular hasta 620 px de ancho; Playwright graba a 1x, así que no sirve usar un viewport más chico y escalar).
   - Se intercepta `**/api/**` y se responden datos de prueba (todo libre; el POST de reserva devuelve una reserva de mentira) → no se toca la base ni se manda nada a Mateo.
   - Cursor falso inyectado con `addInitScript` (flecha SVG + anillo de clic), movimiento con easing, scroll suave con `requestAnimationFrame`, tipeo humano (`keyboard.type` con delay).
   - Los toques del final se hacen "a medias": el video corta antes del clic real en "Enviar WhatsApp" (el chat lo reemplaza un diseño propio).
   - El script imprime marcas de tiempo (`landing`, `board`, `dia`, `turno`, `confirmacion`, …) para sincronizar los textos de cada paso.
2. **Recortar y escalar** el clip: arrancar cuando aparece el contenido (~2,7 s), durar ~33,5 s, pasar a **760×1468** con `lanczos` + `unsharp` (altura par obligatoria para h264):
   ```bash
   ffmpeg -ss 2.7 -i pov-raw.webm -t 33.5 -vf "fps=30,scale=760:1468:flags=lanczos,unsharp=5:5:0.7:5:5:0" \
     -c:v libx264 -crf 14 -preset slow -pix_fmt yuv420p -an assets/pov.mp4
   ```
3. **Componer en HyperFrames** (`composicion.html`): fondo + pino, intro, celular (780×1488, pantalla 760×1468) con el `<video>` adentro, 4 textos de paso con sus puntitos, chat de WhatsApp (con cursor propio), cierre. Un solo timeline GSAP; el video entra a los 3,6 s.
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
- Si el sitio cambia (selectores `.cancha-card`, `.dia-btn`, `.grilla-pub-celda`, `.tel-num`, textos "Continuar" / "Enviar WhatsApp"), hay que ajustar `grabar-recorrido.mjs`.
- Para Reels de Instagram, el botón de enviar del chat queda cerca de la zona que tapa la app (abajo): revisar antes de publicar.
- Si se cambia el largo del recorrido, hay que reajustar los tiempos de los 4 pasos y del chat en `composicion.html` según las marcas que imprime el script.
