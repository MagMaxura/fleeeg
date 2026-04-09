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
    const body = await req.json();
    const { userId, profileData } = body;

    console.log(`[complete-registration] Inicando registro para ${userId}`);

    if (!userId || !profileData) {
      throw new Error('Falta userId o profileData en la solicitud.');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      console.error('[complete-registration] ERROR: Variables de entorno SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY no configuradas.');
      throw new Error('Configuración del servidor incompleta (Service Role Key faltante).');
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

    // 1. Security check: Ensure the user exists and was recently created
    const { data: { user }, error: authError } = await supabaseAdmin.auth.admin.getUserById(userId);

    if (authError || !user) {
      console.error(`[complete-registration] Usuario ${userId} no encontrado en auth.users.`);
      return new Response(JSON.stringify({ error: 'Usuario no encontrado' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404,
      });
    }

    // 20 minute window for security
    const createdAt = new Date(user.created_at).getTime();
    const now = Date.now();
    const window = 20 * 60 * 1000;

    if (now - createdAt > window) {
      console.warn(`[complete-registration] Intento de actualización fuera de ventana: ${userId}`);
      return new Response(JSON.stringify({ error: 'La ventana de registro ha expirado por seguridad.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403,
      });
    }

    // 2. Perform the profile update using UPSERT to be robust if the row doesn't exist yet
    console.log(`[complete-registration] Procesando UPSERT de perfil para ${userId}...`);
    
    // Lista explícita de campos permitidos en la tabla 'profiles'
    const allowedFields = [
      'full_name', 'dni', 'phone', 'address', 'city', 'province', 
      'role', 'vehicle', 'vehicle_type', 'capacity_kg', 'capacity_m3', 
      'service_radius_km', 'photo_url', 'vehicle_photo_url', 'payment_info', 
      'dni_front_url', 'dni_back_url', 'license_url'
    ];

    // Construir el payload incluyendo ID y Email (obligatorios para un nuevo registro)
    const upsertPayload: any = {
      id: userId,
      email: user.email
    };

    for (const key of allowedFields) {
      if (profileData[key] !== undefined) {
        // Asegurar que los campos numéricos sean números
        if (['capacity_kg', 'capacity_m3', 'service_radius_km'].includes(key)) {
          upsertPayload[key] = (profileData[key] === null || profileData[key] === "") ? null : Number(profileData[key]);
        } else {
          upsertPayload[key] = profileData[key];
        }
      }
    }

    console.log(`[complete-registration] Ejecutando UPSERT...`);

    const { error: dbError } = await supabaseAdmin
      .from('profiles')
      .upsert(upsertPayload, { onConflict: 'id' });

    if (dbError) {
      console.error(`[complete-registration] Error de base de datos para ${userId}:`, dbError);
      return new Response(JSON.stringify({ 
        error: 'Error de base de datos.',
        details: dbError.message,
        hint: dbError.hint,
        code: dbError.code
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    console.log(`[complete-registration] Perfil guardado exitosamente.`);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });


  } catch (error: any) {
    console.error('[complete-registration] ERROR CRÍTICO:', error.message);
    return new Response(JSON.stringify({ 
      error: 'Error interno del servidor al procesar el registro.',
      details: error.message 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});

