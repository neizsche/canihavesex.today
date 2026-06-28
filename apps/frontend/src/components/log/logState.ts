import { LOG_SCREEN_LABELS } from './LogScreen.config';
import {
  type TemperatureUnit,
  celsiusToDisplay,
  displayToCelsius,
  clampDisplayInput,
} from './temperatureUnits';

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
  mood: string[];
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
  mood: [],
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
    ...mood.map((m) => `mood:${m}`),
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
    mood: symptoms.filter((s) => s.startsWith('mood:')).map((s) => s.split(':')[1]),
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

// The `bbt` form field holds the value in the user's *display* unit; conversion
// to/from canonical Celsius happens only at these seams. `unit` defaults to
// 'celsius' so unit-agnostic call sites (and existing tests) keep working.
export function payloadToFormState(
  p: LogPayload,
  unit: TemperatureUnit = 'celsius'
): LogFormState {
  return {
    ...bleedingFields(p.bleeding),
    bbt: celsiusToDisplay(p.temperature, unit),
    mucus: p.mucusType || null,
    lhTest: p.lhTest && p.lhTest !== 'notTaken' ? p.lhTest : null,
    disturbances: p.disturbances || [],
    notes: p.notes || '',
    ...decodeSymptoms(p.symptoms || []),
  };
}

export function suggestionToFormState(
  p: LogPayload,
  unit: TemperatureUnit = 'celsius'
): LogFormState {
  return {
    ...EMPTY_LOG_STATE,
    ...bleedingFields(p.bleeding),
    bbt: celsiusToDisplay(p.temperature, unit),
    mucus: p.mucusType || null,
  };
}

/**
 * Clamp the raw input string for display on blur: snaps an out-of-range entry
 * to the nearest bound so the corrected value is visible before save. Empty or
 * unparseable input stays empty (treated as "no reading").
 */
export function clampBbtInput(value: string, unit: TemperatureUnit = 'celsius'): string {
  return clampDisplayInput(value, unit);
}

export function formStateToPayload(
  date: string,
  s: LogFormState,
  unit: TemperatureUnit = 'celsius'
): LogPayload {
  return {
    date,
    bleeding: s.spotting ? 'spotting' : s.bleeding ? s.flow || 'medium' : 'none',
    temperature: displayToCelsius(s.bbt, unit),
    mucusType: s.mucus,
    lhTest: s.lhTest || 'notTaken',
    disturbances: s.disturbances,
    symptoms: encodeSymptoms(s),
    notes: s.notes,
  };
}

// ── Derived predicates ───────────────────────────────────────────────────────

/**
 * Whether the "Show more" group holds saved data and should open by default.
 * Temperature and LH now live in the always-visible signals section, so only
 * the secondary wellness fields gate the collapsible group.
 */
export function hasWellnessData(s: LogFormState): boolean {
  return !!(
    s.disturbances.length > 0 ||
    s.notes ||
    s.bodySymptoms.length > 0 ||
    s.mood.length > 0 ||
    s.energy ||
    s.sleepQuality ||
    s.libido ||
    (s.sexActivity && s.sexActivity !== 'none')
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
    s.mood.length > 0 ||
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
    a.energy !== b.energy ||
    a.sleepQuality !== b.sleepQuality ||
    a.libido !== b.libido ||
    a.sexActivity !== b.sexActivity ||
    !arraysEqual(a.disturbances, b.disturbances) ||
    !arraysEqual(a.bodySymptoms, b.bodySymptoms) ||
    !arraysEqual(a.mood, b.mood)
  );
}

/** Toggle a value's membership in a string array (immutable). */
export function toggleInArray(arr: string[], id: string): string[] {
  return arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id];
}
