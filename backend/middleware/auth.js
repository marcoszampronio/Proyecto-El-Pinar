import { supabaseAdmin } from '../lib/supabaseAdmin.js';
import 'dotenv/config';

const EMAILS_PERMITIDOS = (process.env.ADMIN_EMAILS || '')
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

// Verifica que la persona que hace la peticion este logueada con Supabase Auth Y que sea del equipo:
//  - "admin": su email está en ADMIN_EMAILS (hace todo).
//  - "empleado": su email está en la tabla `empleados_panel` (solo hace lo de `empleadoPuede`).
// Deja en req.adminEmail y req.rol lo que corresponda. Si lo sacan de la tabla, pierde el acceso en el acto.
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

    if (EMAILS_PERMITIDOS.includes(email)) {
      req.rol = 'admin';
    } else {
      const { data: emp } = await supabaseAdmin.from('empleados_panel').select('email').eq('email', email).maybeSingle();
      if (!emp) return res.status(403).json({ error: 'Tu cuenta no tiene permiso para usar el panel.' });
      req.rol = 'empleado';
    }

    req.adminEmail = email;
    next();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error verificando la sesion.' });
  }
}

// Para rutas que solo puede usar un administrador (ej. el Excel, el diagnóstico del sistema).
export function requireAdminSolo(req, res, next) {
  if (req.rol !== 'admin') return res.status(403).json({ error: 'Tu usuario no tiene permiso para esto.' });
  next();
}

// Lo que PUEDE hacer un empleado (método + ruta dentro de /api/admin). Todo lo demás queda prohibido.
// Puede: ver Hoy y Agenda, confirmar y cancelar reservas, agendar a mano, avisar por WhatsApp, marcar "busco rival",
// atender la lista de espera, VER contactos y equipos, y manejar sus propios avisos al celular.
// No puede: turnos fijos, bloqueos, días especiales, suspender por lluvia, estadísticas, movimientos, visitas, Excel,
// editar contactos o equipos, ni administrar usuarios.
const PERMITIDO_EMPLEADO = [
  ['GET', /^\/yo$/],
  ['GET', /^\/agenda\/[\d-]+$/],
  ['GET', /^\/dia\/[\d-]+$/],
  ['GET', /^\/search\/[^/]+$/],
  ['GET', /^\/pending$/],
  ['GET', /^\/contactos$/],
  ['GET', /^\/equipos$/],
  ['GET', /^\/bloqueos\/[\d-]+$/],
  ['GET', /^\/recordatorios-fijos$/],
  ['POST', /^\/confirm\/[^/]+$/],
  ['POST', /^\/cancel\/[^/]+$/],
  ['POST', /^\/manual$/],
  ['POST', /^\/rival\/[^/]+$/],
  ['POST', /^\/espera\/[^/]+\/[^/]+$/],
  ['GET', /^\/push\/(estado|preferencias)$/],
  ['POST', /^\/push\/(suscribir|baja|preferencias|prueba)$/],
  ['POST', /^\/dispositivo$/],
];
export const empleadoPuede = (metodo, ruta) => PERMITIDO_EMPLEADO.some(([m, re]) => m === metodo && re.test(ruta));

export function limitarEmpleado(req, res, next) {
  if (req.rol === 'empleado' && !empleadoPuede(req.method, req.path)) {
    return res.status(403).json({ error: 'Tu usuario no tiene permiso para esto.' });
  }
  next();
}
