// Alta y baja de empleados con acceso limitado al panel.
//
//   cd backend
//   node scripts/empleados.js invitar maria@gmail.com "María"          -> te da un LINK para mandárselo (WhatsApp); ahí elige SU contraseña
//   node scripts/empleados.js invitar maria@gmail.com "María" --mail   -> en vez del link, le manda la invitación por mail
//   node scripts/empleados.js quitar maria@gmail.com            -> pierde el acceso en el acto
//   node scripts/empleados.js quitar maria@gmail.com --borrar   -> además se borra su usuario
//   node scripts/empleados.js listar
//
// Nadie (ni quien corre este script) llega a ver o fijar la contraseña: la elige la persona desde el link del mail.
// Usa las claves de backend/.env (nunca las del navegador).
import { supabaseAdmin } from '../lib/supabaseAdmin.js';
import 'dotenv/config';

const [accion, emailCrudo, ...resto] = process.argv.slice(2);
const email = String(emailCrudo || '').trim().toLowerCase();
const nombre = resto.filter((x) => !x.startsWith('--')).join(' ').trim() || null;
const REDIRECT = process.env.PANEL_URL || 'https://complejo-el-pinar.pages.dev/panel';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function salir(msg, codigo = 1) { console.log(msg); process.exit(codigo); }

async function invitar() {
  if (!EMAIL_RE.test(email)) salir('Falta un mail válido. Ej.: node scripts/empleados.js invitar maria@gmail.com "María"');
  const { error } = await supabaseAdmin.from('empleados_panel').upsert({ email, nombre, invitado_por: 'script' }, { onConflict: 'email' });
  if (error) salir('No se pudo anotar al empleado: ' + error.message);

  if (process.argv.includes('--mail')) {
    // La invitación sale por el servicio de mails de Supabase (si no está configurado para cualquier destinatario, puede no llegar).
    const { error: eInv } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, { redirectTo: REDIRECT });
    if (eInv) salir(`Quedó anotado como empleado, pero no se pudo mandar el mail: ${eInv.message}. Probá sin --mail para obtener el link.`);
    salir(`Listo: ${email} quedó como empleado y le llegó un mail para elegir su contraseña.`, 0);
  }

  // Por defecto: se genera el link y se lo mandás vos. Sirve una sola vez y vence solo.
  let { data, error: eLink } = await supabaseAdmin.auth.admin.generateLink({ type: 'invite', email, options: { redirectTo: REDIRECT } });
  if (eLink && /already|registered|exists/i.test(eLink.message)) {
    // ya tenía usuario: el link sirve para que elija una contraseña nueva
    ({ data, error: eLink } = await supabaseAdmin.auth.admin.generateLink({ type: 'recovery', email, options: { redirectTo: REDIRECT } }));
  }
  if (eLink) salir(`Quedó anotado como empleado, pero no se pudo generar el link: ${eLink.message}`);
  console.log(`Listo: ${email} quedó como empleado. Mandale este link (una sola vez, para que elija SU contraseña):
`);
  console.log(data.properties.action_link);
  process.exit(0);
}

async function quitar() {
  if (!EMAIL_RE.test(email)) salir('Falta el mail. Ej.: node scripts/empleados.js quitar maria@gmail.com');
  const { error } = await supabaseAdmin.from('empleados_panel').delete().eq('email', email);
  if (error) salir('No se pudo sacar: ' + error.message);
  if (process.argv.includes('--borrar')) {
    const { data } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
    const u = data?.users?.find((x) => (x.email || '').toLowerCase() === email);
    if (u) {
      const { error: eDel } = await supabaseAdmin.auth.admin.deleteUser(u.id);
      if (eDel) salir('Se le sacó el acceso, pero no se pudo borrar el usuario: ' + eDel.message);
    }
  }
  salir(`Listo: ${email} ya no tiene acceso al panel.`, 0);
}

async function listar() {
  const { data, error } = await supabaseAdmin.from('empleados_panel').select('*').order('created_at');
  if (error) salir('No se pudo leer: ' + error.message);
  if (!data.length) salir('Todavía no hay empleados.', 0);
  for (const e of data) console.log(`${e.email}${e.nombre ? ` · ${e.nombre}` : ''} · desde ${String(e.created_at).slice(0, 10)}`);
  process.exit(0);
}

if (accion === 'invitar') await invitar();
else if (accion === 'quitar') await quitar();
else if (accion === 'listar') await listar();
else salir('Uso: node scripts/empleados.js invitar|quitar|listar <mail> ["Nombre"]');
