# Complejo El Pinar — Sistema de Reservas

Sistema de reservas para 2 canchas de fútbol 11 y 1 cancha de pádel, con
confirmación manual por código, sección de "Buscando Rival" y panel de
administración con estadísticas.

## Estructura del proyecto

```
proyecto-turnos-canchas/
├── backend/          → API en Node.js + Express (habla con Supabase)
├── frontend/         → Página web en React (pública + panel admin)
└── database/
    └── schema.sql    → Script para crear las tablas en Supabase
```

## Paso 1: Crear el proyecto en Supabase

1. Andá a [supabase.com](https://supabase.com) y creá una cuenta.
2. Creá un nuevo proyecto (elegí una contraseña de base de datos y guardala).
3. Andá a **SQL Editor** → **New query**, pegá todo el contenido de
   `database/schema.sql` y ejecutalo (botón Run).
4. Andá a **Project Settings → API** y copiá:
   - `Project URL` → esto es tu `SUPABASE_URL`
   - `anon public key` → esto es tu `VITE_SUPABASE_ANON_KEY`
   - `service_role key` → esto es tu `SUPABASE_SERVICE_KEY` (¡nunca la subas a
     GitHub ni la pongas en el frontend!)

## Paso 2: Crear los usuarios administradores

1. En Supabase, andá a **Authentication → Users → Add user**.
2. Creá un usuario para Mateo (su email + una contraseña).
3. Repetí para cada persona que necesite acceso al panel.
4. En el backend, agregá esos emails a la variable `ADMIN_EMAILS` (ver Paso 3).

## Paso 3: Configurar y correr el backend

```bash
cd backend
cp .env.example .env
# Editá .env y completá SUPABASE_URL, SUPABASE_SERVICE_KEY, ADMIN_EMAILS, etc.
npm install
npm run dev
```

El backend queda corriendo en `http://localhost:3001`.

## Paso 4: Configurar y correr el frontend

```bash
cd frontend
cp .env.example .env
# Editá .env con VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_API_URL
npm install
npm run dev
```

El frontend queda corriendo en `http://localhost:5173` (o el puerto que
indique Vite). Abrí esa URL en el navegador para ver la página pública, y
`/panel` para el panel del dueño.

## Paso 5: Desplegar a producción

**Backend** → Railway, Render o similar (necesita correr todo el tiempo).
**Frontend** → Netlify o Vercel (subís la carpeta `frontend`, comando de
build `npm run build`, carpeta de salida `dist`).

No te olvides de configurar las variables de entorno en el panel de cada
servicio de hosting (las mismas que tenés en tus archivos `.env` locales).

## Cómo probar el flujo completo

1. Abrí la página pública, elegí una cancha y horario, completá tus datos.
2. Vas a ver un código de reserva (ej: `RES-C1-30AGO-T1`) y un botón para
   enviar WhatsApp con ese código.
3. Entrá a `/panel`, iniciá sesión con un usuario admin.
4. Pegá el código en el buscador → el sistema te va a sugerir "Confirmar".
5. Confirmá → el turno pasa a ocupado en la página pública, y (si tenés el
   email configurado) se envía un correo de confirmación al cliente.
6. Buscá el mismo código de nuevo → ahora el sistema sugiere "Cancelar".

## Notas importantes

- Los emails automáticos requieren configurar `SMTP_USER` y `SMTP_PASS` en
  el backend. Si no los configurás, el sistema simplemente "simula" el envío
  (lo ves en la consola) para que puedas probar sin esa parte todavía.
- El código de cada reserva se genera automáticamente a partir de la cancha,
  la fecha y el horario — no hace falta generarlo a mano.
- Ver `NOTAS.md` para las decisiones técnicas y lo que falta para producción.
