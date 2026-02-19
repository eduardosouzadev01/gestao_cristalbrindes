
/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_SUPABASE_URL: string
    readonly VITE_SUPABASE_ANON_KEY: string
    readonly VITE_XBZ_CNPJ: string
    readonly VITE_XBZ_TOKEN: string
    readonly VITE_ASIA_API_KEY: string
    readonly VITE_ASIA_SECRET_KEY: string
    readonly VITE_SPOT_ACCESS_KEY: string
    // more env variables...
}

interface ImportMeta {
    readonly env: ImportMetaEnv
}
