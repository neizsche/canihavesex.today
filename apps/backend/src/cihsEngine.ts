export type IsoDate = string; // "YYYY-MM-DD" (display only)

export type Mucus = 'dry' | 'sticky' | 'creamy' | 'watery' | 'eggwhite';
export type Bleeding = 'spotting' | 'light' | 'medium' | 'heavy';
export type Risk = 'LOW' | 'MEDIUM' | 'HIGH';

export type Day = {
  date: IsoDate | ''; // engine does not do date math; empty for placeholders
  cycle_day: number; // 1-based

  temperature?: number | null; // °C
  mucus?: Mucus | null;
  lh?: boolean | null; // True=positive, False=negative, null/undefined=not tested
  bleeding?: Bleeding | null;

  fever?: boolean;
  sleep_hours?: number | null;
  alcohol?: boolean;
  late_night?: boolean;
  measured_late?: boolean;
  semen_exposure?: boolean;
  infection?: boolean;

  has_log: boolean;
};

export type Personal = Partial<{
  meanCycleLength: number;
  meanLutealLength: number;
}>;

export type SignalSource = 'BBT' | 'LH' | 'MUCUS' | 'CALENDAR';

export type Signal = {
  source: SignalSource;
  anchor: number; // cycle_day
  reliability: number; // 0..1
  explain: string;
};

export type Coverage = {
  temp: number;
  mucus: number;
  lh: number;
  any: number;
  critical_gap: boolean;
};

export type PcosFlags = {
  pcos_like: boolean;
  pcos_score: number;
  pcos_reasons: string[];
};

export type EngineResult = {
  anchor: number;
  window: [number, number]; // inclusive cycle_day
  confidence: number; // 0.2..0.95 (and maybe capped lower for anovulatory suspicion)
  confirmed: boolean; // ONLY BBT shift confirms ovulation
  coverage: Coverage;
  signals: Signal[];
  warnings: string[];
  flags: PcosFlags;
  risks: Record<number, Risk>; // keyed by cycle_day
  trace?: unknown;
};

const ENGINE_VERSION = 'cihs-v1.0.0';

const FERTILE_ZONE_START = 8;
const FERTILE_ZONE_END = 20;

function clamp01(x: number): number {
  if (!Number.isFinite(x)) return 0;
  return Math.max(0, Math.min(1, x));
}

function clamp(x: number, lo: number, hi: number): number {
  if (!Number.isFinite(x)) return lo;
  return Math.max(lo, Math.min(hi, x));
}

function mean(xs: number[]): number {
  return xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length);
}

export function normalize_days(days: Day[]): Day[] {
  // Sorting, dedup (last wins), and gap fill using cycle_day keyspace.
  const map = new Map<number, Day>();
  for (const d of days ?? []) {
    const cd = Number(d?.cycle_day);
    if (!Number.isFinite(cd) || cd < 1) continue;
    map.set(cd, { ...d, cycle_day: cd });
  }
  const cds = Array.from(map.keys()).sort((a, b) => a - b);
  if (cds.length === 0) return [];

  const out: Day[] = [];
  for (let i = 0; i < cds.length; i++) {
    const cd = cds[i]!;
    out.push(map.get(cd)!);
    const nextCd = cds[i + 1];
    if (nextCd == null) continue;
    for (let missing = cd + 1; missing <= nextCd - 1; missing++) {
      out.push({
        date: '',
        cycle_day: missing,
        temperature: null,
        mucus: null,
        lh: null,
        bleeding: null,
        fever: false,
        alcohol: false,
        late_night: false,
        measured_late: false,
        semen_exposure: false,
        infection: false,
        sleep_hours: null,
        has_log: false,
      });
    }
  }
  return out;
}

export function temp_reliability(d: Day): number {
  if (d.temperature == null) return 0.0;
  if (d.fever) return 0.0;
  let r = 1.0;
  const sleep = typeof d.sleep_hours === 'number' ? d.sleep_hours : null;
  if (sleep != null && sleep < 4) r *= 0.4;
  if (d.alcohol) r *= 0.7;
  if (d.late_night) r *= 0.7;
  if (d.measured_late) r *= 0.8;
  return clamp01(r);
}

export function mucus_reliability(d: Day): number {
  if (d.mucus == null) return 0.0;
  if (d.semen_exposure) return 0.0;
  let r = 1.0;
  if (d.infection) r *= 0.3;
  return clamp01(r);
}

export function lh_reliability(d: Day): number {
  if (d.lh == null) return 0.0;
  return 1.0;
}

export function compute_coverage(days: Day[], rtemp: Record<number, number>, rmucus: Record<number, number>, rlh: Record<number, number>): Coverage {
  const zoneDays = days.filter((d) => d.cycle_day >= FERTILE_ZONE_START && d.cycle_day <= FERTILE_ZONE_END);
  const denom = FERTILE_ZONE_END - FERTILE_ZONE_START + 1; // inclusive
  const temp = zoneDays.filter((d) => (rtemp[d.cycle_day] ?? 0) > 0.5).length / denom;
  const mucus = zoneDays.filter((d) => (rmucus[d.cycle_day] ?? 0) > 0.5).length / denom;
  const lh = zoneDays.filter((d) => d.lh != null).length / denom;
  const any = zoneDays.filter((d) => Math.max(rtemp[d.cycle_day] ?? 0, rmucus[d.cycle_day] ?? 0, rlh[d.cycle_day] ?? 0) > 0.5).length / denom;

  let critical_gap = false;
  let streak = 0;
  for (const d of zoneDays) {
    if (!d.has_log) streak += 1;
    else streak = 0;
    if (streak >= 2) {
      critical_gap = true;
      break;
    }
  }

  return { temp, mucus, lh, any, critical_gap };
}

export function detect_bbt(days: Day[], rtemp: Record<number, number>): Signal | null {
  // For each index i (starting at 6): baseline = mean of prev 6 temps with rtemp>0.5
  // next3 = i+1..i+3 must all be reliable; if >=2 hits (>=baseline+0.2), shift at i => anchor=days[i].cycle_day
  for (let i = 6; i < days.length; i++) {
    const prev: number[] = [];
    for (let j = i - 6; j <= i - 1; j++) {
      if (j < 0) continue;
      const d = days[j]!;
      const rt = rtemp[d.cycle_day] ?? 0;
      if (d.temperature != null && rt > 0.5) prev.push(d.temperature);
    }
    if (prev.length < 6) continue;
    const baseline = mean(prev);

    const next3 = days.slice(i + 1, i + 4);
    if (next3.length < 3) continue;
    if (
      next3.some((d) => d.temperature == null || (rtemp[d.cycle_day] ?? 0) <= 0.5)
    ) {
      continue;
    }
    const hits = next3.filter((d) => (d.temperature as number) >= baseline + 0.2).length;
    if (hits >= 2) {
      const avgR = mean(next3.map((d) => rtemp[d.cycle_day] ?? 0));
      return {
        source: 'BBT',
        anchor: days[i]!.cycle_day,
        reliability: clamp01(0.7 * avgR),
        explain: `BBT shift detected: ≥2 of next 3 temps ≥ baseline+0.2°C (baseline≈${baseline.toFixed(2)}°C)`,
      };
    }
  }
  return null;
}

export function detect_lh(days: Day[], rlh: Record<number, number>, bbt_anchor: number | null): { signal: Signal | null; multiple: boolean } {
  const positives = days.filter((d) => d.lh === true).map((d) => d.cycle_day);
  if (positives.length === 0) return { signal: null, multiple: false };
  const multiple = positives.length > 1;

  let chosen = positives[positives.length - 1]!;
  if (bbt_anchor != null) {
    const before = positives.filter((cd) => cd <= bbt_anchor);
    if (before.length > 0) chosen = before[before.length - 1]!;
  }

  const relBase = 0.9 * (rlh[chosen] ?? 1.0);
  const reliability = clamp01(multiple ? relBase * 0.8 : relBase);
  return {
    multiple,
    signal: {
      source: 'LH',
      anchor: chosen + 1,
      reliability,
      explain: multiple
        ? `Multiple LH positives; using last relevant positive on cycle day ${chosen} with penalty`
        : `LH positive on cycle day ${chosen} → ovulation estimate day ${chosen + 1}`,
    },
  };
}

export function detect_mucus(days: Day[], rmucus: Record<number, number>): Signal | null {
  const peaks = days.filter((d) => d.mucus === 'eggwhite' && (rmucus[d.cycle_day] ?? 0) > 0.5).map((d) => d.cycle_day);
  if (peaks.length === 0) return null;
  const peak = peaks[peaks.length - 1]!;
  const reliability = clamp01(0.6 * (rmucus[peak] ?? 0));
  return {
    source: 'MUCUS',
    anchor: peak + 1,
    reliability,
    explain: `Mucus peak (eggwhite) on cycle day ${peak} → ovulation estimate day ${peak + 1}`,
  };
}

export function detect_calendar(personal: Personal | undefined): Signal {
  const meanCycleLength = typeof personal?.meanCycleLength === 'number' ? personal.meanCycleLength : 28.0;
  const meanLutealLength = typeof personal?.meanLutealLength === 'number' ? personal.meanLutealLength : 14.0;
  const anchor = Math.round(meanCycleLength - meanLutealLength);
  return {
    source: 'CALENDAR',
    anchor,
    reliability: 0.3,
    explain: `Calendar prior: ovulation≈meanCycleLength-meanLutealLength (${meanCycleLength.toFixed(1)}-${meanLutealLength.toFixed(1)}≈${anchor})`,
  };
}

export function detect_pcos_like(args: {
  days: Day[];
  rmucus: Record<number, number>;
  rtemp: Record<number, number>;
  personal?: Personal;
}): { flag: boolean; score: number; reasons: string[]; explain: string } | null {
  let score = 0;
  const reasons: string[] = [];

  // LH: repeated positives spaced >=5 days apart
  const lhPos = args.days.filter((d) => d.lh === true).map((d) => d.cycle_day);
  if (lhPos.length >= 2) {
    const spaced = lhPos.some((a, i) => lhPos.slice(i + 1).some((b) => Math.abs(b - a) >= 5));
    if (spaced) {
      score += 1;
      reasons.push('Repeated LH positives spaced ≥5 days apart');
    } else {
      score += 1;
      reasons.push('Multiple LH positives');
    }
  }

  // Mucus: multiple eggwhite peaks spaced >=5 days apart
  const eggPeaks = args.days
    .filter((d) => d.mucus === 'eggwhite' && (args.rmucus[d.cycle_day] ?? 0) > 0.5)
    .map((d) => d.cycle_day);
  if (eggPeaks.length >= 2) {
    const spaced = eggPeaks.some((a, i) => eggPeaks.slice(i + 1).some((b) => Math.abs(b - a) >= 5));
    if (spaced) {
      score += 1;
      reasons.push('Multiple eggwhite mucus peaks spaced ≥5 days apart');
    } else {
      score += 1;
      reasons.push('Multiple eggwhite mucus peaks');
    }
  }

  // Temp variability: spread ≥0.35°C on reliable days (needs ≥8 temps)
  const temps = args.days
    .filter((d) => d.temperature != null && (args.rtemp[d.cycle_day] ?? 0) > 0.5)
    .map((d) => d.temperature as number);
  if (temps.length >= 8) {
    const spread = Math.max(...temps) - Math.min(...temps);
    if (spread >= 0.35) {
      score += 1;
      reasons.push(`High BBT variability on reliable days (spread≈${spread.toFixed(2)}°C)`);
    }
  }

  // Long/irregular cycle: expected length ≥35 OR current cycle_day ≥35
  const expected = typeof args.personal?.meanCycleLength === 'number' ? args.personal.meanCycleLength : 28.0;
  const currentCd = Math.max(...args.days.map((d) => d.cycle_day));
  if (expected >= 35 || currentCd >= 35) {
    score += 1;
    reasons.push('Long/irregular cycle pattern (expected/current ≥35 days)');
  }

  if (score < 3) return null;
  return {
    flag: true,
    score,
    reasons,
    explain: `PCOS-like pattern detected (score=${score}): ${reasons.join('; ')}. This is not a diagnosis; expect lower certainty.`,
  };
}

export function fuse(args: { signals: Signal[]; coverage: Coverage }): {
  anchor: number;
  window: [number, number];
  confidence: number;
  used: Signal[];
  warnings: string[];
} {
  const reliable = args.signals.filter((s) => s.reliability >= 0.4);
  const warnings: string[] = [];

  const calendar = args.signals.find((s) => s.source === 'CALENDAR') ?? null;
  if (reliable.length === 0) {
    if (calendar) {
      const a = calendar.anchor;
      return {
        anchor: a,
        window: [Math.max(1, a - 8), a + 8],
        confidence: 0.2,
        used: [calendar],
        warnings: ['No reliable signals (calendar prior only)'],
      };
    }
    return { anchor: 14, window: [10, 20], confidence: 0.2, used: [], warnings: ['No reliable signals (default window)'] };
  }

  // Anchor selection
  const lh = reliable.find((s) => s.source === 'LH') ?? null;
  let anchor: number;
  if (lh) {
    anchor = lh.anchor;
  } else {
    const weights: Record<SignalSource, number> = { LH: 1.0, BBT: 0.8, MUCUS: 0.6, CALENDAR: 0.3 };
    const num = reliable.reduce((a, s) => a + s.anchor * (weights[s.source] ?? 0), 0);
    const den = reliable.reduce((a, s) => a + (weights[s.source] ?? 0), 0);
    anchor = den > 0 ? Math.round(num / den) : reliable[0]!.anchor;
  }

  let start = anchor - 2;
  let end = anchor + 2;
  if (args.coverage.critical_gap) {
    start -= 2;
    end += 2;
  }
  if (args.coverage.any < 0.5) {
    start -= 1;
    end += 1;
  }

  start = Math.max(1, start);
  end = Math.max(start, end);

  // Confidence
  const base = Math.max(...reliable.map((s) => s.reliability));
  const cov_factor = Math.min(1.0, args.coverage.temp + args.coverage.mucus);
  const anchors = reliable.map((s) => s.anchor);
  const conflict = Math.max(...anchors) - Math.min(...anchors) > 3 ? 0.8 : 1.0;
  let confidence = clamp01(base * cov_factor * conflict);
  confidence = clamp(confidence, 0.2, 0.95);

  if (args.coverage.critical_gap) warnings.push('Critical gap: ≥2 consecutive missing days in fertile zone.');
  return { anchor, window: [start, end], confidence, used: reliable, warnings };
}

export function run_engine(rawDays: Day[], personal?: Personal): EngineResult {
  const days = normalize_days(rawDays);
  const warnings: string[] = [];
  const trace: any = { engine_version: ENGINE_VERSION };

  if (days.length === 0) {
    return {
      anchor: 14,
      window: [10, 20],
      confidence: 0.2,
      confirmed: false,
      coverage: { temp: 0, mucus: 0, lh: 0, any: 0, critical_gap: false },
      signals: [],
      warnings: ['No days provided.'],
      flags: { pcos_like: false, pcos_score: 0, pcos_reasons: [] },
      risks: {},
      trace,
    };
  }

  // Stage 1 — reliability
  const rtemp: Record<number, number> = {};
  const rmucus: Record<number, number> = {};
  const rlh: Record<number, number> = {};
  for (const d of days) {
    rtemp[d.cycle_day] = temp_reliability(d);
    rmucus[d.cycle_day] = mucus_reliability(d);
    rlh[d.cycle_day] = lh_reliability(d);
  }

  // Stage 2 — coverage
  const coverage = compute_coverage(days, rtemp, rmucus, rlh);

  // Stage 3 — signals
  const bbt = detect_bbt(days, rtemp);
  const lh = detect_lh(days, rlh, bbt?.anchor ?? null);
  const mucus = detect_mucus(days, rmucus);
  const cal = detect_calendar(personal);
  const signals: Signal[] = [bbt, lh.signal, mucus, cal].filter(Boolean) as Signal[];

  // Stage 4 — fusion
  const fused = fuse({ signals, coverage });
  warnings.push(...fused.warnings);

  let confidence = fused.confidence;

  // Stage 5 — risk + invariants
  const confirmed = bbt != null; // critical invariant: only BBT confirms

  const anovulatorySuspected = bbt == null && lh.signal == null && mucus == null;
  if (anovulatorySuspected) {
    confidence = Math.min(confidence, 0.4);
    warnings.push('Anovulatory cycle suspected (no BBT, LH, or mucus peak).');
  }

  const pcos = detect_pcos_like({ days, rmucus, rtemp, personal });
  if (pcos?.flag) warnings.push(pcos.explain);

  const [wStart, wEnd] = fused.window;
  const risks: Record<number, Risk> = {};
  for (const d of days) {
    const cd = d.cycle_day;
    let risk: Risk;
    if (cd >= wStart && cd <= wEnd) {
      risk = 'HIGH';
    } else if (!confirmed) {
      risk = 'MEDIUM';
    } else if (confidence < 0.7) {
      risk = 'MEDIUM';
    } else {
      risk = 'LOW';
    }
    if (coverage.critical_gap && risk === 'LOW') risk = 'MEDIUM';
    risks[cd] = risk;
  }

  // Safety invariants (self-heal, never throw in prod)
  let anchor = fused.anchor;
  let window: [number, number] = [wStart, wEnd];
  if (!(anchor >= window[0] && anchor <= window[1])) {
    // Re-center window around anchor conservatively.
    window = [Math.max(1, anchor - 2), anchor + 2];
    warnings.push('Invariant repair: anchor forced inside window.');
  }
  if (window[0] > window[1]) {
    window = [window[0], window[0]];
    warnings.push('Invariant repair: window_start <= window_end.');
  }

  trace.reliability = { rtemp, rmucus, rlh };
  trace.fused = fused;
  trace.anovulatorySuspected = anovulatorySuspected;

  return {
    anchor,
    window,
    confidence: clamp(confidence, 0.2, 0.95),
    confirmed,
    coverage,
    signals,
    warnings,
    flags: {
      pcos_like: Boolean(pcos?.flag),
      pcos_score: pcos?.score ?? 0,
      pcos_reasons: pcos?.reasons ?? [],
    },
    risks,
    trace,
  };
}

export function explain_state(result: EngineResult, today_cycle_day: number): string {
  const [a, b] = result.window;
  const todayRisk = result.risks[today_cycle_day] ?? (today_cycle_day >= a && today_cycle_day <= b ? 'HIGH' : 'MEDIUM');
  const signals = result.signals.map((s) => s.source).join(', ') || 'none';
  const parts: string[] = [];
  parts.push(`Ovulation window CD${a}–CD${b}.`);
  parts.push(`Confirmed: ${result.confirmed ? 'yes (BBT shift)' : 'no'}; confidence ${(result.confidence * 100).toFixed(0)}%.`);
  if (result.coverage.critical_gap) parts.push('Critical gap widened the window.');
  parts.push(`Signals: ${signals}.`);
  if (result.warnings.length) parts.push(`Warnings: ${result.warnings.join(' ')}`);
  parts.push(`Today: ${todayRisk}.`);
  return parts.join(' ');
}

export function run_engine_incrementally(all_days: Day[], personal?: Personal): Array<{
  date: Day['date'];
  cycle_day: number;
  window: [number, number];
  confidence: number;
  confirmed: boolean;
  today_risk: Risk;
  explanation: string;
}> {
  const normalized = normalize_days(all_days);
  const out: Array<{
    date: Day['date'];
    cycle_day: number;
    window: [number, number];
    confidence: number;
    confirmed: boolean;
    today_risk: Risk;
    explanation: string;
  }> = [];
  for (let i = 0; i < normalized.length; i++) {
    const prefix = normalized.slice(0, i + 1);
    const r = run_engine(prefix, personal);
    const today = prefix[prefix.length - 1]!;
    const todayRisk = r.risks[today.cycle_day] ?? 'MEDIUM';
    out.push({
      date: today.date,
      cycle_day: today.cycle_day,
      window: r.window,
      confidence: r.confidence,
      confirmed: r.confirmed,
      today_risk: todayRisk,
      explanation: explain_state(r, today.cycle_day),
    });
  }
  return out;
}

export function summarize_cycle(days: Day[], personal?: Personal): {
  result: EngineResult;
  summary: Record<string, unknown>;
} {
  const result = run_engine(days, personal);
  const [w0, w1] = result.window;
  const cds = normalize_days(days).map((d) => d.cycle_day);
  const maxCd = cds.length ? Math.max(...cds) : 0;
  const unsafe_days: number[] = [];
  const caution_days: number[] = [];
  const non_fertile_days: number[] = [];
  for (let cd = 1; cd <= maxCd; cd++) {
    const r = result.risks[cd];
    if (r === 'HIGH') unsafe_days.push(cd);
    else if (r === 'MEDIUM') caution_days.push(cd);
    else if (r === 'LOW') non_fertile_days.push(cd);
  }
  return {
    result,
    summary: {
      engine_version: ENGINE_VERSION,
      estimated_ovulation_day: result.anchor,
      ovulation_window: [w0, w1],
      ovulation_confirmed: result.confirmed,
      confidence: result.confidence,
      unsafe_days,
      caution_days,
      non_fertile_days,
      key_signals: result.signals,
      coverage: result.coverage,
      flags: result.flags,
      warnings: result.warnings,
    },
  };
}

