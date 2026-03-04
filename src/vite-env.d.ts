/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_SUPABASE_URL: string;
    readonly VITE_SUPABASE_ANON_KEY: string;
    readonly VITE_GOOGLE_MAPS_API_KEY?: string;
    readonly VITE_MERCADO_PAGO_PUBLIC_KEY?: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}

interface Window {
    google: any;
    MercadoPago: any;
}
