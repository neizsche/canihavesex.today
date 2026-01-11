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

export async function apiJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await apiFetch(path, init);
  if (res.status === 401) throw new UnauthorizedError();
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return (await res.json()) as T;
}

export function currentReturnTo(): string {
  if (typeof window === 'undefined') return '/';
  const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  return current || '/';
}

export type Risk = 'HIGH' | 'MEDIUM' | 'LOW' | 'INSUFFICIENT_DATA';

export function riskBadgeVariant(risk: Risk): 'riskHigh' | 'riskMedium' | 'riskLow' | 'secondary' {
  if (risk === 'HIGH') return 'riskHigh';
  if (risk === 'MEDIUM') return 'riskMedium';
  if (risk === 'LOW') return 'riskLow';
  if (risk === 'INSUFFICIENT_DATA') return 'secondary';
  return 'secondary';
}

export function fertilityPct(fertilityIndex: number): number {
  const pct = Math.round(Math.min(100, Math.max(0, fertilityIndex * 12.5)));
  return pct;
}

export async function checkAuth(): Promise<boolean> {
  try {
    const res = await apiFetch('/session');
    return res.ok;
  } catch (error) {
    // If backend is not available, treat as unauthenticated
    if (config.devMode) {
      console.warn('Backend not available for auth check:', error);
    }
    return false;
  }
}

/**
 * Check if the backend API is available
 */
export async function checkBackendHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${getApiBase()}/health`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    return res.ok;
  } catch (error) {
    if (config.devMode) {
      console.warn('Backend health check failed:', error);
    }
    return false;
  }
}

