import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

// Este cliente usa la SERVICE KEY, que tiene permisos totales.
// Solo se usa en el backend, NUNCA se expone al frontend.
export const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);
