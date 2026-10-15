import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://nmomwdmcieqkpsyhefda.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5tb213ZG1jaWVxa3BzeWhlZmRhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIwNzU1MTksImV4cCI6MjEwNzY1MTUxOX0.rXN5quKhvQHpFGQqcvvyDaUd8p5_EvpXgMPbSHOYVLQ';

export const isSupabaseConfigured = Boolean(
  supabaseUrl && 
  supabaseAnonKey && 
  supabaseAnonKey.trim() !== '' && 
  supabaseAnonKey !== 'seu_supabase_anon_key_aqui'
);

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey
);
