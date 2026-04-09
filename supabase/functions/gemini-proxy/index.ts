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
      console.error('GEMINI_API_KEY is missing in environment variables');
      return new Response(
        JSON.stringify({ error: 'Configuración incompleta: falta GEMINI_API_KEY en Supabase.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }
    
    const body = await req.json();
    const { action, payload } = body;
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    
    // Using gemini-2.0-flash as requested
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
        description: "Estimated time of arrival",
        type: SchemaType.OBJECT,
        properties: {
          etaMinutes: { type: SchemaType.NUMBER },
        },
        required: ['etaMinutes'],
      };
      contents = [{ role: 'user', parts: [{ text: prompt }] }];

    } else if (action === 'extractCardData') {
      const { image, mimeType } = payload;
      if (!image || !mimeType) throw new Error('Faltan datos de la imagen para extraer información.');

      prompt = `Analiza la imagen de esta identificación (DNI/Cédula) y extrae la información requerida en formato JSON. Si algún campo no es legible, devuélvelo como null.`;
      schema = {
        description: "Información extraída del documento de identidad",
        type: SchemaType.OBJECT,
        properties: {
          full_name: { type: SchemaType.STRING, description: "Nombre completo tal como aparece en el documento" },
          dni: { type: SchemaType.STRING, description: "Número de documento de identidad" },
          address: { type: SchemaType.STRING, description: "Dirección completa si figura" },
          city: { type: SchemaType.STRING, description: "Ciudad o localidad" },
          province: { type: SchemaType.STRING, description: "Provincia o estado" },
        },
        required: ['full_name', 'dni']
      };
      
      contents = [{
        role: 'user',
        parts: [
          { text: prompt },
          { inlineData: { data: image, mimeType: mimeType } }
        ]
      }];

    } else {
      throw new Error(`Acción no válida: "${action}"`);
    }

    const result = await model.generateContent({
      contents: contents,
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: schema,
      }
    });

    const responseText = result.response.text();
    console.log('Gemini response:', responseText);

    return new Response(responseText, {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    console.error('Error total en gemini-proxy:', error);
    return new Response(JSON.stringify({ 
      error: 'Error interno en el procesador de documentos.',
      details: error.message 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});

