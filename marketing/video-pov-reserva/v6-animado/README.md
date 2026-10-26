# "Así se reserva" v6 — animado con el diseño de "Busco rival"

La interfaz del sitio (portada, tablero de turnos, formulario, "¡Ya casi!") está **recreada en HTML/GSAP**,
sin grabar pantalla. Fondo azul pino, titulares crema con palabra clave en caja dorada, stickers "PASO N",
cursor con anillo de clic, "¡LISTO!" con confeti. Sin audio.

- `composicion.html`: versión larga, 17,6 s.
- `composicion-stories.html`: versión Stories, 11,6 s (celular más chico y textos en la zona segura).
- `build.py` + `css_head.txt` + `css_tail.txt`: generan las dos (`python3 build.py largo|stories`, cada una en su carpeta).

Para renderizar: una carpeta HyperFrames con `index.html`, `assets/grain.png`, `vendor/gsap.min.js` y `vendor/fonts/`
(DM Serif Display, Satoshi), y `npx hyperframes render -o salida.mp4`. Los cursores leen el layout con `P(el)`.
Los datos son de ejemplo (Juan Pérez, alias y monto de muestra).

**Sin pago:** Mateo no cobra seña, así que la pantalla "¡Ya casi!" no muestra alias ni monto ("Tu turno está guardado. Mandanos el WhatsApp para dejarlo reservado.") y el video **termina tocando "Enviar WhatsApp"** (sin "¡LISTO!" ni cierre).
