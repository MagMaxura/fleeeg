

import { createClient } from '@supabase/supabase-js';
import type { Database } from '../src/types';
import { CapacitorStorage } from '../src/utils/capacitorStorage';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Supabase URL or Key is not defined. Please check your .env file.");
}

export const supabase = createClient<Database>(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
    storage: CapacitorStorage,
  },
});
