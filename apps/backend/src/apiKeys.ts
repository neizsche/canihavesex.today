import { createHash, randomBytes } from 'node:crypto';

const API_KEY_PREFIX = 'chs_';
const API_KEY_PREFIX_LEN = 10;

function normalizeHeader(value: string | string[] | undefined): string | null {
  if (!value) return null;
  if (Array.isArray(value)) return value[0] ?? null;
  return value;
}

export function hashApiKey(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function generateApiKey(): { token: string; hash: string; prefix: string } {
  const token = `${API_KEY_PREFIX}${randomBytes(32).toString('base64url')}`;
  return {
    token,
    hash: hashApiKey(token),
    prefix: token.slice(0, API_KEY_PREFIX_LEN),
  };
}

export function extractApiKey(req: any): string | null {
  const authHeader = normalizeHeader(req.headers?.authorization);
  if (authHeader) {
    const match = authHeader.match(/^(bearer|token|apikey)\s+(.+)$/i);
    if (match?.[2]) return match[2].trim();
  }
  const apiKeyHeader = normalizeHeader(req.headers?.['x-api-key']);
  if (apiKeyHeader) return apiKeyHeader.trim();
  return null;
}
