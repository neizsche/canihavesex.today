export type FertilityStatus = 'fertile' | 'unsure' | 'not_fertile';

export const STATUS_CONFIG: Record<
  FertilityStatus,
  {
    title: string;
    fallbackSubtitle: string;
    accent: string;
    dot: string;
  }
> = {
  fertile: {
    title: 'Highly Fertile',
    fallbackSubtitle: 'High chance of pregnancy today.',
    accent: 'text-red-500',
    dot: 'bg-red-500',
  },
  unsure: {
    title: 'Not Sure',
    fallbackSubtitle: 'Assume fertile to be safe.',
    accent: 'text-amber-500',
    dot: 'bg-amber-500',
  },
  not_fertile: {
    title: 'Not Fertile',
    fallbackSubtitle: 'Low chance of pregnancy today.',
    accent: 'text-emerald-500',
    dot: 'bg-emerald-500',
  },
};

export const BASIS_SHORT: Record<string, string> = {
  'Anchored by temperature shift.': 'Temp Shift',
  'Driven by LH surge.': 'LH Surge',
  'Based on mucus pattern.': 'Mucus',
  'Based on cycle history.': 'History',
};

// Ascending confidence tiers — index maps to the engine's `confidence.label`
// and drives the segmented strength meter on the insights page.
export const CONFIDENCE_TIERS = ['Building', 'Moderate', 'High', 'Very High'] as const;

// Signals the engine can weigh, in the order shown on the insights page.
export const SIGNAL_ROWS = [
  { key: 'lh', label: 'LH test' },
  { key: 'mucus', label: 'Fluid' },
  { key: 'calendar', label: 'Cycle history' },
  { key: 'temp', label: 'Temperature' },
] as const;

export type StatusConfig = (typeof STATUS_CONFIG)[FertilityStatus];

/** Resolves the engine `status` (incl. unknown/`paused`) to a display config. */
export function resolveStatusConfig(status?: string): StatusConfig {
  return STATUS_CONFIG[status as FertilityStatus] ?? STATUS_CONFIG.not_fertile;
}

// ---- Shape of GET /api/v1/insights/today (fields the Today section reads) ----

export interface Cycle {
  day?: number | null;
  length?: number | null;
  fertileStartDay?: number | null;
  fertileEndDay?: number | null;
  nextPeriodDateStr?: string | null;
  fertileStartDateStr?: string | null;
  fertileEndDateStr?: string | null;
}

/** A signal either fed the prediction, wasn't logged, or was logged-but-discarded. */
export interface SignalState {
  state: 'used' | 'missing' | 'excluded';
  reason?: string;
}

/** Engine messages: 'warn' needs attention (anomalies), 'info' is neutral context. */
export type NoteKind = 'info' | 'warn';
export interface InsightNote {
  text: string;
  kind: NoteKind;
}

export interface Confidence {
  label?: string;
  message?: string;
  score?: number;
  signals?: Record<string, SignalState>;
}

export interface TodayInsight {
  phase?: string;
  lostTrack?: boolean;
  cycle?: Cycle;
  headline?: InsightNote | null;
  notes?: InsightNote[];
  sourceText?: string;
  confidence?: Confidence;
}

export interface InsightsResponse {
  status?: FertilityStatus | 'paused';
  insights?: { today?: TodayInsight };
  date?: string;
  lastModified?: string;
  dailyLogDone?: boolean;
  reanchor?: { show?: boolean; acked?: boolean };
}
