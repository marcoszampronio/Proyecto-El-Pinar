# Historia de IG (turnos libres) — propuesta lista para aplicar sobre `main`

Función nueva para el panel de Mateo: arma una imagen de historia de Instagram (1080×1920) con los turnos de fútbol que están libres,
**del día** o **de la semana**, con vista previa y botones Descargar / Compartir.

> El código NO está en esta rama como archivos sueltos porque esta rama (`claude/hola-q5zsmg`) tiene otro historial que `main`.
> Va como parche: `historia-ig-turnos-libres.patch` (sale de `main`, commit `653948b`). Imagen de referencia: `vista-previa-dorado.png`.

## Cómo aplicarlo
```bash
git fetch origin claude/hola-q5zsmg
git show origin/claude/hola-q5zsmg:marketing/historia-ig-panel/historia-ig-turnos-libres.patch > /tmp/historia.patch
git checkout -b feat/historia-turnos origin/main
git apply --check /tmp/historia.patch && git apply /tmp/historia.patch   # si main avanzó y hay conflicto, resolverlo a mano
cd frontend && npm run build
```

## Qué incluye (4 archivos)
- `frontend/src/lib/historiaTurnos.js`: dibuja la imagen en un canvas (sin librerías nuevas) y arma los datos a partir de la agenda del panel.
- `frontend/src/components/panel/HistoriaTurnos.jsx`: la pantalla del panel (modo, fecha o semana, estilo, vista previa, botones).
- `frontend/src/pages/AdminPanel.jsx`: pestaña nueva "Historia de IG" (admin y empleados); se le pasa `NavegadorFecha` como prop.
- `frontend/src/styles.css`: unas pocas clases al final (`.historia-*`).

## Reglas de contenido (pedidas por Mateo)
- Solo turnos **libres**: no se muestra lo reservado, y los días sin turnos libres no aparecen.
- No se aclara qué cancha está libre: el horario cuenta como libre si alguna de las dos canchas lo está.
- Solo la **hora de inicio** ("20:30").
- Sin link de la web: abajo solo el pino y "El Pinar".
- Si no queda nada libre, el panel avisa en vez de armar la imagen.
- Solo fútbol por ahora; el pádel se puede sumar si Mateo lo pide.

## Estilos (selector Claro / Azul / Dorado, se recuerda por celular)
- Claro: fondo crema, bloque verde detrás de "LIBRES".
- Azul: azul pino con verde.
- **Dorado**: azul pino con el dorado `#F2C14E` de los videos de "Busco rival" (la última versión mostrada). **Es el estilo por defecto** (si alguien ya eligió otro en su celular, se respeta).

## Pendiente
1. Probarlo en el panel real (login de Mateo, reservas reales) y en un celular Android: hasta ahora solo se vio con datos de ejemplo.
2. Revisarlo con el criterio UX/UI de `CLAUDE.md`.
3. Subir a `main` solo cuando Marcos lo apruebe; sin abrir pull request salvo que lo pida.
