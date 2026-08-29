# Deploy — Complejo El Pinar

Dos partes: **backend** (API, tiene que estar prendido siempre) y **frontend**
(web estática). Supabase ya está en la nube, no se toca.

---

## 1. Backend → Render (gratis)

1. Entrá a [render.com](https://render.com) con tu cuenta de GitHub.
2. **New → Blueprint** → elegí el repo `Proyecto-El-Pinar`. Render lee
   `render.yaml` y crea el servicio `el-pinar-backend`.
3. Cuando pida las variables (Environment), cargá:

   | Variable | Valor |
   |---|---|
   | `SUPABASE_URL` | `https://djhttdogqwcrzhpwixlm.supabase.co` |
   | `SUPABASE_SERVICE_ROLE_KEY` | la service_role key de Supabase (Settings → API) |
   | `ADMIN_EMAILS` | `jmarcoszampronio@gmail.com` (y el de Mateo, separados por coma) |
   | `WHATSAPP_NUMERO` | `5493434718364` |
   | `ALIAS_TRANSFERENCIA` | `marcoszampronio` |
   | `CORS_ORIGINS` | *(lo completás en el paso 3, con la URL de Netlify)* |
   | `SMTP_USER` | `turnoselpinar@gmail.com` |
   | `SMTP_PASS` | la contraseña de aplicación de Gmail |

4. Deploy. Cuando termina te da una URL tipo
   `https://el-pinar-backend.onrender.com`. Probala: abrila en el navegador,
   tiene que responder `{"ok":true,...}`.

> **Nota**: el plan gratis de Render "duerme" el servicio tras 15 min sin uso.
> La primera visita después de dormir tarda ~50 seg en responder. Si molesta,
> el plan pago de Render son USD 7/mes, o Railway (~USD 5/mes) no duerme.

### Alternativa: Railway
New Project → Deploy from GitHub → elegí el repo → Root Directory `backend`
→ cargá las mismas variables → Deploy.

---

## 2. Frontend → Netlify (gratis)

1. Entrá a [netlify.com](https://netlify.com) con GitHub.
2. **Add new site → Import an existing project** → elegí el repo.
3. Netlify lee `frontend/netlify.toml` (base `frontend`, build `npm run build`,
   publish `frontend/dist`). No hace falta tocar nada.
4. En **Site settings → Environment variables**, cargá:

   | Variable | Valor |
   |---|---|
   | `VITE_SUPABASE_URL` | `https://djhttdogqwcrzhpwixlm.supabase.co` |
   | `VITE_SUPABASE_ANON_KEY` | la anon key de Supabase (Settings → API) |
   | `VITE_API_URL` | `https://el-pinar-backend.onrender.com/api` *(la URL del paso 1 + `/api`)* |

5. Deploy. Te da una URL tipo `https://elpinar.netlify.app` (la podés cambiar
   en Site settings → Change site name).

---

## 3. Conectar los dos

1. Volvé a Render → variable `CORS_ORIGINS` → poné la URL de Netlify
   **sin la barra final**, ej: `https://elpinar.netlify.app`.
   (Si vas a usar dominio propio después, agregalo separado por coma.)
2. Guardá → Render redeploya solo.

---

## 4. Checklist final antes de dar la URL a los clientes

- [ ] Migración de la parrilla corrida en Supabase.
- [ ] Usuario de Mateo creado en Supabase Auth y su email en `ADMIN_EMAILS`.
- [ ] `SMTP_PASS` cargado en el backend (si no, los emails se "simulan").
- [ ] Probar el circuito completo en la URL de Netlify: reservar → WhatsApp →
      confirmar en `/panel` → llega el email.
- [ ] Activar RLS en Supabase (ver `RECOMENDACIONES.md`).

## Actualizar después de un cambio

`git push` a `main` → Render y Netlify redeployan solos.
