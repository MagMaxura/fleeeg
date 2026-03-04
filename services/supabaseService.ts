

import { createClient } from '@supabase/supabase-js';
// FIX: Removed .ts extension for consistent module resolution.
import type { Database } from '../src/types';


// --- Supabase Client Initialization ---

// --- Supabase Client Initialization ---

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Supabase URL or Key is not defined. Please check your .env file.");
}

// Create and export the Supabase client, correctly typed with the Database definition.
// This is the standard and recommended way to initialize the client.
export const supabase = createClient<Database>(supabaseUrl, supabaseKey);
