import { LOG_SCREEN_LABELS } from './LogScreen.config';

/**
 * Pure state model for the daily log form.
 *
 * Everything here is framework-free so it can be unit-tested in isolation and
 * keeps LogScreen focused on rendering. The component drives this via
 * `useReducer(logFormReducer, EMPTY_LOG_STATE)`.
 */
export interface LogFormState {
  bleeding: boolean;
  flow: string | null;
  spotting: boolean;
  bbt: string;
  mucus: string | null;
  lhTest: string | null;
  disturbances: string[];
  notes: string;
  bodySymptoms: string[];
  mood: string | null;
  energy: string | null;
  sleepQuality: string | null;
  libido: string | null;
  sexActivity: string | null;
}

export const EMPTY_LOG_STATE: LogFormState = {
  bleeding: false,
  flow: null,
  spotting: false,
  bbt: '',
  mucus: null,
  lhTest: null,
  disturbances: [],
  notes: '',
  bodySymptoms: [],
  mood: null,
  energy: null,
  sleepQuality: null,
  libido: null,
  sexActivity: null,
};

/** Shape of a saved log entry as returned by / sent to the API. */
export interface LogPayload {
  date?: string;
  bleeding?: string;
  temperature?: number | string | null;
  mucusType?: string | null;
  lhTest?: string | null;
  disturbances?: string[];
  symptoms?: string[];
  notes?: string;
}

/** Subset of a payload used to prefill a not-yet-logged day. */
export type LogSuggestion = Pick<LogPayload, 'bleeding' | 'temperature' | 'mucusType'>;

// ── Reducer ────────────────────────────────────────────────────────────────

export type LogFormAction =
  | { type: 'patch'; patch: Partial<LogFormState> }
  | { type: 'reset'; state: LogFormState };

export function logFormReducer(state: LogFormState, action: LogFormAction): LogFormState {
  switch (action.type) {
    case 'patch':
      return { ...state, ...action.patch };
    case 'reset':
      return action.state;
  }
}

// ── Symptom encoding ─────────────────────────────────────────────────────────
// Body signals (mood/energy/sleep/libido/sex) are stored alongside body symptoms
// in a single `symptoms: string[]`, namespaced with a `prefix:` so they round-trip.

const BODY_SYMPTOM_IDS: readonly string[] = LOG_SCREEN_LABELS.bodySignals.symptoms.map((o) => o.id);

export function encodeSymptoms(state: LogFormState): string[] {
  const { bodySymptoms, mood, energy, sleepQuality, libido, sexActivity } = state;
  return [
    ...bodySymptoms,
    ...(mood ? [`mood:${mood}`] : []),
    ...(energy ? [`energy:${energy}`] : []),
    ...(sleepQuality ? [`sleep:${sleepQuality}`] : []),
    ...(libido ? [`libido:${libido}`] : []),
    ...(sexActivity && sexActivity !== 'none' ? [`sex:${sexActivity}`] : []),
  ];
}

export function decodeSymptoms(
  symptoms: string[]
): Pick<
  LogFormState,
  'bodySymptoms' | 'mood' | 'energy' | 'sleepQuality' | 'libido' | 'sexActivity'
> {
  const valueFor = (prefix: string) =>
    symptoms.find((s) => s.startsWith(`${prefix}:`))?.split(':')[1] || null;
  return {
    bodySymptoms: symptoms.filter((s) => BODY_SYMPTOM_IDS.includes(s)),
    mood: valueFor('mood'),
    energy: valueFor('energy'),
    sleepQuality: valueFor('sleep'),
    libido: valueFor('libido'),
    sexActivity: valueFor('sex'),
  };
}

// ── Mapping: API payload <-> form state ──────────────────────────────────────

function bleedingFields(bleeding?: string): Pick<LogFormState, 'bleeding' | 'flow' | 'spotting'> {
  if (bleeding && bleeding !== 'none') {
    return {
      bleeding: true,
      flow: bleeding === 'spotting' ? null : bleeding,
      spotting: bleeding === 'spotting',
    };
  }
  return { bleeding: false, flow: null, spotting: false };
}

export function payloadToFormState(p: LogPayload): LogFormState {
  return {
    ...bleedingFields(p.bleeding),
    bbt: p.temperature ? String(p.temperature) : '',
    mucus: p.mucusType || null,
    lhTest: p.lhTest && p.lhTest !== 'notTaken' ? p.lhTest : null,
    disturbances: p.disturbances || [],
    notes: p.notes || '',
    ...decodeSymptoms(p.symptoms || []),
  };
}

export function suggestionToFormState(s: LogSuggestion): LogFormState {
  return {
    ...EMPTY_LOG_STATE,
    ...bleedingFields(s.bleeding),
    bbt: s.temperature ? String(s.temperature) : '',
    mucus: s.mucusType || null,
  };
}

export function formStateToPayload(date: string, s: LogFormState): LogPayload {
  return {
    date,
    bleeding: s.spotting ? 'spotting' : s.bleeding ? s.flow || 'medium' : 'none',
    temperature: s.bbt ? parseFloat(s.bbt) : null,
    mucusType: s.mucus,
    lhTest: s.lhTest || 'notTaken',
    disturbances: s.disturbances,
    symptoms: encodeSymptoms(s),
    notes: s.notes,
  };
}

// ── Derived predicates ───────────────────────────────────────────────────────

/** Whether the Advanced section holds saved data and should open by default. */
export function hasAdvancedData(p: LogPayload): boolean {
  return !!(
    p.temperature ||
    (p.lhTest && p.lhTest !== 'notTaken') ||
    (p.disturbances && p.disturbances.length > 0) ||
    p.notes
  );
}

/** Whether the user has entered anything worth saving / clearing. */
export function hasAnyInput(s: LogFormState): boolean {
  return !!(
    s.bleeding ||
    s.spotting ||
    s.bbt ||
    s.mucus ||
    s.lhTest ||
    s.disturbances.length > 0 ||
    s.notes ||
    s.bodySymptoms.length > 0 ||
    s.mood ||
    s.energy ||
    s.sleepQuality ||
    s.libido ||
    (s.sexActivity && s.sexActivity !== 'none')
  );
}

function arraysEqual(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((v, i) => v === b[i]);
}

/** Field-aware dirty check (order-independent for the array fields). */
export function isLogDirty(a: LogFormState, b: LogFormState): boolean {
  return (
    a.bleeding !== b.bleeding ||
    a.flow !== b.flow ||
    a.spotting !== b.spotting ||
    a.bbt !== b.bbt ||
    a.mucus !== b.mucus ||
    a.lhTest !== b.lhTest ||
    a.notes !== b.notes ||
    a.mood !== b.mood ||
    a.energy !== b.energy ||
    a.sleepQuality !== b.sleepQuality ||
    a.libido !== b.libido ||
    a.sexActivity !== b.sexActivity ||
    !arraysEqual(a.disturbances, b.disturbances) ||
    !arraysEqual(a.bodySymptoms, b.bodySymptoms)
  );
}

/** Toggle a value's membership in a string array (immutable). */
export function toggleInArray(arr: string[], id: string): string[] {
  return arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id];
}
