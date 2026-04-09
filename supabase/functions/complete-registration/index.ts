// supabase/functions/complete-registration/index.ts

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.51.0';

Deno.serve(async (req: Request) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { userId, profileData } = await req.json();

    if (!userId || !profileData) {
      throw new Error('Missing userId or profileData');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

    // 1. Security check: Ensure the user was recently created (within 20 minutes)
    // This prevents existing users from being updated by unauthenticated requests.
    const { data: { user }, error: authError } = await supabaseAdmin.auth.admin.getUserById(userId);

    if (authError || !user) {
      console.error(`[complete-registration] User ${userId} not found.`);
      return new Response(JSON.stringify({ error: 'User not found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404,
      });
    }

    const createdAt = new Date(user.created_at).getTime();
    const now = Date.now();
    const window = 20 * 60 * 1000;

    if (now - createdAt > window) {
      console.error(`[complete-registration] Security check failed: User ${userId} was created too long ago.`);
      return new Response(JSON.stringify({ error: 'Registration window expired' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403,
      });
    }

    // 2. Perform the profile update using service role to bypass RLS
    console.log(`[complete-registration] Updating profile for user ${userId}...`);
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update(profileData)
      .eq('id', userId);

    if (updateError) {
      console.error(`[complete-registration] Database update failed:`, updateError);
      throw updateError;
    }

    console.log(`[complete-registration] Profile updated successfully for ${userId}.`);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    console.error('[complete-registration] CRITICAL ERROR:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
