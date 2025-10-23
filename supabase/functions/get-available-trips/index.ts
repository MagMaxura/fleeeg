// supabase/functions/get-available-trips/index.ts

// Deno global declaration for environments without Deno types.
declare const Deno: any;

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.51.0';

Deno.serve(async (req: Request) => {
  // A simplified, known-good CORS configuration to prevent preflight failures.
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
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
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    if (!supabaseUrl) throw new Error('SUPABASE_URL is not defined in environment variables.');
    
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseServiceRoleKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not defined in environment variables.');
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

    // 1. Fetch the list of trip IDs that this driver has rejected.
    const { data: rejections, error: rejectionsError } = await supabaseAdmin
      .from('driver_trip_rejections')
      .select('trip_id')
      .eq('driver_id', driverId);

    if (rejectionsError) {
      throw rejectionsError;
    }

    const rejectedTripIds = rejections.map(r => r.trip_id);

    // 2. Fetch all trips that are in the 'requested' state...
    let query = supabaseAdmin
      .from('trips')
      .select('*')
      .eq('status', 'requested')
      .order('created_at', { ascending: false });

    // 3. ...and filter out the ones the driver has rejected.
    if (rejectedTripIds.length > 0) {
      query = query.not('id', 'in', `(${rejectedTripIds.join(',')})`);
    }

    const { data: trips, error: tripsError } = await query;

    if (tripsError) {
      throw tripsError;
    }

    // Return the filtered list of available trips.
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