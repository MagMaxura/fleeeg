// FIX: Added a Deno global declaration to resolve TypeScript errors in environments
// that don't have Deno types loaded by default (e.g., standard TS servers).
declare const Deno: any;

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.51.0';

Deno.serve(async (req: Request) => {
  // A simplified, known-good CORS configuration to prevent preflight failures.
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  // Handle CORS preflight requests.
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // --- Seguridad: Obtener el Access Token de Mercado Pago de forma segura ---
    const MERCADO_PAGO_TOKEN = Deno.env.get('MERCADO_PAGO_TOKEN');
    if (!MERCADO_PAGO_TOKEN) {
      throw new Error('La variable de entorno MERCADO_PAGO_TOKEN no está configurada.');
    }
    
    // --- Inicializar el cliente de Supabase Admin ---
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !supabaseServiceRoleKey) {
      throw new Error('Las variables de entorno de Supabase no están configuradas.');
    }
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

    // Extrae los detalles del viaje del cuerpo de la solicitud del frontend.
    const { trip } = await req.json();
    if (!trip || !trip.id || !trip.final_price || !trip.cargo_details || !trip.customer_id || !trip.origin || !trip.destination) {
      throw new Error('Faltan detalles del viaje en el payload (id, price, details, customer, origin, or destination).');
    }
    
    // --- Obtener los datos completos del cliente ---
    const { data: customer, error: customerError } = await supabaseAdmin
      .from('profiles')
      .select('email, full_name') // Fetch full_name as well
      .eq('id', trip.customer_id)
      .single();
      
    if (customerError) {
      console.error('Error fetching customer profile:', customerError);
      throw new Error(`Error al buscar el perfil del cliente: ${customerError.message}`);
    }
    if (!customer) {
      throw new Error(`No se encontró el cliente con ID: ${trip.customer_id}`);
    }
    
    // Use the request's Origin header for the redirect URLs, with a fallback to production.
    const backUrlOrigin = req.headers.get('Origin') || 'https://fletapp.vercel.app';

    // Split name for Mercado Pago payer info
    const nameParts = (customer.full_name || '').split(' ');
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(' ');

    // --- Crea la "Preferencia de Pago" para Mercado Pago ---
    const preference = {
      items: [
        {
          id: trip.id.toString(),
          title: `Flete: ${trip.cargo_details}`,
          description: `Servicio de flete desde ${trip.origin} a ${trip.destination}`,
          quantity: 1,
          currency_id: 'ARS', // Moneda Argentina
          unit_price: trip.final_price,
        },
      ],
      payer: {
        email: customer.email,
        name: firstName,
        surname: lastName,
      },
      // URLs a las que Mercado Pago redirigirá al usuario después del pago.
      back_urls: {
        success: `${backUrlOrigin}?payment_status=success&trip_id=${trip.id}`,
        failure: `${backUrlOrigin}?payment_status=failure&trip_id=${trip.id}`,
        pending: `${backUrlOrigin}?payment_status=pending&trip_id=${trip.id}`,
      },
      auto_return: 'approved', // Regresa automáticamente al sitio solo si el pago es aprobado.
    };

    // Realiza la llamada a la API de Mercado Pago para crear la preferencia.
    const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${MERCADO_PAGO_TOKEN}`,
      },
      body: JSON.stringify(preference),
    });

    if (!response.ok) {
        const errorBody = await response.text();
        console.error('Error de la API de Mercado Pago:', errorBody);
        throw new Error(`Error al crear la preferencia de pago: ${response.statusText}`);
    }

    const data = await response.json();

    // Devuelve el ID de la preferencia al frontend.
    return new Response(JSON.stringify({ preferenceId: data.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Error en la Edge Function mercadopago-proxy:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
