import { supabaseAdmin } from '../lib/supabaseAdmin.js';
import 'dotenv/config';

const EMAILS_PERMITIDOS = (process.env.ADMIN_EMAILS || '')
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

// Verifica que la persona que hace la peticion este logueada con
// Supabase Auth Y que su email este en la lista de administradores permitidos.
export async function requireAdmin(req, res, next) {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: 'Falta el token de acceso.' });
    }

    const { data, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !data?.user) {
      return res.status(401).json({ error: 'Sesion invalida. Iniciá sesión de nuevo.' });
    }

    const email = data.user.email.toLowerCase();

    if (!EMAILS_PERMITIDOS.includes(email)) {
      return res.status(403).json({ error: 'Tu cuenta no tiene permiso de administrador.' });
    }

    req.adminEmail = email;
    next();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error verificando la sesion.' });
  }
}
