// supabase/functions/get-available-trips/index.ts

// Deno global declaration for environments without Deno types.
declare const Deno: any;

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.51.0';

Deno.serve(async (req: Request) => {
  const origin = req.headers.get('Origin') || '*';
  // A pristine, known-good CORS header configuration to prevent preflight failures.
  const corsHeaders = {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { driverId } = await req.json();
    if (!driverId) {
        throw new Error("driverId is required in the request body.");
    }
      
    // We need to use the service role key to bypass RLS.
    // Robust check for environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    if (!supabaseUrl) throw new Error('SUPABASE_URL is not defined in environment variables.');
    
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseServiceRoleKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not defined in environment variables.');
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

    // 1. Fetch the driver's capacity preferences (weight/volume)
    const { data: profile, error: profileError } = await supabaseAdmin
        .from('profiles')
        .select('filter_preferences') // We only need filter_preferences
        .eq('id', driverId)
        .single();
    
    // Fail-fast if there's a database error during the profile fetch.
    if (profileError) {
        console.error('CRITICAL: Database error fetching driver profile for filters:', profileError);
        throw profileError;
    }

    // Fail-fast if the profile doesn't exist.
    if (!profile) {
        console.error(`CRITICAL: No profile found for driverId: ${driverId}. This should not happen.`);
        throw new Error(`Profile not found for driver with ID: ${driverId}. The user may not exist or data is inconsistent.`);
    }

    const prefs = profile?.filter_preferences;

    // 2. Build the query to fetch trips
    let query = supabaseAdmin
      .from('trips')
      .select('*')
      .eq('status', 'requested');
      
    // City filters are now handled client-side for a more dynamic UI.
    // We only apply hard constraints like vehicle capacity here.

    // If the driver has a max weight filter, apply it.
    if (typeof prefs?.max_weight_kg === 'number') {
        query = query.lte('estimated_weight_kg', prefs.max_weight_kg);
    }

    // If the driver has a max volume filter, apply it.
    if (typeof prefs?.max_volume_m3 === 'number') {
        query = query.lte('estimated_volume_m3', prefs.max_volume_m3);
    }
    
    // 3. Execute the final query
    const { data: trips, error: tripsError } = await query.order('created_at', { ascending: false });

    if (tripsError) {
      throw tripsError;
    }

    // Return the list of available trips.
    return new Response(JSON.stringify(trips || []), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Error in get-available-trips function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
