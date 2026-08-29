// Crea (o actualiza la clave de) un usuario admin en Supabase Auth.
// Uso:
//   cd backend
//   node scripts/crear-usuario-admin.mjs "email@ejemplo.com" "claveSegura"
//
// El email además tiene que estar en ADMIN_EMAILS del .env para poder usar el panel.

import { supabaseAdmin } from '../lib/supabaseAdmin.js';

const email = process.argv[2];
const password = process.argv[3];

if (!email || !password) {
  console.error('Falta email o contraseña.\n  node scripts/crear-usuario-admin.mjs "email" "clave"');
  process.exit(1);
}

// ¿ya existe?
const { data: lista, error: errorLista } = await supabaseAdmin.auth.admin.listUsers();
if (errorLista) {
  console.error('Error listando usuarios:', errorLista.message);
  process.exit(1);
}
const existente = lista.users.find((u) => (u.email || '').toLowerCase() === email.toLowerCase());

if (existente) {
  const { error } = await supabaseAdmin.auth.admin.updateUserById(existente.id, {
    password,
    email_confirm: true,
  });
  if (error) { console.error('Error actualizando:', error.message); process.exit(1); }
  console.log(`OK: contraseña actualizada para ${email}`);
} else {
  const { error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error) { console.error('Error creando:', error.message); process.exit(1); }
  console.log(`OK: usuario ${email} creado`);
}

const admins = (process.env.ADMIN_EMAILS || '').split(',').map((e) => e.trim().toLowerCase());
if (!admins.includes(email.toLowerCase())) {
  console.warn(`\n⚠  Ojo: ${email} NO está en ADMIN_EMAILS del .env. Agregalo o el panel te va a rechazar.`);
}
process.exit(0);
