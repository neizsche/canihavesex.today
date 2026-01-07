import type { Cycle, CycleState, DailyLog, RiskLevel } from './types.js';

export function fertilityIndexForLog(log: Pick<DailyLog, 'mucusType' | 'sensation'>): number {
  const mucusBase: Record<DailyLog['mucusType'], number> = {
    dry: 0,
    sticky: 2,
    creamy: 4,
    watery: 6,
    eggwhite: 8,
  };

  let idx = mucusBase[log.mucusType];
  if (log.sensation === 'slippery') idx = Math.max(idx, 7);
  return idx;
}

export function detectTempShift(logs: DailyLog[]): { confirmed: boolean; confirmedDate: string | null } {
  const usable = logs
    .filter((l) => l.temperature !== null && !l.sick && !l.badSleep && !l.alcohol)
    .map((l) => ({ date: l.date, temp: l.temperature as number }));

  for (let i = 0; i + 2 < usable.length; i++) {
    const window3 = usable.slice(i, i + 3);
    const thirdIdx = i + 2;

    const prev6Start = Math.max(0, thirdIdx - 6);
    const prev6 = usable.slice(prev6Start, thirdIdx);
    if (prev6.length < 6) continue;

    const prev6Max = Math.max(...prev6.map((p) => p.temp));
    const isShift = window3.every((p) => p.temp > prev6Max);
    if (isShift) return { confirmed: true, confirmedDate: window3[2].date };
  }

  return { confirmed: false, confirmedDate: null };
}

export function detectPeak(logs: DailyLog[]): string | null {
  if (logs.length === 0) return null;

  const indices = logs.map((l) => ({ date: l.date, idx: fertilityIndexForLog(l) }));

  let highest = -1;
  for (const d of indices) highest = Math.max(highest, d.idx);
  if (highest < 0) return null;

  for (let i = indices.length - 1; i >= 0; i--) {
    if (indices[i].idx !== highest) continue;

    const after = indices.slice(i + 1);
    const permanentlyDrops = after.every((d) => d.idx < highest);
    if (permanentlyDrops) return indices[i].date;
  }

  return null;
}

export function updateCycleState(input: {
  cycle: Cycle;
  logsInCycle: DailyLog[];
}): {
  state: CycleState;
  peakDate: string | null;
  tempShiftConfirmedDate: string | null;
} {
  const { cycle, logsInCycle } = input;

  const sorted = [...logsInCycle].sort((a, b) => a.date.localeCompare(b.date));
  const peakDate = detectPeak(sorted);
  const tempShift = detectTempShift(sorted);

  const last = sorted.at(-1) ?? null;
  const lastIdx = last ? fertilityIndexForLog(last) : 0;

  const startState: CycleState = cycle.state ?? 'INFERTILE_PRE';

  if (!last) {
    return {
      state: startState,
      peakDate: peakDate,
      tempShiftConfirmedDate: tempShift.confirmedDate,
    };
  }

  const peakOccurred = peakDate !== null && last.date >= peakDate;

  const isPeakDay = peakDate !== null && last.date === peakDate;

  const daysSincePeak = peakDate ? daysBetween(peakDate, last.date) : null;
  const canClose =
    peakDate !== null &&
    daysSincePeak !== null &&
    daysSincePeak >= 3 &&
    tempShift.confirmed;

  if (canClose) {
    return {
      state: 'INFERTILE_POST',
      peakDate,
      tempShiftConfirmedDate: tempShift.confirmedDate,
    };
  }

  if (peakOccurred) {
    return {
      state: isPeakDay ? 'PEAK_FERTILE' : 'FERTILE_CLOSING',
      peakDate,
      tempShiftConfirmedDate: tempShift.confirmedDate,
    };
  }

  if (lastIdx >= 4) {
    return {
      state: lastIdx >= 6 ? 'FERTILE_OPEN' : 'FERTILE_OPEN',
      peakDate,
      tempShiftConfirmedDate: tempShift.confirmedDate,
    };
  }

  return {
    state: 'INFERTILE_PRE',
    peakDate,
    tempShiftConfirmedDate: tempShift.confirmedDate,
  };
}

export function calculateRisk(input: {
  cycleState: CycleState;
  todayLog: DailyLog | null;
  fertilityIndexToday: number;
  tempShiftConfirmed: boolean;
  lhPositiveCarryover: boolean;
}): { risk: RiskLevel; explanation: string } {
  const { cycleState, todayLog, fertilityIndexToday, tempShiftConfirmed, lhPositiveCarryover } = input;

  const lhPositive = todayLog?.lhTest === 'positive' || lhPositiveCarryover;
  if (lhPositive) {
    return { risk: 'HIGH', explanation: 'LH positive detected (today or carryover), assume high risk' };
  }

  if (
    fertilityIndexToday >= 6 ||
    cycleState === 'FERTILE_OPEN' ||
    cycleState === 'PEAK_FERTILE'
  ) {
    return {
      risk: 'HIGH',
      explanation: tempShiftConfirmed
        ? 'Fertile signs present (even if temperature shift is confirmed, stay conservative for today)'
        : 'Fertile signs present, ovulation not confirmed as closed',
    };
  }

  if (cycleState === 'FERTILE_CLOSING' && !tempShiftConfirmed) {
    return { risk: 'MEDIUM', explanation: 'Peak occurred but temperature shift not confirmed' };
  }

  if (fertilityIndexToday === 4) {
    return { risk: 'MEDIUM', explanation: 'Moderately fertile mucus detected' };
  }

  if (cycleState === 'INFERTILE_POST') {
    return { risk: 'LOW', explanation: 'Post-ovulation infertile only after temperature shift confirmation' };
  }

  return { risk: 'HIGH', explanation: 'Uncertain state — assume fertile for safety' };
}

function daysBetween(fromDate: string, toDate: string): number {
  const a = new Date(fromDate + 'T00:00:00Z').getTime();
  const b = new Date(toDate + 'T00:00:00Z').getTime();
  return Math.floor((b - a) / (1000 * 60 * 60 * 24));
}
