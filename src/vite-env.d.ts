/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_DATABASE_URL: string;
    readonly VITE_NEON_AUTH_URL: string;
    readonly VITE_NEON_JWKS_URL: string;
    readonly VITE_NEON_API_URL: string;
    readonly VITE_SUPABASE_URL: string;
    readonly VITE_SUPABASE_ANON_KEY: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
