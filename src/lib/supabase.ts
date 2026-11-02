import { createClient } from '@supabase/supabase-js';

// Supabase Project: hiraya-enrollment-system
// Project ID: tuujlqrfyuazvbvoribz (ap-southeast-2)
export const SUPABASE_PROJECT_NAME = import.meta.env.VITE_SUPABASE_PROJECT_NAME || 'hiraya-enrollment-system';
export const SUPABASE_PROJECT_ID = import.meta.env.VITE_SUPABASE_PROJECT_ID || 'tuujlqrfyuazvbvoribz';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://tuujlqrfyuazvbvoribz.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_dYaVB2zNcNNj5gwjzJ4ZRw_N55Djq0D';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storage: window.localStorage,
  },
});

// Provide a global reference for debug / backwards compatibility
if (typeof window !== 'undefined') {
  (window as unknown as { supabase: typeof supabase }).supabase = supabase;
}
