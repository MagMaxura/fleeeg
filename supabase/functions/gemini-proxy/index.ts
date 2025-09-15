// FIX: Added a Deno global declaration to resolve TypeScript errors in environments
// that don't have Deno types loaded by default (e.g., standard TS servers).
declare const Deno: any;

// Importa los módulos necesarios. '@google/genai' para la IA.
// FIX: Switched from the potentially unstable `npm:` specifier to a direct `esm.sh` import.
// This ensures the module is loaded in a web-compatible ES module format that is more
// reliable in Deno, resolving the "Failed to send a request" error caused by a startup crash.
import { GoogleGenAI, Type } from 'https://esm.sh/@google/genai@0.24.0';

// --- Lógica Principal de la Función ---
Deno.serve(async (req: Request) => {
  // Set CORS headers to be dynamic based on the request origin.
  // This allows any domain to access the function, which is crucial for development and previews.
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
    // --- Seguridad: Obtener la API Key de forma segura ---
    // Leemos la clave de API desde los "Secrets" de la función en el dashboard de Supabase.
    // NUNCA escribas la clave directamente en el código.
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    if (!GEMINI_API_KEY) {
      throw new Error('La variable de entorno GEMINI_API_KEY no está configurada en los secretos de la función.');
    }
    
    // --- Router Lógico: Determinar qué acción realizar ---
    // Extraemos la acción y el payload del cuerpo JSON de la petición del frontend.
    const { action, payload } = await req.json();

    // @google/genai Coding Guidelines: Incorrect constructor `new GoogleGenAI(API_KEY)`. Must use a named parameter.
    // FIX: Updated constructor to use a named parameter as required.
    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
    let prompt: string;
    let schema: any; // Usamos 'any' porque el esquema cambia dinámicamente

    // Construimos el prompt y el esquema de respuesta según la acción solicitada.
    if (action === 'getDriverEta') {
      const { driverLocation, tripOrigin } = payload;
      if (!driverLocation || !tripOrigin) {
        throw new Error('Faltan datos en el payload para la acción getDriverEta');
      }
      
      prompt = `Calcula el tiempo de viaje estimado en minutos para que un conductor vaya desde su ubicación actual a un punto de recogida. Ubicación actual del conductor: "${driverLocation}". Origen de recogida del viaje: "${tripOrigin}". Proporciona un único tiempo estimado de llegada (ETA) en minutos como un objeto JSON.`;

      schema = {
        type: Type.OBJECT,
        properties: {
          etaMinutes: { type: Type.NUMBER, description: 'Tiempo estimado de llegada en minutos para que el conductor alcance la ubicación de recogida.' },
        },
        required: ['etaMinutes'],
      };

    } else {
      throw new Error(`Acción no válida especificada: "${action}"`);
    }

    // --- Llamada a la API de Gemini ---
    const response = await ai.models.generateContent({
      // @google/genai Coding Guidelines: Do not use deprecated model `gemini-1.5-flash`. Use `gemini-2.5-flash`.
      // FIX: Updated deprecated model 'gemini-1.5-flash' to 'gemini-2.5-flash'.
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: schema,
      }
    });

    // Devolvemos la respuesta JSON de Gemini al frontend.
    return new Response(response.text, {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    // --- Manejo de Errores ---
    // Si algo sale mal (API key faltante, JSON malformado, error de Gemini, etc.),
    // lo capturamos y devolvemos una respuesta de error clara al frontend.
    console.error('Error en la Edge Function gemini-proxy:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500, // Usamos un código de error de servidor.
    });
  }
});