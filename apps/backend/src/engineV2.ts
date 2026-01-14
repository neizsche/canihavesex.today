import { randomUUID, createHash } from 'node:crypto';
import type { LogRepository, RawLog } from './repositories/LogRepository.js';
import type { EngineRepository, EngineResult, EngineTrace } from './repositories/EngineRepository.js';
import type { CycleRepository } from './repositories/CycleRepository.js';
import { fertilityIndexForLog } from './fertilityEngine.js';
import { run_engine as runCihsEngine, type Day as CihsDay, type Personal as CihsPersonal, explain_state as explainCihsState } from './cihsEngine.js';

type IsoDate = string; // yyyy-mm-dd

type PublicRisk = 'HIGH' | 'MEDIUM' | 'LOW' | 'INSUFFICIENT_DATA';
type EngineRisk = PublicRisk | 'VERY_HIGH';

type RawLogPayloadV1 = {
  // existing UI fields
  mucusType?: 'dry' | 'sticky' | 'creamy' | 'watery' | 'eggwhite';
  sensation?: 'dry' | 'damp' | 'slippery';
  bleeding?: 'none' | 'spotting' | 'light' | 'heavy';
  temperature?: number | null;
  lhTest?: 'positive' | 'negative' | 'notTaken';

  // phase-1 optional extensions (UI can start sending later)
  sex?: boolean;
  sleepHours?: number | null;
  alcohol?: boolean;
  illness?: boolean;
  stress?: number | null;
  notes?: string | null;

  // quality flags (optional)
  fever?: boolean;
  lateNight?: boolean;
  measuredLate?: boolean;
  semenExposure?: boolean;
  infection?: boolean;
};

type NormalizedDay = {
  date: IsoDate;
  hasLog: boolean;
  cycleStartDate: IsoDate;
  cycleDayIndex: number; // 1-based
  payload: RawLogPayloadV1;
  // reliability
  rTemp: number;
  rMucus: number;
  rLh: number;
  rDay: number;
};

type SignalSource = 'LH' | 'BBT' | 'MUCUS' | 'CALENDAR' | 'TWODAY';

type SignalResult = {
  source: SignalSource;
  anchorCycleDay: number; // 1-based
  windowCycleDay?: { start: number; end: number };
  reliability: number; // 0..1
  explanation: string;
};

type EngineOutput = {
  cycle_id: string;
  ovulation: {
    window: { start: IsoDate; end: IsoDate };
    estimated_day?: IsoDate;
    confidence: number;
  };
  daily_risks: Array<{ date: IsoDate; risk: EngineRisk; reason: string }>;
  warnings: string[];
  trace: unknown;
};

type EngineAnalytics = {
  // A stable subset meant for UI explainability (does not expose raw logs).
  anchorCycleDay: number;
  windowCycleDay: { start: number; end: number };
  confidence: number;
  confirmed: boolean;
  coverage: { temp: number; mucus: number; lh: number; any: number; critical_gap: boolean };
  signals: Array<{ source: 'BBT' | 'LH' | 'MUCUS' | 'CALENDAR'; anchor: number; reliability: number; explain: string }>;
  warnings: string[];
  flags: { pcos_like: boolean; pcos_score: number; pcos_reasons: string[] };
  todayCycleDay: number;
  todayRisk: PublicRisk;
};

function extractAnalytics(params: { output: EngineOutput; todayIso: IsoDate; todayCycleDay: number }): EngineAnalytics | null {
  const cihs = (params.output.trace as any)?.cihs as any | undefined;
  if (!cihs) return null;
  const todayRisk = (cihs?.risks?.[params.todayCycleDay] ?? 'MEDIUM') as PublicRisk;
  return {
    anchorCycleDay: Number(cihs.anchor ?? 14),
    windowCycleDay: {
      start: Number(cihs?.window?.[0] ?? 10),
      end: Number(cihs?.window?.[1] ?? 20),
    },
    confidence: Number(cihs.confidence ?? params.output.ovulation.confidence ?? 0.2),
    confirmed: Boolean(cihs.confirmed),
    coverage: {
      temp: Number(cihs?.coverage?.temp ?? 0),
      mucus: Number(cihs?.coverage?.mucus ?? 0),
      lh: Number(cihs?.coverage?.lh ?? 0),
      any: Number(cihs?.coverage?.any ?? 0),
      critical_gap: Boolean(cihs?.coverage?.critical_gap),
    },
    signals: Array.isArray(cihs.signals)
      ? (cihs.signals as any[]).map((s) => ({
        source: String(s?.source ?? 'CALENDAR') as any,
        anchor: Number(s?.anchor ?? 14),
        reliability: Number(s?.reliability ?? 0),
        explain: String(s?.explain ?? ''),
      }))
      : [],
    warnings: Array.isArray(cihs.warnings) ? (cihs.warnings as any[]).map((w) => String(w ?? '')) : [],
    flags: {
      pcos_like: Boolean(cihs?.flags?.pcos_like),
      pcos_score: Number(cihs?.flags?.pcos_score ?? 0),
      pcos_reasons: Array.isArray(cihs?.flags?.pcos_reasons) ? (cihs.flags.pcos_reasons as any[]).map((r) => String(r ?? '')) : [],
    },
    todayCycleDay: params.todayCycleDay,
    todayRisk,
  };
}

const ENGINE_VERSION = 'v2.0.0';
const PARAMETER_VERSION = 'v1';

function clamp01(x: number): number {
  if (Number.isNaN(x)) return 0;
  return Math.max(0, Math.min(1, x));
}

function isoDateFrom(iso: string, offsetDays: number): string {
  const d = new Date(iso + 'T00:00:00Z');
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

function daysBetween(fromDate: string, toDate: string): number {
  const a = new Date(fromDate + 'T00:00:00Z').getTime();
  const b = new Date(toDate + 'T00:00:00Z').getTime();
  return Math.floor((b - a) / (1000 * 60 * 60 * 24));
}

function sha256Hex(s: string): string {
  return createHash('sha256').update(s).digest('hex');
}

function safeJsonParse<T>(s: string): T {
  try {
    return JSON.parse(s) as T;
  } catch {
    return {} as T;
  }
}

function isBleedingPresent(bleeding: RawLogPayloadV1['bleeding']): boolean {
  return bleeding !== undefined && bleeding !== 'none';
}

function isCycleStart(day: { payload: RawLogPayloadV1 }, prev3: Array<{ payload: RawLogPayloadV1 }>): boolean {
  // design doc: medium/heavy; we map existing 'light' => medium for now.
  const b = day.payload.bleeding;
  const isMediumOrHeavy = b === 'light' || b === 'heavy';
  if (!isMediumOrHeavy) return false;
  const prev3NotBleeding = prev3.every((d) => !isBleedingPresent(d.payload.bleeding));
  return prev3NotBleeding;
}

function tempReliability(p: RawLogPayloadV1): number {
  if (p.temperature == null) return 0;
  let r = 1.0;
  if (p.fever) return 0;
  const sleep = typeof p.sleepHours === 'number' ? p.sleepHours : null;
  if (sleep != null && sleep < 4) r *= 0.4;
  if (p.alcohol) r *= 0.7;
  if (p.lateNight) r *= 0.7;
  if (p.measuredLate) r *= 0.8;
  return clamp01(r);
}

function mucusReliability(p: RawLogPayloadV1): number {
  if (!p.mucusType) return 0;
  let r = 1.0;
  if (p.semenExposure) return 0;
  if (p.infection) r *= 0.3;
  return clamp01(r);
}

function lhReliability(p: RawLogPayloadV1): number {
  if (!p.lhTest) return 0;
  let r = 1.0;
  // placeholder for future "invalid test" marker
  return clamp01(r);
}

function dayReliability(rTemp: number, rMucus: number, rLh: number): number {
  return Math.max(rTemp, rMucus, rLh);
}

function computeCoverage(daysInCycle: NormalizedDay[]): {
  coverageTemp: number;
  coverageMucus: number;
  coverageLh: number;
  coverageAny: number;
  criticalGap: boolean;
} {
  const zone = daysInCycle.filter((d) => d.cycleDayIndex >= 8 && d.cycleDayIndex <= 20);
  const denom = 13; // inclusive 8..20
  const coverageTemp = zone.filter((d) => d.rTemp > 0.5).length / denom;
  const coverageMucus = zone.filter((d) => d.rMucus > 0.5).length / denom;
  const coverageLh = zone.filter((d) => d.payload.lhTest !== undefined && d.payload.lhTest !== null).length / denom;
  const coverageAny = zone.filter((d) => d.rDay > 0.5).length / denom;

  let criticalGap = false;
  // "missing" means no user log at all; treat consecutive missing in fertile zone as critical
  let streak = 0;
  for (const d of zone) {
    if (!d.hasLog) streak += 1;
    else streak = 0;
    if (streak >= 2) {
      criticalGap = true;
      break;
    }
  }

  return { coverageTemp, coverageMucus, coverageLh, coverageAny, criticalGap };
}

function detectBbtShift(days: NormalizedDay[]): { ovulationCycleDay: number | null; confirmedDate: IsoDate | null; signal?: SignalResult } {
  // Baseline(i) = mean(temp[i-6..i-1] where R_temp>0.5), shift if >=2 of next3 >= baseline+0.2 AND all R_temp>0.5
  for (let i = 1; i < days.length; i++) {
    const prev = [];
    for (let j = i - 6; j <= i - 1; j++) {
      if (j < 0) continue;
      const d = days[j];
      const t = d.payload.temperature;
      if (t != null && d.rTemp > 0.5) prev.push(t);
    }
    if (prev.length < 6) continue;
    const baseline = prev.reduce((a, b) => a + b, 0) / prev.length;

    const next = days.slice(i + 1, i + 4);
    if (next.length < 3) continue;
    const nextTemps = next.map((d) => ({ ok: d.rTemp > 0.5 && d.payload.temperature != null, t: d.payload.temperature as number | null }));
    if (!nextTemps.every((x) => x.ok)) continue;

    const hits = nextTemps.filter((x) => (x.t as number) >= baseline + 0.2).length;
    if (hits >= 2) {
      const rel = 0.7 * (next.reduce((a, d) => a + d.rTemp, 0) / next.length);
      const ovDay = days[i].cycleDayIndex;
      return {
        ovulationCycleDay: ovDay,
        confirmedDate: next[2].date,
        signal: {
          source: 'BBT',
          anchorCycleDay: ovDay,
          reliability: clamp01(rel),
          explanation: `BBT shift detected: ≥2 of next 3 temps ≥ baseline+0.2°C (baseline≈${baseline.toFixed(2)}°C)`,
        },
      };
    }
  }
  return { ovulationCycleDay: null, confirmedDate: null };
}

function detectLhSignal(days: NormalizedDay[], bbtOvCycleDay: number | null): { signal: SignalResult | null; multiplePeaks: boolean } {
  const positives = days.filter((d) => d.payload.lhTest === 'positive').map((d) => d.cycleDayIndex);
  if (positives.length === 0) return { signal: null, multiplePeaks: false };

  const multiplePeaks = positives.length > 1;

  let chosen = positives[positives.length - 1]!;
  if (bbtOvCycleDay != null) {
    const beforeShift = positives.filter((d) => d <= bbtOvCycleDay);
    if (beforeShift.length > 0) chosen = beforeShift[beforeShift.length - 1]!;
  }

  const day = days.find((d) => d.cycleDayIndex === chosen) ?? null;
  const r = day ? 0.9 * day.rLh : 0.9;
  const rel = clamp01(multiplePeaks ? r * 0.8 : r);

  return {
    multiplePeaks,
    signal: {
      source: 'LH',
      anchorCycleDay: chosen + 1,
      windowCycleDay: { start: chosen + 1, end: chosen + 2 },
      reliability: rel,
      explanation: multiplePeaks
        ? `Multiple LH positives; using last relevant positive on cycle day ${chosen} with penalty`
        : `LH positive on cycle day ${chosen} → ovulation in [${chosen + 1}, ${chosen + 2}]`,
    },
  };
}

function detectMucusSignal(days: NormalizedDay[]): SignalResult | null {
  const peaks = days
    .filter((d) => d.payload.mucusType === 'eggwhite' && d.rMucus > 0.5)
    .map((d) => d.cycleDayIndex);
  if (peaks.length === 0) return null;
  const peak = peaks[peaks.length - 1]!;
  const day = days.find((d) => d.cycleDayIndex === peak) ?? null;
  const rel = clamp01(0.6 * (day?.rMucus ?? 0.6));
  const anchor = peak + 1;
  return {
    source: 'MUCUS',
    anchorCycleDay: anchor,
    windowCycleDay: { start: peak, end: peak + 1 },
    reliability: rel,
    explanation: `Mucus peak (eggwhite) on cycle day ${peak} → ovulation ≈ day ${peak}–${peak + 1}`,
  };
}

function detectTwoDaySignal(days: NormalizedDay[]): SignalResult | null {
  const nonDry = days
    .filter((d) => d.payload.mucusType !== undefined && d.payload.mucusType !== 'dry')
    .map((d) => d.cycleDayIndex);
  if (nonDry.length === 0) return null;
  const last = nonDry[nonDry.length - 1]!;
  return {
    source: 'TWODAY',
    anchorCycleDay: last,
    reliability: 0.4,
    explanation: `Fallback mucus: last non-dry mucus on cycle day ${last}`,
  };
}

function calendarSignal(params: { meanCycleLength: number; meanLutealLength: number }): SignalResult {
  const anchor = Math.round(params.meanCycleLength - params.meanLutealLength);
  return {
    source: 'CALENDAR',
    anchorCycleDay: anchor,
    reliability: 0.3,
    explanation: `Calendar prior: ovulation≈meanCycleLength-meanLutealLength (${params.meanCycleLength.toFixed(1)}-${params.meanLutealLength.toFixed(1)}≈${anchor})`,
  };
}

function fuseSignals(args: {
  signals: SignalResult[];
  coverage: ReturnType<typeof computeCoverage>;
}): {
  anchor: number;
  window: { start: number; end: number };
  confidence: number;
  warnings: string[];
  usedSignals: SignalResult[];
} {
  const filtered = args.signals.filter((s) => s.reliability >= 0.4);
  const warnings: string[] = [];
  if (filtered.length === 0) {
    warnings.push('No reliable signals available; using conservative default.');
  }

  const weights: Record<SignalSource, number> = {
    LH: 1.0,
    BBT: 0.8,
    MUCUS: 0.6,
    CALENDAR: 0.3,
    TWODAY: 0.4,
  };

  const lh = filtered.find((s) => s.source === 'LH') ?? null;
  let anchor: number;
  if (lh) {
    anchor = lh.anchorCycleDay;
  } else if (filtered.length > 0) {
    const num = filtered.reduce((a, s) => a + s.anchorCycleDay * (weights[s.source] ?? 0), 0);
    const den = filtered.reduce((a, s) => a + (weights[s.source] ?? 0), 0);
    anchor = den > 0 ? Math.round(num / den) : filtered[0]!.anchorCycleDay;
  } else {
    anchor = 14; // safe default
  }

  let window = { start: anchor - 2, end: anchor + 2 };

  const onlyCalendar = filtered.length === 1 && filtered[0]!.source === 'CALENDAR';
  const lowCoverage = args.coverage.coverageAny < 0.5;

  if (args.coverage.criticalGap) window = { start: window.start - 2, end: window.end + 2 };
  if (lowCoverage) window = { start: window.start - 1, end: window.end + 1 };
  if (onlyCalendar) window = { start: anchor - 4, end: anchor + 4 };

  // Confidence formula
  const base = filtered.length > 0 ? Math.max(...filtered.map((s) => s.reliability)) : 0.4;
  const coverageFactor = Math.min(1, args.coverage.coverageTemp + args.coverage.coverageMucus);

  // conflict penalty if anchors differ > 3 days
  let conflictPenalty = 1.0;
  if (filtered.length >= 2) {
    const anchors = filtered.map((s) => s.anchorCycleDay);
    const minA = Math.min(...anchors);
    const maxA = Math.max(...anchors);
    if (maxA - minA > 3) conflictPenalty = 0.8;
  }

  let confidence = base * coverageFactor * conflictPenalty;
  confidence = Math.max(0.2, Math.min(0.95, confidence));

  if (confidence < 0.5) warnings.push('Low confidence due to limited/uncertain data.');
  if (args.coverage.criticalGap) warnings.push('Critical gap: ≥2 consecutive missing days in fertile zone.');

  return { anchor, window, confidence, warnings, usedSignals: filtered };
}

function bumpRisk(r: EngineRisk): EngineRisk {
  if (r === 'LOW') return 'MEDIUM';
  if (r === 'MEDIUM') return 'HIGH';
  if (r === 'HIGH') return 'VERY_HIGH';
  return 'VERY_HIGH';
}

function toPublicRisk(r: EngineRisk): PublicRisk {
  if (r === 'VERY_HIGH') return 'HIGH';
  return r;
}

export async function appendRawLog(logRepo: LogRepository, params: { userId: string; date: IsoDate; payload: RawLogPayloadV1; source?: string }): Promise<string> {
  const id = randomUUID();
  const now = new Date().toISOString();
  await logRepo.createRawLog({
    id,
    user_id: params.userId,
    date: params.date,
    payload_json: JSON.stringify(params.payload ?? {}),
    source: params.source ?? 'app',
    created_at: now,
  });
  return id;
}

async function getRawLogEvents(logRepo: LogRepository, userId: string): Promise<Array<{ date: IsoDate; payload: RawLogPayloadV1; createdAt: string }>> {
  const rows = await logRepo.findRawLogs(userId);
  return rows.map((r) => ({
    date: r.date as IsoDate,
    payload: safeJsonParse<RawLogPayloadV1>(r.payload_json),
    createdAt: r.created_at,
  }));
}

function latestPayloadByDate(events: Array<{ date: IsoDate; payload: RawLogPayloadV1; createdAt: string }>, asOfDate: IsoDate): Map<IsoDate, RawLogPayloadV1> {
  const map = new Map<IsoDate, RawLogPayloadV1>();
  for (const e of events) {
    if (e.date > asOfDate) continue;
    map.set(e.date, e.payload);
  }
  return map;
}

function buildNormalizedDays(args: { latestByDate: Map<IsoDate, RawLogPayloadV1>; start: IsoDate; end: IsoDate }): NormalizedDay[] {
  const out: NormalizedDay[] = [];
  const totalDays = daysBetween(args.start, args.end);
  const rawDays: Array<{ date: IsoDate; payload: RawLogPayloadV1; hasLog: boolean }> = [];
  for (let i = 0; i <= totalDays; i++) {
    const date = isoDateFrom(args.start, i) as IsoDate;
    const payload = args.latestByDate.get(date) ?? {};
    rawDays.push({ date, payload, hasLog: args.latestByDate.has(date) });
  }

  // Detect cycle boundaries using rolling prev3 window
  const starts: IsoDate[] = [];
  for (let i = 0; i < rawDays.length; i++) {
    const prev3 = [rawDays[i - 3], rawDays[i - 2], rawDays[i - 1]].filter(Boolean) as any[];
    if (prev3.length < 3) continue;
    if (isCycleStart(rawDays[i]!, prev3)) starts.push(rawDays[i]!.date);
  }
  // Fallback: if none, assume cycle starts at start date
  if (starts.length === 0) starts.push(args.start);

  for (const d of rawDays) {
    // pick latest start <= date
    const start = starts.filter((s) => s <= d.date).at(-1) ?? starts[0]!;
    const cdi = daysBetween(start, d.date) + 1;
    const rTemp = tempReliability(d.payload);
    const rMucus = mucusReliability(d.payload);
    const rLh = lhReliability(d.payload);
    const rDay = dayReliability(rTemp, rMucus, rLh);
    out.push({
      date: d.date,
      hasLog: d.hasLog,
      cycleStartDate: start,
      cycleDayIndex: cdi,
      payload: d.payload,
      rTemp,
      rMucus,
      rLh,
      rDay,
    });
  }
  return out;
}

async function ensureCycle(cycleRepo: CycleRepository, params: { userId: string; cycleStartDate: IsoDate }): Promise<{ id: string; startDate: IsoDate }> {
  const cycles = await cycleRepo.findByUserId(params.userId);
  const existing = cycles.find(c => c.start_date === params.cycleStartDate);

  if (existing) return { id: existing.id, startDate: params.cycleStartDate };

  const id = randomUUID();
  const now = new Date().toISOString();
  await cycleRepo.create({
    id,
    user_id: params.userId,
    start_date: params.cycleStartDate,
    state: 'INFERTILE_PRE',
    peak_date: null,
    temp_shift_confirmed_date: null,
    created_at: now,
  });
  return { id, startDate: params.cycleStartDate };
}

async function upsertNormalizedDay(engineRepo: EngineRepository, userId: string, d: NormalizedDay): Promise<void> {
  const now = new Date().toISOString();
  const id = sha256Hex(`${userId}:${d.date}`);
  await engineRepo.saveNormalizedDay({
    id,
    user_id: userId,
    date: d.date,
    cycle_start_date: d.cycleStartDate,
    cycle_day_index: d.cycleDayIndex,
    has_log: d.hasLog ? 1 : 0,
    bleeding: d.payload.bleeding ?? null,
    mucus_type: d.payload.mucusType ?? null,
    sensation: d.payload.sensation ?? null,
    temperature: d.payload.temperature ?? null,
    lh_test: d.payload.lhTest ?? null,
    sex: d.payload.sex ? 1 : 0,
    sleep_hours: d.payload.sleepHours ?? null,
    illness: d.payload.illness ? 1 : 0,
    stress: d.payload.stress ?? null,
    notes: d.payload.notes ?? null,
    updated_at: now,
  });
}

async function upsertDailyLogCompat(logRepo: LogRepository, userId: string, cycleId: string, d: NormalizedDay): Promise<void> {
  // Maintain compatibility with existing UI queries against daily_logs (latest state per day).
  // NOTE: This is not the source of truth anymore; raw_logs is.
  if (!d.payload.mucusType || !d.payload.sensation || !d.payload.bleeding || !d.payload.lhTest) return;
  const now = new Date().toISOString();
  const logId = randomUUID();
  await logRepo.createDailyLog({
    id: logId,
    user_id: userId,
    cycle_id: cycleId,
    date: d.date,
    mucus_type: d.payload.mucusType,
    sensation: d.payload.sensation,
    bleeding: d.payload.bleeding,
    temperature: d.payload.temperature ?? null,
    lh_test: d.payload.lhTest,
    sick: d.payload.illness ? 1 : 0,
    bad_sleep: d.payload.sleepHours != null && d.payload.sleepHours < 4 ? 1 : 0,
    alcohol: d.payload.alcohol ? 1 : 0,
    created_at: now,
  });
}

async function getPersonalModel(engineRepo: EngineRepository, userId: string): Promise<{ meanLutealLength: number; meanCycleLength: number }> {
  return await engineRepo.getPersonalModel(userId);
}

function buildEngineForCycle(args: {
  cycleDays: NormalizedDay[];
  personal: { meanLutealLength: number; meanCycleLength: number };
}): {
  output: Omit<EngineOutput, 'cycle_id'>;
  derived: {
    peakDate: IsoDate | null;
    tempShiftConfirmedDate: IsoDate | null;
    cycleState: string;
    signals: SignalResult[];
    coverage: ReturnType<typeof computeCoverage>;
    windowCycleDay: { start: number; end: number };
  };
} {
  const coverage = computeCoverage(args.cycleDays);

  const cihsDays: CihsDay[] = args.cycleDays.map((d) => {
    const lh =
      d.payload.lhTest === 'positive' ? true : d.payload.lhTest === 'negative' ? false : null;
    return {
      date: d.date,
      cycle_day: d.cycleDayIndex,
      temperature: d.payload.temperature ?? null,
      mucus: d.payload.mucusType ?? null,
      lh,
      bleeding:
        d.payload.bleeding === 'spotting'
          ? 'spotting'
          : d.payload.bleeding === 'light'
            ? 'light'
            : d.payload.bleeding === 'heavy'
              ? 'heavy'
              : null,
      fever: Boolean(d.payload.fever),
      sleep_hours: d.payload.sleepHours ?? null,
      alcohol: Boolean(d.payload.alcohol),
      late_night: Boolean(d.payload.lateNight),
      measured_late: Boolean(d.payload.measuredLate),
      semen_exposure: Boolean(d.payload.semenExposure),
      infection: Boolean(d.payload.infection),
      has_log: d.hasLog,
    };
  });

  const personal: CihsPersonal = {
    meanCycleLength: args.personal.meanCycleLength,
    meanLutealLength: args.personal.meanLutealLength,
  };

  const cihs = runCihsEngine(cihsDays, personal);

  // Map CIHS window (cycle_day) back to dates for the existing webapp API.
  const windowCycleDay = { start: cihs.window[0], end: cihs.window[1] };
  const windowDates = {
    start: args.cycleDays.find((d) => d.cycleDayIndex === windowCycleDay.start)?.date ?? args.cycleDays[0]!.date,
    end: args.cycleDays.find((d) => d.cycleDayIndex === windowCycleDay.end)?.date ?? args.cycleDays.at(-1)!.date,
  };

  const estimated_day = args.cycleDays.find((d) => d.cycleDayIndex === cihs.anchor)?.date;

  const daily_risks: Array<{ date: IsoDate; risk: EngineRisk; reason: string }> = [];
  for (const d of args.cycleDays) {
    const rr = cihs.risks[d.cycleDayIndex] ?? 'MEDIUM';
    // CIHS emits only LOW/MEDIUM/HIGH; keep EngineRisk union.
    const risk = rr as EngineRisk;
    const reason = explainCihsState(cihs, d.cycleDayIndex);
    daily_risks.push({ date: d.date, risk, reason });
  }

  const latestDay = args.cycleDays.at(-1) ?? null;
  const latestCycleDay = latestDay?.cycleDayIndex ?? 1;

  // Compatibility-ish cycle state labels for existing UI
  const cycleState =
    cihs.confirmed && latestCycleDay > windowCycleDay.end
      ? 'INFERTILE_POST'
      : latestCycleDay >= windowCycleDay.start && latestCycleDay <= windowCycleDay.end
        ? 'FERTILE_OPEN'
        : 'INFERTILE_PRE';

  const peakDate =
    args.cycleDays
      .filter((d) => d.payload.mucusType === 'eggwhite')
      .at(-1)?.date ?? null;

  // Preserve temp shift confirmed date semantics: for DB compat we keep using v2's BBT detector for the date stamp,
  // but "confirmed" for risk is now *only* CIHS BBT-confirmation logic.
  const bbtCompat = detectBbtShift(args.cycleDays);
  const tempShiftConfirmedDate = bbtCompat.confirmedDate;

  // Map signals for trace/debug (best-effort).
  const signals: SignalResult[] = cihs.signals.map((s) => ({
    source: s.source,
    anchorCycleDay: s.anchor,
    reliability: s.reliability,
    explanation: s.explain,
  }));

  return {
    output: {
      ovulation: {
        window: windowDates,
        estimated_day,
        confidence: cihs.confidence,
      },
      daily_risks,
      warnings: cihs.warnings,
      trace: {
        coverage,
        cihs,
      },
    },
    derived: {
      peakDate,
      tempShiftConfirmedDate,
      cycleState,
      signals,
      coverage,
      windowCycleDay,
    },
  };
}

async function storeEngineResult(engineRepo: EngineRepository, args: {
  userId: string;
  cycleId: string;
  cycleStartDate: IsoDate;
  asOfDate: IsoDate;
  output: EngineOutput;
  trace: unknown;
  inputHash: string;
}): Promise<{ engineResultId: string }> {
  const id = randomUUID();
  const now = new Date().toISOString();
  await engineRepo.saveResult({
    id,
    user_id: args.userId,
    cycle_id: args.cycleId,
    cycle_start_date: args.cycleStartDate,
    as_of_date: args.asOfDate,
    engine_version: ENGINE_VERSION,
    parameter_version: PARAMETER_VERSION,
    input_hash: args.inputHash,
    output_json: JSON.stringify(args.output),
    created_at: now,
  });
  await engineRepo.saveTrace({
    id: randomUUID(),
    engine_result_id: id,
    trace_json: JSON.stringify(args.trace ?? {}),
    created_at: now,
  });
  return { engineResultId: id };
}

export async function getLatestEngineResult(engineRepo: EngineRepository, params: { userId: string; cycleId: string; asOfDate: IsoDate }): Promise<EngineOutput | null> {
  const result = await engineRepo.getLatestResult(params.userId);
  if (!result || result.as_of_date !== params.asOfDate || result.cycle_id !== params.cycleId) return null;

  const out = safeJsonParse<EngineOutput>(result.output_json);
  return out?.cycle_id ? out : null;
}

export async function runEngineV2(
  repos: { logRepo: LogRepository, engineRepo: EngineRepository, cycleRepo: CycleRepository },
  params: { userId: string; asOfDate: IsoDate }
): Promise<{ output: EngineOutput; publicToday: { risk: PublicRisk; explanation: string }; analytics: EngineAnalytics | null }> {
  const events = await getRawLogEvents(repos.logRepo, params.userId);
  if (events.length === 0) {
    // No logs yet: conservative defaults
    const dummyCycleId = 'no-cycle';
    const out: EngineOutput = {
      cycle_id: dummyCycleId,
      ovulation: { window: { start: params.asOfDate, end: params.asOfDate }, confidence: 0.2 },
      daily_risks: [{ date: params.asOfDate, risk: 'MEDIUM', reason: 'No data yet; assume risk is not low' }],
      warnings: ['No logs available.'],
      trace: { empty: true },
    };
    return { output: out, publicToday: { risk: 'INSUFFICIENT_DATA', explanation: 'No fertility data logged yet. Please log your observations to get accurate risk assessments.' }, analytics: null };
  }

  // Check if there are recent logs (within last 7 days)
  const sevenDaysAgo = new Date(params.asOfDate);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const sevenDaysAgoIso = sevenDaysAgo.toISOString().slice(0, 10);

  const recentEvents = events.filter(e => e.date >= sevenDaysAgoIso);
  if (recentEvents.length === 0) {
    // Has old logs but no recent ones
    const dummyCycleId = 'old-data-only';
    const out: EngineOutput = {
      cycle_id: dummyCycleId,
      ovulation: { window: { start: params.asOfDate, end: params.asOfDate }, confidence: 0.1 },
      daily_risks: [{ date: params.asOfDate, risk: 'INSUFFICIENT_DATA', reason: 'No recent logs; cannot assess current risk accurately' }],
      warnings: ['No logs in the last 7 days.'],
      trace: { insufficient_recent_data: true },
    };
    return { output: out, publicToday: { risk: 'INSUFFICIENT_DATA', explanation: 'No recent fertility data. Please log today\'s observations for accurate risk assessment.' }, analytics: null };
  }

  const start = events[0]!.date;
  const latestByDate = latestPayloadByDate(events, params.asOfDate);
  const normalized = buildNormalizedDays({ latestByDate, start, end: params.asOfDate });

  // Upsert normalized day snapshots + daily_logs compat for days we touched (cheap: all up to asOfDate, user datasets are small)
  // Also ensure cycle rows exist.
  const cycleStartDates = Array.from(new Set(normalized.map((d) => d.cycleStartDate))).sort();
  const cycleIdByStart = new Map<IsoDate, string>();
  for (const s of cycleStartDates) {
    const c = await ensureCycle(repos.cycleRepo, { userId: params.userId, cycleStartDate: s });
    cycleIdByStart.set(s, c.id);
  }

  for (const d of normalized) {
    await upsertNormalizedDay(repos.engineRepo, params.userId, d);
    const cycleId = cycleIdByStart.get(d.cycleStartDate)!;
    if (d.hasLog) await upsertDailyLogCompat(repos.logRepo, params.userId, cycleId, d);
  }

  // Current cycle is the one containing asOfDate
  const current = normalized.filter((d) => d.date === params.asOfDate)[0]!;
  const cycleStart = current.cycleStartDate;
  const cycleId = cycleIdByStart.get(cycleStart)!;
  const cycleDays = normalized.filter((d) => d.cycleStartDate === cycleStart);
  const todayCycleDay = current.cycleDayIndex;

  const personal = await getPersonalModel(repos.engineRepo, params.userId);
  const built = buildEngineForCycle({ cycleDays, personal });

  // Update cycles compat fields (state/peak/temp shift)
  await repos.cycleRepo.update(cycleId, {
    state: built.derived.cycleState,
    peak_date: built.derived.peakDate,
    temp_shift_confirmed_date: built.derived.tempShiftConfirmedDate,
  });

  const inputHash = sha256Hex(
    JSON.stringify({
      engineVersion: ENGINE_VERSION,
      parameterVersion: PARAMETER_VERSION,
      asOfDate: params.asOfDate,
      cycleStart,
      days: cycleDays.map((d) => ({
        date: d.date,
        hasLog: d.hasLog,
        payload: d.payload,
        rTemp: d.rTemp,
        rMucus: d.rMucus,
        rLh: d.rLh,
      })),
      personal,
    })
  );

  const output: EngineOutput = {
    cycle_id: cycleId,
    ...built.output,
  };

  await storeEngineResult(repos.engineRepo, {
    userId: params.userId,
    cycleId,
    cycleStartDate: cycleStart,
    asOfDate: params.asOfDate,
    output,
    trace: output.trace,
    inputHash,
  });

  const todayRisk = output.daily_risks.find((r) => r.date === params.asOfDate) ?? output.daily_risks.at(-1)!;
  const publicRisk = toPublicRisk(todayRisk.risk);

  const explanationParts: string[] = [];
  explanationParts.push(
    `Ovulation window ${output.ovulation.window.start}–${output.ovulation.window.end} (confidence ${(output.ovulation.confidence * 100).toFixed(0)}%).`
  );
  if (built.derived.coverage.criticalGap) explanationParts.push('Critical data gap widened the window.');
  if (output.warnings.length > 0) explanationParts.push(output.warnings[0]!);

  const analytics = extractAnalytics({ output, todayIso: params.asOfDate, todayCycleDay });

  return {
    output,
    publicToday: { risk: publicRisk, explanation: explanationParts.join(' ') },
    analytics,
  };
}

export function fertilityIndexCompatFromPayload(p: RawLogPayloadV1): number {
  // reuse existing mucus/sensation mapping when possible
  if (!p.mucusType || !p.sensation) return 0;
  return fertilityIndexForLog({ mucusType: p.mucusType, sensation: p.sensation });
}

