import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

// Acepta tanto SUPABASE_SERVICE_ROLE_KEY (nombre nuevo) como SUPABASE_SERVICE_KEY (nombre viejo)
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

if (!serviceKey) {
  throw new Error('Falta la variable SUPABASE_SERVICE_ROLE_KEY en el .env');
}

export const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  serviceKey
);