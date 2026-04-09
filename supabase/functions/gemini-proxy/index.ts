// supabase/functions/gemini-proxy/index.ts

import { GoogleGenerativeAI, SchemaType } from 'https://esm.sh/@google/generative-ai@0.24.0';

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
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY not configured.');
    }
    
    const { action, payload } = await req.json();
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    
    // Use gemini-2.0-flash (or 1.5 flash)
    const model = genAI.getGenerativeModel({ 
        model: 'gemini-2.0-flash',
    });

    let prompt: string;
    let schema: any;
    let contents: any;

    if (action === 'getDriverEta') {
      const { driverLocation, tripOrigin } = payload;
      if (!driverLocation || !tripOrigin) throw new Error('Missing data for getDriverEta');
      
      prompt = `Calcula el tiempo de viaje estimado en minutos para que un conductor vaya desde su ubicación actual a un punto de recogida. Ubicación actual del conductor: "${driverLocation}". Origen de recogida del viaje: "${tripOrigin}". Proporciona un único tiempo estimado de llegada (ETA) en minutos como un objeto JSON.`;
      schema = {
        type: SchemaType.OBJECT,
        properties: {
          etaMinutes: { type: SchemaType.NUMBER, description: 'ETA in minutes' },
        },
        required: ['etaMinutes'],
      };
      contents = [{ role: 'user', parts: [{ text: prompt }] }];

    } else if (action === 'extractCardData') {
      const { image, mimeType } = payload;
      if (!image || !mimeType) throw new Error('Missing image data for extractCardData');

      prompt = `Analiza la imagen de esta identificación y extrae: nombre completo (full_name), número de documento (dni), dirección (address), ciudad (city) y provincia (province). Omite campos no legibles. Devuelve JSON.`;
      schema = {
        type: SchemaType.OBJECT,
        properties: {
          full_name: { type: SchemaType.STRING },
          dni: { type: SchemaType.STRING },
          address: { type: SchemaType.STRING },
          city: { type: SchemaType.STRING },
          province: { type: SchemaType.STRING },
        }
      };
      contents = [{
        role: 'user',
        parts: [
          { text: prompt },
          { inlineData: { data: image, mimeType: mimeType } }
        ]
      }];

    } else {
      throw new Error(`Invalid action: "${action}"`);
    }

    const result = await model.generateContent({
      contents: contents,
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: schema,
      }
    });

    return new Response(result.response.text(), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    console.error('Error in gemini-proxy:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
