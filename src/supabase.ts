import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_FINDIT_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_FINDIT_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    'Missing Supabase configuration. Check your .env file.'
  );
}

console.log('FindIt Supabase URL:', supabaseUrl);
console.log('FindIt Supabase key loaded:', Boolean(supabaseKey));

export const supabase = createClient(supabaseUrl, supabaseKey);
