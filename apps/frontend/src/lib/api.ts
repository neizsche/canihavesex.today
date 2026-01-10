export function getApiBase(): string {
  const env = import.meta.env as any;
  const base = env.PUBLIC_BACKEND_BASE;
  if (!base) {
    throw new Error('Missing PUBLIC_BACKEND_BASE. Set it in the repo-root .env file.');
  }
  return String(base).replace(/\/$/, '');
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

export function currentReturnTo(): string {
  if (typeof window === 'undefined') return '/';
  const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  return current || '/';
}

export type Risk = 'HIGH' | 'MEDIUM' | 'LOW';

export function riskBadgeVariant(risk: Risk): 'riskHigh' | 'riskMedium' | 'riskLow' {
  if (risk === 'HIGH') return 'riskHigh';
  if (risk === 'MEDIUM') return 'riskMedium';
  return 'riskLow';
}

export function fertilityPct(fertilityIndex: number): number {
  const pct = Math.round(Math.min(100, Math.max(0, fertilityIndex * 12.5)));
  return pct;
}

export async function checkAuth(): Promise<boolean> {
  try {
    const res = await apiFetch('/api/session');
    return res.ok;
  } catch {
    return false;
  }
}
