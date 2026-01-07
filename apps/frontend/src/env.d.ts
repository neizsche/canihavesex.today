/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly DEV: boolean;
  readonly PUBLIC_API_BASE?: string;
  readonly PUBLIC_DEV_AUTOLOGIN?: string;
  readonly PUBLIC_DEMO_EMAIL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
