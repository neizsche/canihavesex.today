/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly PUBLIC_BACKEND_BASE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
