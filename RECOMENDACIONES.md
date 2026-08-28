# Recomendaciones de cambios — Complejo El Pinar

Revisión del código (frontend React + Vite, backend Express, Supabase/Postgres).
Cada punto indica el problema, por qué importa y cómo se resuelve.
Al final está el detalle de lo que ya quedó implementado en el rediseño.

---

## 1. Bugs y riesgos (prioridad alta)

### 1.1 Marca inconsistente
La web, el panel, el backend y el schema usaban un nombre de complejo distinto al de los emails.
**Solución:** todo unificado a "Complejo El Pinar". *(Hecho)*

### 1.2 La fecha del día se calculaba en UTC
`hoyISO()` usaba `new Date().toISOString()`, que devuelve la fecha en UTC.
En Argentina (UTC-3), a partir de las 21:00 la página abría mostrando el día siguiente.
**Solución:** calcular año/mes/día con los getters locales. *(Hecho, en `frontend/src/lib/fechas.js`)*

### 1.3 El selector de pádel arrancaba en estado inválido
Se inicializaba con el rango completo 20:00–23:30, así que si había cualquier reserva
el usuario veía el error rojo "se solapa" apenas entraba, sin saber qué estaba ocupado.
**Solución:** grilla de bloques de 30 minutos con estado visual + selector de duración,
mostrando solo las duraciones que realmente entran. *(Hecho)*

### 1.4 El anti-solapamiento de pádel no está garantizado en la base de datos
La validación de solapes se hace en JavaScript y el índice único es solo por `start_time`.
Dos pedidos simultáneos con distinto inicio pero horarios que se pisan (20:00–21:30 y
21:00–22:00) pueden entrar los dos.
**Solución (SQL, pendiente):**

```sql
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE reservations
  ADD CONSTRAINT padel_sin_solape
  EXCLUDE USING gist (
    date WITH =,
    court WITH =,
    tsrange(date + start_time, date + end_time, '[)') WITH &&
  )
  WHERE (court = 'PAD' AND status IN ('pendiente', 'confirmada'));
```

### 1.5 Endpoints públicos sin rate limit ni expiración de pendientes
Cualquiera puede crear reservas falsas y bloquear la agenda indefinidamente.
**Solución (pendiente):**
- `express-rate-limit` en `POST /api/reservations/*` (ej. 5 por IP cada 15 min).
- Job o consulta programada que pase a `cancelada` las `pendiente` sin comprobante
  después de 30–60 minutos.

### 1.6 El backup diario de GitHub Actions no puede funcionar
Dos problemas en `.github/workflows/backup-diario.yml`:
- El `ADMIN_TOKEN` de Supabase Auth caduca en ~1 hora, así que un secret fijo va a fallar.
- La action de Google Drive usada no acepta un JSON de service account.

**Solución (pendiente):** correr el backup en el backend (endpoint protegido con un token
propio de servicio, no el JWT de Supabase) y subir el archivo con `googleapis` autenticado
con service account.

### 1.7 Faltan `.env.example` y el fallback SPA
El README pide copiar `.env.example` pero los archivos no están en el repo, y en
Netlify/Vercel recargar `/panel` va a devolver 404.
**Solución (pendiente):** agregar `backend/.env.example`, `frontend/.env.example` y un
`frontend/public/_redirects` con `/* /index.html 200`.

---

## 2. Seguridad

- **CORS abierto:** `app.use(cors())` acepta cualquier origen. Restringir a los dominios
  propios vía variable de entorno.
- **Sin `helmet`:** agregar cabeceras de seguridad básicas.
- **CSV exportable:** el escapado es manual; un nombre con coma o comillas rompe el archivo.
  Además, un valor que empiece con `=`, `+`, `-` o `@` se ejecuta como fórmula en Excel
  (CSV injection). Escapar comillas duplicándolas y prefijar esos valores con `'`.
- **`service_role`:** correctamente usada solo en el backend. Mantenerlo así, nunca
  exponerla en el frontend.

---

## 3. Calidad de código y UX

- **Errores de API poco claros:** `api.js` hacía `res.json()` siempre; si el backend
  responde 502 con HTML, el usuario veía un error de parseo.
  **Solución:** parseo tolerante con mensaje entendible. *(Hecho)*
- **Accesibilidad:** los turnos eran `div` clickeables, sin teclado ni lectores de pantalla.
  **Solución:** todos los horarios, canchas y fechas ahora son `<button>` con `aria-label`
  y estado `disabled` real. *(Hecho)*
- **Falta de favicon, meta description y Open Graph:** importante porque el link se comparte
  por WhatsApp. *(Hecho)*
- **La tipografía nunca se cargaba:** el CSS pedía Work Sans pero no había `<link>` a la
  fuente, así que se veía con la del sistema. *(Hecho: se carga Outfit desde Google Fonts)*
- **Sin lint ni CI:** agregar ESLint + un workflow que corra `npm run build` en cada PR.
- **Sin tests:** al menos cubrir la generación de códigos de reserva y el cálculo de
  solapes de pádel.

---

## 4. Rendimiento

- El bundle del frontend pesa ~405 kB (116 kB gzip), casi todo `@supabase/supabase-js`,
  que solo se usa en el panel de administración.
  **Sugerencia:** cargar el panel con `React.lazy` para que el visitante público no lo baje.
- Las consultas de disponibilidad se repiten al cambiar de cancha o fecha; se puede cachear
  la respuesta por (cancha, fecha) durante unos segundos.
- Agregar índices en `reservations(date, court, status)` si el volumen crece.

---

## 5. Rediseño visual (implementado)

Se rehizo la interfaz pública siguiendo los mockups:

- Paleta azul marino `#123C6E` + dorado `#C09A46` sobre fondo crema `#FAF3E3`.
- Header fijo con menú lateral (Reservar turnos / Busco rival / Panel) y buscador de equipos.
- Selector de cancha con ilustraciones SVG de cada superficie (Cancha 1, Cancha 2, Paddle),
  con la seleccionada destacada en azul y borde dorado.
- Tira horizontal de 7 días con flechas y bloqueo de fechas pasadas.
- Horarios como chips redondeados con leyenda de estados (libre / a confirmar / reservado).
- Vista "Busco rival" con lista de equipos y calendario por hora y cancha, con acceso
  directo a WhatsApp.
- Barra inferior fija con los dos accesos principales.
- Todo mobile-first, con ancho máximo de 520 px centrado en desktop.

Archivos nuevos: `lib/fechas.js`, `components/Iconos.jsx`, `Header.jsx`, `CourtSelector.jsx`,
`DateStrip.jsx`, `FutbolSlots.jsx`, `RivalsCalendar.jsx`, `public/favicon.svg`.

---

## 6. Orden sugerido de trabajo

1. Constraint SQL anti-solape de pádel (1.4).
2. Rate limit + expiración de pendientes (1.5).
3. `.env.example` + redirects SPA (1.7).
4. CORS restringido + helmet + escapado de CSV (2).
5. Arreglar o reemplazar el backup a Google Drive (1.6).
6. ESLint + CI de build (3).
7. Lazy load del panel admin (4).
