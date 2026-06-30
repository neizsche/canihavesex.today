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
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    } else {
      // Strip inline comments for unquoted values
      const commentIdx = value.indexOf(' #');
      if (commentIdx !== -1) {
        value = value.slice(0, commentIdx).trim();
      }
    }
    if (process.env[key] == null || process.env[key] === '') {
      process.env[key] = value;
    }
  }
}

/**
 * Loads environment variables from repo-root `.env` files.
 *
 * Loading order (later files override earlier ones):
 * 1. .env.{NODE_ENV} (e.g., .env.development or .env.production)
 * 2. .env (generic fallback for local overrides)
 *
 * Platform-provided env vars always take precedence over file-based config.
 */
export function loadEnv() {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);

  // apps/backend/src -> repo root
  const repoRoot = path.resolve(__dirname, '..', '..', '..');

  // Determine environment
  const nodeEnv = process.env.NODE_ENV || 'development';

  // Load environment-specific file first (.env.development or .env.production)
  const envSpecificPath = path.join(repoRoot, `.env.${nodeEnv}`);
  if (fs.existsSync(envSpecificPath)) {
    const raw = fs.readFileSync(envSpecificPath, 'utf8');
    parseAndMergeDotenv(raw);
    console.log(`✓ Loaded environment config from .env.${nodeEnv}`);
  }

  // Load generic .env as fallback/override
  const genericEnvPath = path.join(repoRoot, '.env');
  if (fs.existsSync(genericEnvPath)) {
    const raw = fs.readFileSync(genericEnvPath, 'utf8');
    parseAndMergeDotenv(raw);
  }

  // Convenience aliases to keep a single naming convention in the monorepo env.
  // (Backend code uses PORT/HOST; allow BACKEND_PORT/BACKEND_HOST too.)
  if ((!process.env.PORT || process.env.PORT === '') && process.env.BACKEND_PORT) {
    process.env.PORT = process.env.BACKEND_PORT;
  }
  if ((!process.env.HOST || process.env.HOST === '') && process.env.BACKEND_HOST) {
    process.env.HOST = process.env.BACKEND_HOST;
  }

  // Log environment info
  console.log(`🚀 Backend starting in ${nodeEnv.toUpperCase()} mode`);
  if (process.env.PUBLIC_BACKEND_BASE) {
    console.log(`   Backend URL: ${process.env.PUBLIC_BACKEND_BASE}`);
  }
}
