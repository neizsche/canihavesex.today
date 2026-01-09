import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

function parseAndMergeDotenv(raw: string) {
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx <= 0) continue;
    const key = trimmed.slice(0, idx).trim();
    let value = trimmed.slice(idx + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (process.env[key] == null || process.env[key] === '') {
      process.env[key] = value;
    }
  }
}

/**
 * Loads a single repo-root `.env` file (if present).
 *
 * This keeps configuration unified for the monorepo, while still allowing
 * platform-provided env vars to win.
 */
export function loadEnv() {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);

  // apps/backend/src -> repo root
  const repoEnvPath = path.resolve(__dirname, '..', '..', '..', '.env');
  if (!fs.existsSync(repoEnvPath)) return;

  const raw = fs.readFileSync(repoEnvPath, 'utf8');
  parseAndMergeDotenv(raw);

  // Convenience aliases to keep a single naming convention in the monorepo env.
  // (Backend code uses PORT/HOST; allow BACKEND_PORT/BACKEND_HOST too.)
  if ((!process.env.PORT || process.env.PORT === '') && process.env.BACKEND_PORT) {
    process.env.PORT = process.env.BACKEND_PORT;
  }
  if ((!process.env.HOST || process.env.HOST === '') && process.env.BACKEND_HOST) {
    process.env.HOST = process.env.BACKEND_HOST;
  }
}

