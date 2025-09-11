// FIX: Added a Deno global declaration to resolve TypeScript errors in environments
// that don't have Deno types loaded by default (e.g., standard TS servers).
declare const Deno: any;

Deno.serve(async (req: Request) => {
  // Set CORS headers to be dynamic based on the request origin.
  const origin = req.headers.get('Origin') || '*';
  const corsHeaders = {
    'Access-Control-Allow-Origin': origin,
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

    // Extrae los detalles del viaje del cuerpo de la solicitud del frontend.
    const { trip } = await req.json();
    if (!trip || !trip.id || !trip.final_price || !trip.cargo_details) {
      throw new Error('Faltan detalles del viaje en el payload.');
    }
    
    // Use the request's Origin header for the redirect URLs, with a fallback to production.
    const backUrlOrigin = req.headers.get('Origin') || 'https://fletapp.vercel.app';

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