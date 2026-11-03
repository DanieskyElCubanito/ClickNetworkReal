import { createClient } from '@supabase/supabase-js';
import WebSocket from 'ws';

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn("Faltan las credenciales de Supabase en las variables de entorno.");
}

export const supabase = createClient(
  supabaseUrl,
  supabaseKey,
  { 
    auth: { persistSession: false }, 
    realtime: { transport: WebSocket }, 
    global: { WebSocket: WebSocket } 
  }
);
