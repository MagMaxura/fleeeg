// supabase/functions/upload-proxy/index.ts

// FIX: Added a Deno global declaration to resolve TypeScript errors in environments
// that don't have Deno types loaded by default (e.g., standard TS servers).
declare const Deno: any;

// FIX: Switched from 'npm:' specifier to a direct 'esm.sh' import.
// This provides a more stable, web-standard module that is less likely to have
// compatibility issues with Deno's runtime when processing FormData,
// which is the likely cause of the "Failed to send a request" error.
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

  console.log(`[upload-proxy] Invoked at: ${new Date().toISOString()}`);

  try {
    // 1. Authenticate the user from the request headers
    console.log('[upload-proxy] Step 1: Authenticating user...');
    const authHeader = req.headers.get('Authorization');
    let user: any = null;
    let isAuthenticated = false;

    // Use anon client for getUser if we have a token
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
      throw new Error('Supabase environment variables (URL, Anon Key, or Service Role Key) are not defined.');
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

    if (authHeader) {
      const jwt = authHeader.replace('Bearer ', '');
      const { data: { user: authUser }, error: userError } = await createClient(supabaseUrl, supabaseAnonKey)
        .auth.getUser(jwt);
      
      if (!userError && authUser) {
        user = authUser;
        isAuthenticated = true;
        console.log(`[upload-proxy] User authenticated successfully via JWT. User ID: ${user.id}`);
      } else {
        console.warn(`[upload-proxy] JWT provided but authentication failed: ${userError?.message || 'Unknown error'}`);
      }
    }

    // 2. Get file, path, and bucket from the multipart form data
    console.log('[upload-proxy] Step 2: Parsing FormData...');
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const path = formData.get('path') as string | null;
    const bucket = formData.get('bucket') as string | null;

    if (!file || !path || !bucket) {
      console.error('[upload-proxy] FormData parsing failed: File, path, or bucket not provided.');
      throw new Error('File, path, or bucket not provided in form data.');
    }
    console.log(`[upload-proxy] FormData parsed. Bucket: "${bucket}", Path: "${path}", File: "${file.name}" (${file.size} bytes)`);

    // 3. Extract target User ID from path
    const pathParts = path.split('/');
    if (pathParts.length < 2) {
      throw new Error('Invalid path format. Expected "folder/userId/filename".');
    }
    const targetUserId = pathParts[1];

    // 4. Security check and fallback authentication (for registration)
    console.log('[upload-proxy] Step 4: Performing security check...');
    const allowedBuckets = ['foto-perfil', 'vehicle-photos', 'cargo-photos'];
    if (!allowedBuckets.includes(bucket)) {
      console.error(`[upload-proxy] Security check failed. Invalid bucket specified: ${bucket}.`);
      return new Response(JSON.stringify({ error: `Invalid bucket specified.` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    if (!isAuthenticated) {
      console.log(`[upload-proxy] No authenticated session. Checking if user ${targetUserId} was recently created for registration...`);
      
      // Check if the user exists in auth.users via admin client
      // Note: In Deno Edge Functions, we typically can't query auth.users directly with the client
      // unless we use RPC or a specific admin API. Use getUserById instead.
      const { data: { user: dbUser }, error: adminError } = await supabaseAdmin.auth.admin.getUserById(targetUserId);

      if (adminError || !dbUser) {
        console.error(`[upload-proxy] Fallback auth failed: User ${targetUserId} not found.`, adminError?.message);
        return new Response(JSON.stringify({ error: "Authentication failed. You must be logged in or have recently signed up." }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401,
        });
      }

      // Allow upload if user was created in the last 60 minutes (registration window)
      const createdAt = new Date(dbUser.created_at).getTime();
      const now = Date.now();
      const sixtyMinutes = 60 * 60 * 1000;

      if (now - createdAt > sixtyMinutes) {
        console.error(`[upload-proxy] Fallback auth failed: User ${targetUserId} was created more than 15 minutes ago and is not authenticated.`);
        return new Response(JSON.stringify({ error: "Session expired. Please log in to upload files." }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 403,
        });
      }

      user = dbUser;
      console.log(`[upload-proxy] Fallback auth successful. Allowing upload for recently created user: ${user.id}`);
    } else {
      // If authenticated, ensure they are uploading to their own folder
      if (targetUserId !== user.id) {
        console.error(`[upload-proxy] Security check failed. Authenticated user ${user.id} attempted to write to path belonging to ${targetUserId}.`);
        return new Response(JSON.stringify({ error: `Unauthorized path. You can only upload to your own folder.` }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 403,
        });
      }
    }
    console.log('[upload-proxy] Security check passed.');

    // 5. Upload the file to the specified Supabase Storage bucket
    console.log(`[upload-proxy] Step 5: Uploading file to storage bucket '${bucket}' at path: ${path}`);
    const { error: uploadError } = await supabaseAdmin.storage
      .from(bucket)
      .upload(path, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      console.error('[upload-proxy] Storage upload failed:', JSON.stringify(uploadError, null, 2));
      throw uploadError;
    }
    console.log('[upload-proxy] File uploaded successfully.');

    // 6. Get the public URL of the uploaded file
    console.log('[upload-proxy] Step 6: Retrieving public URL...');
    const { data: urlData } = supabaseAdmin.storage
      .from(bucket)
      .getPublicUrl(path);

    if (!urlData.publicUrl) {
      console.error('[upload-proxy] Failed to get public URL after successful upload.');
      throw new Error('Could not get public URL for the uploaded file.');
    }
    console.log(`[upload-proxy] Public URL retrieved: ${urlData.publicUrl}`);

    // 7. Return the public URL
    console.log('[upload-proxy] Step 7: Returning public URL to client.');
    return new Response(JSON.stringify({ publicUrl: urlData.publicUrl }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('[upload-proxy] CRITICAL ERROR:', error.message);
    // Log the full error object and stack for deep debugging
    console.error('[upload-proxy] Full error object:', JSON.stringify(error, null, 2));
    console.error('[upload-proxy] Stack trace:', error.stack);

    return new Response(JSON.stringify({
      error: 'An internal server error occurred in the upload function.',
      details: error.message
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
