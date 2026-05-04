# Fletapp

Aplicacion React + Vite para conectar clientes con fleteros, gestionar viajes, ofertas, pagos, ubicacion y liquidaciones.

## Desarrollo local

1. Instalar dependencias:

```bash
npm install
```

2. Crear `.env.local` usando `.env.production.example` como referencia y cargar credenciales de desarrollo.

3. Ejecutar:

```bash
npm run dev
```

## Variables para produccion

Configurar estas variables en Vercel o en el hosting del frontend:

```bash
VITE_APP_PUBLIC_URL=https://fletapp.vercel.app
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-production-supabase-anon-key
VITE_GOOGLE_MAPS_API_KEY=your-browser-restricted-google-maps-key
VITE_MERCADO_PAGO_PUBLIC_KEY=your-production-mercado-pago-public-key
```

La clave de Google Maps debe estar restringida por dominio HTTP referrer y por APIs. Para esta app se usan mapas, Places, rutas/direcciones, geocoding y mapas embebidos.

## Supabase Edge Functions

Configurar secrets productivos en Supabase:

```bash
supabase secrets set APP_PUBLIC_URL=https://fletapp.vercel.app
supabase secrets set ALLOWED_WEB_ORIGINS=https://fletapp.vercel.app,https://your-custom-domain.com
supabase secrets set MERCADO_PAGO_TOKEN=your-production-mercado-pago-access-token
supabase secrets set VITE_MERCADO_PAGO_PUBLIC_KEY=your-production-mercado-pago-public-key
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
supabase secrets set VAPID_PUBLIC_KEY=your-vapid-public-key
supabase secrets set VAPID_PRIVATE_KEY=your-vapid-private-key
supabase secrets set VAPID_SUBJECT=mailto:admin@fletapp.com
supabase secrets set GEMINI_API_KEY=your-gemini-api-key
```

Luego desplegar functions:

```bash
supabase functions deploy mercadopago-proxy
supabase functions deploy mercadopago-webhook
supabase functions deploy send-push-notification
supabase functions deploy upload-proxy
supabase functions deploy gemini-proxy
```

## Paginas legales publicas

La app expone:

- `/privacidad`
- `/condiciones`

`vercel.json` incluye rewrites para que las rutas publicas funcionen al abrirlas directamente.
