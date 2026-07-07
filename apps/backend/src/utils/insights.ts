import { addDaysIso } from './dates.js';

function formatShortDate(iso: string) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

export function buildInsightCards(
  fertilityStatus: string,
  phase: string,
  m: any,
  todayIso?: string
) {
  if (!m || typeof m !== 'object') return {};

  const cycleDay = m.cycleDay ?? null;
  const confidenceScore = Math.round((m.confidenceScore ?? 0.3) * 100);
  const daysToOv = m.daysToOvulation;
  const s = m.stats || {};
  const avgLen = s.avgCycleLength ?? 28;
  const completedCycles = s.completedCycles ?? 0;

  // Days until the next period — one canonical value used by both the luteal
  // nudge below and the Today cycle line. Next period date = cycle start +
  // activeCycleLength (the engine's predicted length), i.e. cycle day
  // activeCycleLength + 1. Matches the calendar route's "days to period".
  // Falls back to avg length for older payloads that predate activeCycleLength;
  // lostTrack hides the estimate entirely.
  const activeCycleLength = m.activeCycleLength ?? avgLen;
  const daysToNextPeriod =
    cycleDay == null || m.lostTrack ? null : Math.max(0, activeCycleLength + 1 - cycleDay);

  // Priority-ordered message pool. Each note is tagged 'warn' (needs attention —
  // anomalies, conflicting signals) or 'info' (neutral context) so the client
  // can style them distinctly. pool[0] becomes the headline; the rest are notes.
  const pool: Array<{ text: string; kind: 'info' | 'warn' }> = [];
  const note = (text: string, kind: 'info' | 'warn' = 'info') => pool.push({ text, kind });

  if (m.anomalies?.includes('Multiple LH Surges (PCOS Risk)'))
    note('Multiple LH surges detected — talk to your doctor.', 'warn');
  if (m.anomalies?.includes('Conflicting Bio-signals'))
    note("Signals don't fully agree. Keep logging.", 'warn');

  if (daysToOv === 0) note('Ovulation day — peak fertility.');
  else if (daysToOv === 1) note('Ovulation likely tomorrow.');
  else if (daysToOv !== null && daysToOv > 1 && daysToOv <= 5)
    note(`Ovulation in ~${daysToOv} days.`);

  if (m.isConfirmed) note('Ovulation confirmed via temp shift.');

  if (
    daysToNextPeriod != null &&
    phase === 'Luteal' &&
    m.isConfirmed &&
    daysToNextPeriod > 0 &&
    daysToNextPeriod <= 5
  )
    note(`Period in ~${daysToNextPeriod} days.`);

  if (m.tempReliability === 0) note('Temp excluded (illness) — no impact on prediction.');

  if (pool.length < 2 && !m.hasTemp && fertilityStatus === 'fertile')
    note('Log temp to help confirm ovulation.');

  const sourceMap: Record<string, string> = {
    BBT: 'Anchored by temperature shift.',
    LH: 'Driven by LH surge.',
    MUCUS: 'Based on mucus pattern.',
    CALENDAR: 'Based on cycle history.',
  };

  let confidenceLabel: string;
  let confidenceMessage: string;

  if (confidenceScore >= 85) {
    confidenceLabel = 'Very High';
    confidenceMessage = 'Strong signal agreement.';
  } else if (confidenceScore >= 70) {
    confidenceLabel = 'High';
    confidenceMessage = 'Consistent data this cycle.';
  } else if (confidenceScore >= 50) {
    confidenceLabel = 'Moderate';
    confidenceMessage =
      completedCycles < 3 ? 'Improving with more cycles.' : 'Add temp or LH for better accuracy.';
  } else {
    confidenceLabel = 'Building';
    confidenceMessage = 'More data will sharpen predictions.';
  }

  // Cycle geometry for the Today "cycle line" (period-side context)
  const ovulationDay =
    m.daysToOvulation != null && cycleDay != null ? cycleDay + m.daysToOvulation : null;
  const fertileStartDay = ovulationDay != null ? Math.max(1, ovulationDay - 5) : null;
  const fertileEndDay = ovulationDay != null ? ovulationDay + 1 : null;
  // daysToNextPeriod is computed once up top (shared with the luteal nudge).

  // Per-signal state: 'used' (fed the prediction), 'missing' (not logged), or
  // 'excluded' (logged but discarded — e.g. temp recorded during illness).
  const signal = (used: boolean) => ({ state: used ? 'used' : 'missing' });
  const tempSignal =
    m.tempReliability === 0 ? { state: 'excluded', reason: 'illness' } : signal(!!m.hasTemp);

  return {
    today: {
      phase,
      lostTrack: m.lostTrack || false,
      cycle: {
        day: cycleDay,
        length: avgLen,
        fertileStartDay,
        fertileEndDay,
        nextPeriodDateStr:
          todayIso && daysToNextPeriod != null
            ? formatShortDate(addDaysIso(todayIso, daysToNextPeriod))
            : null,
        fertileStartDateStr:
          todayIso && fertileStartDay != null && cycleDay != null
            ? formatShortDate(addDaysIso(todayIso, fertileStartDay - cycleDay))
            : null,
        fertileEndDateStr:
          todayIso && fertileEndDay != null && cycleDay != null
            ? formatShortDate(addDaysIso(todayIso, fertileEndDay - cycleDay))
            : null,
      },
      // Priority-ordered pool: [0] is the headline (Today subtitle), the rest
      // are secondary notes surfaced in the insights sheet.
      headline: pool[0] ?? null,
      notes: pool.slice(1),
      sourceText: sourceMap[m.primarySignal] || sourceMap.CALENDAR,
      confidence: {
        label: confidenceLabel,
        message: confidenceMessage,
        score: confidenceScore,
        signals: {
          temp: tempSignal,
          lh: signal(!!m.hasLh || m.primarySignal === 'LH'),
          mucus: signal(!!m.hasMucus || m.primarySignal === 'MUCUS'),
          calendar: signal(true),
        },
      },
    },
  };
}
