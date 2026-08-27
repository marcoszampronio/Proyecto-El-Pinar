import { createClient } from '@supabase/supabase-js';

// Esta clave es PUBLICA (anon key) - se usa solo para el login de administradores.
// Nunca uses la service_role key en el frontend.
const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabaseConfigurado = Boolean(url && anonKey);

// Sin configuracion no se crea el cliente: la parte publica de la web funciona igual
// y solo falla el login del panel, en vez de romper toda la pagina al cargar.
function clienteSinConfigurar() {
  const error = new Error(
    'Faltan VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en frontend/.env. Reinicia npm run dev despues de crearlo.'
  );
  return {
    auth: {
      getSession: async () => ({ data: { session: null } }),
      signInWithPassword: async () => ({ data: null, error }),
      signOut: async () => ({ error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
    },
  };
}

if (!supabaseConfigurado) {
  console.warn('Supabase sin configurar: el panel de administracion no va a poder iniciar sesion.');
}

export const supabase = supabaseConfigurado ? createClient(url, anonKey) : clienteSinConfigurar();
