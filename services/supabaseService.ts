
import { createClient } from '@supabase/supabase-js';
// FIX: Corrected the import path for the Database type. Assuming a standard `src` directory structure, the path from `src/services` to `src/types.ts` is `../types.ts`.
// FIX: Corrected import path for types to point to the correct file in `src/`.
// FIX: Corrected import path for the Database type to ensure the Supabase client is correctly typed.
// FIX: Corrected import path to point to '../src/types.ts' to resolve module not found error.
// FIX: Corrected the import path for the Database type to `../types.ts` instead of `../src/types.ts` to align with a standard project structure.
// FIX: Corrected the import path for types to point to 'src/types.ts' instead of the empty 'types.ts' file at the root, resolving the module resolution error.
// FIX: Corrected the import path for the Database type to `../types.ts` to properly type the Supabase client.
import type { Database } from '../types.ts';


// --- Supabase Client Initialization ---

const supabaseUrl = 'https://pviwmlbusbuzedtbyieu.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB2aXdtbGJ1c2J1emVkdGJ5aWV1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMyMTI1MTMsImV4cCI6MjA2ODc4ODUxM30.yBzINm1HIuGyaa6ezvK40G4OkLscgyNQy24nwfvkVTs';

if (!supabaseUrl || !supabaseKey) {
  // In a real app, you'd want a more robust way to handle this,
  // maybe showing an error page, but for this context, throwing is fine.
  throw new Error("Supabase URL or Key is not defined. Please check your environment variables.");
}

// Create and export the Supabase client, correctly typed with the Database definition.
// This is the standard and recommended way to initialize the client.
export const supabase = createClient<Database>(supabaseUrl, supabaseKey);
