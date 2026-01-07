export function getApiBase(): string {
  return (import.meta.env.PUBLIC_API_BASE || 'http://localhost:8787').replace(/\/$/, '');
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
