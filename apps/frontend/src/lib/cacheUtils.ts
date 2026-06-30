import { QueryClient } from '@tanstack/react-query';

// --- Persisted query cache (localStorage) ------------------------------------
// Bumped to v2 when persistence was scoped to non-sensitive keys. The rename
// auto-evicts any legacy v1 blob, which may have contained health data from
// before the allowlist existed.
export const PERSIST_KEY = 'chs-query-cache-v2';
export const LEGACY_PERSIST_KEY = 'chs-query-cache';
export const PERSIST_MAX_AGE = 24 * 60 * 60 * 1000; // 24 hours

// Only these query keys are allowed to touch localStorage. They exist purely to
// avoid the loading-gate / paywall flash for returning users, and carry no
// daily health data. Everything sensitive — logs, insights, calendar, stats —
// is kept in memory only and NEVER persisted to disk.
const PERSISTABLE_KEYS = new Set(['session', 'billing-status']);

export function isPersistableQueryKey(queryKey: readonly unknown[]): boolean {
  return typeof queryKey[0] === 'string' && PERSISTABLE_KEYS.has(queryKey[0]);
}

/** Drop the persisted blob (and any legacy one) — call on logout / 401. */
export function clearPersistedCache(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(PERSIST_KEY);
    window.localStorage.removeItem(LEGACY_PERSIST_KEY);
  } catch {
    /* localStorage unavailable — nothing to clear */
  }
}

type TodayData = {
  date: string;
  risk: 'HIGH' | 'MEDIUM' | 'LOW' | 'INSUFFICIENT_DATA';
  explanation: string;
  disclaimer?: string;
  analytics?: {
    confidence: number;
    todayCycleDay: number;
    confirmed: boolean;
    warnings: string[];
    signals: Array<{ source: string; explain: string }>;
    coverage: { critical_gap: boolean };
  } | null;
};

type ChartDay = {
  date: string;
  risk: 'HIGH' | 'MEDIUM' | 'LOW' | 'INSUFFICIENT_DATA';
  temperature: number | null;
  fertilityIndex: number;
  lhTest: 'positive' | 'negative' | 'notTaken';
};

type ChartData = {
  cycle: {
    id?: string;
    startDate: string;
    state: string;
    peakDate: string | null;
    tempShiftConfirmedDate: string | null;
  } | null;
  analytics?: {
    anchorCycleDay: number;
    windowCycleDay: { start: number; end: number };
    confidence: number;
    confirmed: boolean;
    warnings: string[];
    coverage: { critical_gap: boolean };
  } | null;
  days: ChartDay[];
  disclaimer?: string;
};

export type MutationResponse = {
  ok: boolean;
  today?: TodayData;
  chart?: ChartData;
  [key: string]: any;
};

/**
 * Update cache with data from mutation responses
 * Eliminates need for refetches after mutations
 */
export function updateCacheFromMutation(
  queryClient: QueryClient,
  response: MutationResponse
): void {
  if (response.today) {
    queryClient.setQueryData(['insights', 'today'], response.today);
  }

  if (response.chart) {
    queryClient.setQueryData(['chart'], response.chart);
  }
}
