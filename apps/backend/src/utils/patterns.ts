/**
 * Layer 2 — "Body patterns by phase".
 *
 * Aggregates the namespaced `logs.symptoms[]` by the engine's cycle phase and
 * surfaces the single strongest pattern per category as a plain, non-diagnostic
 * sentence. Read-only: this is a derivation of logs + engine output and never
 * feeds back into the fertility calculation.
 *
 * Gating discipline (kept deliberately conservative so one bad day never reads
 * as "a pattern"): the whole section is gated on ≥3 completed cycles upstream,
 * and each individual line additionally requires ≥3 occurrences here.
 */

export type Phase = 'Period' | 'Follicular' | 'Ovulatory' | 'Luteal';

const MIN_OCCURRENCES = 3;

// Phase → human phrase. Order also defines modal-phase tie-breaking.
const PHASE_PHRASE: Record<Phase, string> = {
  Period: 'during your period',
  Follicular: 'in your follicular phase',
  Ovulatory: 'around ovulation',
  Luteal: 'in your luteal phase',
};
const PHASE_ORDER: Phase[] = ['Period', 'Follicular', 'Ovulatory', 'Luteal'];

// Mirrors LogScreen.config.ts (frontend). Bare tokens in `symptoms[]` that are
// body symptoms; everything else is prefixed (`mood:`, `energy:`, `libido:`…).
const SYMPTOM_LABELS: Record<string, string> = {
  cramps: 'Cramps',
  bloating: 'Bloating',
  headache: 'Headache',
  breast_tenderness: 'Breast tenderness',
};
const MOOD_LABELS: Record<string, string> = {
  calm: 'calm',
  anxious: 'anxious',
  irritable: 'irritable',
  sad: 'low',
};

export interface Pattern {
  category: 'symptom' | 'mood' | 'energy' | 'libido';
  phase: Phase;
  text: string;
}

interface LogLike {
  date: string;
  symptoms: string[] | null;
}

/** Per-value phase tallies → the value's total and its modal (most-frequent) phase. */
type PhaseTally = Map<Phase, number>;

function modalPhase(tally: PhaseTally): { phase: Phase; total: number } {
  let total = 0;
  let best: Phase = PHASE_ORDER[0];
  let bestCount = -1;
  for (const phase of PHASE_ORDER) {
    const count = tally.get(phase) ?? 0;
    total += count;
    if (count > bestCount) {
      bestCount = count;
      best = phase;
    }
  }
  return { phase: best, total };
}

/** Across a category's values, return the single most-logged value (≥ min). */
function topValue(
  byValue: Map<string, PhaseTally>,
  only?: Set<string>
): { value: string; phase: Phase; total: number } | null {
  let winner: { value: string; phase: Phase; total: number } | null = null;
  for (const [value, tally] of byValue) {
    if (only && !only.has(value)) continue;
    const { phase, total } = modalPhase(tally);
    if (total < MIN_OCCURRENCES) continue;
    if (!winner || total > winner.total) winner = { value, phase, total };
  }
  return winner;
}

/**
 * Build the patterns list from the logs in scope and a date → phase map.
 * Returns at most one line per category, strongest first.
 */
export function buildPatterns(logs: LogLike[], phaseByDate: Map<string, Phase>): Pattern[] {
  const symptoms = new Map<string, PhaseTally>();
  const moods = new Map<string, PhaseTally>();
  const energy = new Map<string, PhaseTally>();
  const libido = new Map<string, PhaseTally>();

  const bump = (map: Map<string, PhaseTally>, value: string, phase: Phase) => {
    let tally = map.get(value);
    if (!tally) {
      tally = new Map();
      map.set(value, tally);
    }
    tally.set(phase, (tally.get(phase) ?? 0) + 1);
  };

  for (const log of logs) {
    const phase = phaseByDate.get(log.date);
    if (!phase) continue;
    for (const token of log.symptoms ?? []) {
      if (token in SYMPTOM_LABELS) bump(symptoms, token, phase);
      else if (token.startsWith('mood:')) bump(moods, token.slice(5), phase);
      else if (token.startsWith('energy:')) bump(energy, token.slice(7), phase);
      else if (token.startsWith('libido:')) bump(libido, token.slice(7), phase);
    }
  }

  const patterns: Pattern[] = [];

  const sym = topValue(symptoms);
  if (sym && SYMPTOM_LABELS[sym.value]) {
    patterns.push({
      category: 'symptom',
      phase: sym.phase,
      text: `${SYMPTOM_LABELS[sym.value]} shows up most often ${PHASE_PHRASE[sym.phase]}.`,
    });
  }

  const mood = topValue(moods);
  if (mood && MOOD_LABELS[mood.value]) {
    patterns.push({
      category: 'mood',
      phase: mood.phase,
      text: `You tend to feel ${MOOD_LABELS[mood.value]} most often ${PHASE_PHRASE[mood.phase]}.`,
    });
  }

  // Energy / libido: only the "high" peak is a genuinely useful, non-alarming line.
  const energyPeak = topValue(energy, new Set(['high']));
  if (energyPeak) {
    patterns.push({
      category: 'energy',
      phase: energyPeak.phase,
      text: `Your energy peaks ${PHASE_PHRASE[energyPeak.phase]}.`,
    });
  }

  const libidoPeak = topValue(libido, new Set(['high']));
  if (libidoPeak) {
    patterns.push({
      category: 'libido',
      phase: libidoPeak.phase,
      text: `Your libido peaks ${PHASE_PHRASE[libidoPeak.phase]}.`,
    });
  }

  return patterns;
}
