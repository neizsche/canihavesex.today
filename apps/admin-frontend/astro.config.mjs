import { defineConfig } from 'astro/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEnv } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Load `.env` from the repo root so all apps share one config file.
const envDir = path.resolve(__dirname, '../..');

const mode = process.env.NODE_ENV === 'production' ? 'production' : 'development';
const env = loadEnv(mode, envDir, '');
const adminPort = Number(env.ADMIN_FRONTEND_PORT || 3001);
const adminPreviewPort = Number(env.ADMIN_FRONTEND_PREVIEW_PORT || adminPort);

export default defineConfig({
  devToolbar: {
    enabled: false,
  },
  vite: { envDir },
  server: { host: true, port: adminPort },
  preview: { port: adminPreviewPort },
});
