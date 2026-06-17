import { config } from './config.js';

export function getApiBase(): string {
  return config.backendBase;
}

export async function apiFetch(path: string, init: RequestInit = {}) {
  const base = getApiBase();
  const url = `${base}${path.startsWith('/') ? path : `/${path}`}`;
  return fetch(url, {
    ...init,
    credentials: 'include',
    headers: {
      'X-Requested-With': 'XMLHttpRequest',
      ...(init.headers || {}),
    },
  });
}

export class UnauthorizedError extends Error {
  constructor(message = 'Unauthorized') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

export interface ApiJsonOptions {
  /** Number of additional attempts after the first on transient failures (network / 5xx / timeout). */
  retries?: number;
  /** Per-attempt timeout in ms. Aborts the request so a hung connection can't stall the UI. */
  timeoutMs?: number;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function apiJson<T>(
  path: string,
  init: RequestInit = {},
  opts: ApiJsonOptions = {}
): Promise<T> {
  const { retries = 0, timeoutMs } = opts;
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    // Per-attempt AbortController for the timeout. Respect a caller-provided signal too.
    const controller = timeoutMs ? new AbortController() : undefined;
    const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : undefined;
    try {
      const res = await apiFetch(path, controller ? { ...init, signal: controller.signal } : init);
      if (res.status === 401) throw new UnauthorizedError();
      // Retry transient server errors; client errors (4xx) are deterministic — don't.
      if (res.status >= 500 && attempt < retries) {
        lastError = new Error(`Request failed: ${res.status}`);
      } else if (!res.ok) {
        throw new Error(`Request failed: ${res.status}`);
      } else {
        return (await res.json()) as T;
      }
    } catch (err) {
      // Never retry auth failures.
      if (err instanceof UnauthorizedError) throw err;
      lastError = err;
      if (attempt >= retries) throw err;
    } finally {
      if (timer) clearTimeout(timer);
    }

    // Exponential backoff before the next attempt.
    await sleep(300 * 2 ** attempt);
  }

  throw lastError instanceof Error ? lastError : new Error('Request failed');
}

export function currentReturnTo(): string {
  if (typeof window === 'undefined') return '/';
  const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  return current || '/';
}
