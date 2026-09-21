# Complejo El Pinar — guía para trabajar en este repo

Sistema de reservas de canchas (fútbol 11 ×2, pádel, parrilla) en Paraná, Entre Ríos.
Frontend React+Vite en Cloudflare Pages, backend Express en Render, datos en Supabase.

## Criterio de diseño: pensar siempre en UX/UI, no solo en que "funcione"

Cualquier cambio visible para el usuario (sitio público o panel de Mateo) se evalúa con
estos dos lentes antes de darlo por terminado:

**UX (¿se entiende y fluye?)**
- ¿La persona sabe qué tocar y qué va a pasar? Si un elemento es interactivo, se ve
  interactivo (cursor, hover, borde).
- ¿El camino más corto es el que ofrecemos primero? (ej.: elegir deporte antes que
  cancha puntual, ver las dos canchas juntas en vez de ir y volver).
- Errores y estados faltantes se marcan donde está el problema (campo en rojo), no solo
  en un mensaje genérico arriba.
- Cambios de estado (loading, error, éxito) siempre visibles — nunca una pantalla muda.
- Mobile primero: si una función solo se ve bien en compu, no está terminada.
- No romper flujos existentes al rediseñar — separar "cambio visual" de "cambio de
  lógica", y avisar cuando algo sí toca lógica.

**UI (¿se ve prolijo y consistente?)**
- Paleta: navy/pino oscuro (`--s-pino-900` #0F2436, `--s-marino` #1D3E5A) + dorado
  (`--s-oro` #F2C14E) para el sitio; equivalentes `--p-*` para el panel. Verde
  (`--s-cesped`) = disponible/positivo, rojo/coral = error, nunca mezclar semántica.
- Tipografía: **Fraunces** (serif) solo para títulos grandes y la marca ("El Pinar");
  **Satoshi** (sans, alojada en `frontend/public/fonts`) para todo lo que se lee o
  se escanea: texto, botones, días, horarios, nombres de equipos, cifras del panel.
  Regla: si es un dato que hay que leer al vuelo, va en Satoshi. No mezclar otras
  familias sin razón. (Satoshi solo tiene pesos 400/500/700: un `600` cae en el 700.)
- Todo nuevo componente reusa los tokens y clases `.sitio *` / `.grilla-pub-*` /
  `.clado-*` existentes en `frontend/src/styles.css` antes de inventar uno nuevo.
- Espaciado consistente, nada centrado "porque sí" — cada elemento alineado a la grilla
  que ya existe en la sección.
- Estados de carga/vacío/error tienen el mismo tratamiento visual en todo el sitio.

## Cómo se prueban los cambios visuales antes de subir

1. Cambios grandes o inciertos → rama aparte + `npm run build`, verificar en el
   Browser pane (local o preview de Cloudflare) antes de pedir el ok.
2. Ajustes chicos ya validados por el usuario → directo a `main` con `git push`.
3. El backend local (`node server.js` en `backend/`, puerto 3001) sirve datos reales de
   Supabase — mejor que inventar mocks para juzgar un diseño.
4. Nunca declarar algo "hecho" sin haberlo visto renderizado (Browser pane, no solo
   leer el código).

## Pendientes conocidos del proyecto (ver memoria para detalle)

- Revisar si un turno "pendiente" debería seguir mostrándose como "Reservado" en el
  sitio público (decisión ya tomada, pero queda anotado por si se repiensa).
- Dominio propio: pendiente de comprar (~$11/año en Cloudflare) hasta que Mateo formalice
  el lanzamiento. Cuando se compre, actualizar todas las URLs hardcodeadas de
  `complejo-el-pinar.pages.dev` (index.html, robots.txt, sitemap.xml) al dominio nuevo.
