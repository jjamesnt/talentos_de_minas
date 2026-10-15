import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://lmdawrnbnnrnmxbrmgak.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(
  supabaseUrl && 
  supabaseAnonKey && 
  supabaseAnonKey.trim() !== '' && 
  supabaseAnonKey !== 'seu_supabase_anon_key_aqui'
);

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey || 'placeholder-anon-key'
);
