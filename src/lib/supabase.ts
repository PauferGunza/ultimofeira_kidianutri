import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL;
const supabaseAnonKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials missing. Authentication will not work until VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in the Secrets panel.');
}

export const supabase = createClient(
  supabaseUrl || '',
  supabaseAnonKey || ''
);
