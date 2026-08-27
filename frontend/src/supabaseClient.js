import { createClient } from '@supabase/supabase-js';

// Esta clave es PUBLICA (anon key) - se usa solo para el login de administradores.
// Nunca uses la service_role key en el frontend.
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);
