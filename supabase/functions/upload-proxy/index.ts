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
  const origin = req.headers.get('Origin') || '*';
  const corsHeaders = {
    'Access-Control-Allow-Origin': origin,
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
    const authHeader = req.headers.get('Authorization')!;
    const jwt = authHeader.replace('Bearer ', '');
    // We need the anon key to initialize the client for user authentication
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    const { data: { user }, error: userError } = await createClient(supabaseUrl, supabaseAnonKey)
      .auth.getUser(jwt);

    if (userError || !user) {
      console.error('[upload-proxy] Authentication failed:', userError?.message || 'No user found from JWT.');
      throw new Error('Authentication failed: ' + (userError?.message || 'No user found'));
    }
    console.log(`[upload-proxy] User authenticated successfully. User ID: ${user.id}`);
    
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
    
    // 3. Security check: Ensure user is uploading to their own folder and using a valid bucket.
    console.log('[upload-proxy] Step 3: Performing security check...');
    const allowedBuckets = ['foto-perfil', 'vehicle-photos'];
    if (!allowedBuckets.includes(bucket)) {
        console.error(`[upload-proxy] Security check failed. Invalid bucket specified: ${bucket}.`);
        return new Response(JSON.stringify({ error: `Invalid bucket specified.` }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400, // Bad Request
        });
    }

    const pathParts = path.split('/');
    if (pathParts.length < 2 || pathParts[1] !== user.id) {
       console.error(`[upload-proxy] Security check failed. User ${user.id} attempted to write to path ${path}.`);
       return new Response(JSON.stringify({ error: `Unauthorized path. You can only upload to your own folder.` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403, // Forbidden
      });
    }
    console.log('[upload-proxy] Security check passed.');

    // 4. Initialize Supabase client with Service Role Key to bypass RLS
    console.log('[upload-proxy] Step 4: Initializing Admin Supabase client...');
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);
    console.log('[upload-proxy] Admin client initialized.');


    // 5. Upload the file to the specified Supabase Storage bucket
    console.log(`[upload-proxy] Step 5: Uploading file to storage bucket '${bucket}' at path: ${path}`);
    const { error: uploadError } = await supabaseAdmin.storage
      .from(bucket)
      .upload(path, file, {
        cacheControl: '3600',
        upsert: false, // Don't replace existing files
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