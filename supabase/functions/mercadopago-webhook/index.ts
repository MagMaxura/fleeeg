
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.51.0';

// FIX: Added a Deno global declaration to resolve TypeScript errors in environments
// that don't have Deno types loaded by default (e.g., standard TS servers).
declare const Deno: any;

Deno.serve(async (req: Request) => {
  const appPublicUrl = Deno.env.get('APP_PUBLIC_URL') || 'https://www.fleteen.com';
  const requestOrigin = req.headers.get('Origin') || appPublicUrl;
  const allowedOrigins = new Set(
    [appPublicUrl, ...(Deno.env.get('ALLOWED_WEB_ORIGINS') || '').split(',')]
      .map((origin) => origin.trim())
      .filter(Boolean)
  );
  const corsOrigin = allowedOrigins.has(requestOrigin) ? requestOrigin : appPublicUrl;

  const corsHeaders = {
    'Access-Control-Allow-Origin': corsOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  };

  // Handle CORS preflight requests.
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const MERCADO_PAGO_TOKEN = Deno.env.get('MERCADO_PAGO_TOKEN');
    if (!MERCADO_PAGO_TOKEN) {
      throw new Error('MERCADO_PAGO_TOKEN env var is not configured.');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !supabaseServiceRoleKey) {
      throw new Error('Supabase env vars are not configured.');
    }
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

    // --- 1. Parse the Webhook Payload ---
    // Mercado Pago sends the resource ID in the query params (e.g., ?id=12345&topic=payment)
    // or in the body for newer V2 notifications.
    const url = new URL(req.url);
    const body = await req.json().catch(() => ({}));
    
    // Notification parameters can be in query or body
    const resourceId = url.searchParams.get('data.id') || url.searchParams.get('id') || body?.data?.id || body?.resource?.split('/').pop();
    const topic = url.searchParams.get('type') || url.searchParams.get('topic') || body?.type || body?.topic;

    console.log(`[Webhook Received] ID: ${resourceId}, Topic: ${topic}`);

    // We are interested in 'payment' notifications.
    if (topic === 'payment' && resourceId) {
      // --- 2. Fetch Payment Details from Mercado Pago ---
      const response = await fetch(`https://api.mercadopago.com/v1/payments/${resourceId}`, {
        headers: {
          'Authorization': `Bearer ${MERCADO_PAGO_TOKEN}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error fetching payment from MP:', errorText);
        throw new Error(`Failed to fetch payment details from MP: ${response.statusText}`);
      }

      const payment = await response.json();
      const status = payment.status;
      const tripId = payment.external_reference;

      console.log(`[Webhook Details] Payment ID: ${resourceId}, Status: ${status}, Trip ID (External Ref): ${tripId}`);

      // --- 3. Process Only Approved Payments ---
      if (status === 'approved' && tripId) {
        // --- 4. Update Trip Status in Supabase ---
        const { error: updateError } = await supabaseAdmin
          .from('trips')
          .update({ status: 'paid' })
          .eq('id', parseInt(tripId))
          // Only update if it's not already paid (idempotency)
          .neq('status', 'paid');

        if (updateError) {
          console.error(`Error updating trip ${tripId}:`, updateError);
          throw new Error(`Database update failed: ${updateError.message}`);
        }

        console.log(`[Success] Trip ${tripId} status updated to 'paid'.`);
        
        // --- 5. Optional: Send Notification to Driver/Customer ---
        // You could invoke another function here if needed.
        /*
        await supabaseAdmin.functions.invoke('send-push-notification', {
           body: { 
             userId: payment.payer.id, // Or from trip data
             title: 'Pago Confirmado',
             body: 'El pago de tu viaje ha sido procesado con éxito.'
           }
        });
        */
      } else {
        console.log(`[Ignored] Payment ${resourceId} status is ${status} or external_reference is missing.`);
      }
    } else {
      console.log(`[Ignored] Notification topic ${topic} is not 'payment'.`);
    }

    // Mercado Pago expects a 200/201 response quickly to acknowledge receipt.
    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Error in mercadopago-webhook:', error);
    // Even if there is an error, we should return 200 if we want MP to stop retrying immediately 
    // unless we actually want them to retry later (up to 4 days).
    // For critical database errors, we might want MP to retry.
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
