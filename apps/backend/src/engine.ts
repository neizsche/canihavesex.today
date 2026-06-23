import { randomUUID } from 'node:crypto';
import { Log } from './repositories/LogRepository.js';
import { DailyStatus } from './repositories/DailyStatusRepository.js';
import { Cycle } from './repositories/CycleRepository.js';
import { addDaysIso as addDays, daysBetweenIso as daysBetween, generateIsoDateRange as generateDateRange, isoToday, BACKLOG_WINDOW_DAYS } from './utils/dates.js';

// Identifies the engine revision that produced a daily_status row. Bump this
// when engine output changes so the read path can recompute stale cached rows.
export const ENGINE_VERSION = 'v6.1.0-twotier';

// --- Types ---
type IsoDate = string;
type FertilityStatus = 'fertile' | 'unsure' | 'not_fertile' | 'period';
type Phase = 'Follicular' | 'Ovulatory' | 'Luteal' | 'Period';
type SignalSource = 'BBT' | 'LH' | 'MUCUS' | 'CALENDAR';

// Why a day resolved to `unsure`. Surfaced (via insights_payload) so the Today
// screen can explain the uncertainty in plain language instead of a bare "Not
// Sure". Null whenever status is not `unsure`. Purely informational — it never
// changes which status classifyDay returns (the P1/P2 safety semantics own that).
type UnsureReason =
    | 'lost_track' // past the expected cycle length with no anchoring signal
    | 'awaiting_ovulation' // pre-ovulation, not enough history to call it low-risk
    | 'awaiting_confirmation' // post-window, ovulation not yet confirmed by a temp shift
    | 'conflicting_signals'; // signals disagree (e.g. LH+ but no temp shift)

// Engine inputs from per-user settings. `avg_cycle_length` is the onboarding
// fallback used until enough cycles are logged; `cycle_regularity` flags
// irregular-cycle handling (Tier B) before history alone can detect it.
export interface EngineMeta {
    avg_cycle_length: number;
    cycle_regularity?: 'regular' | 'irregular' | 'unsure' | null;
}

interface EngineContext {
    logs: Log[];
    meta: EngineMeta;
    existingCycles?: Cycle[];
    today?: IsoDate;
    timezoneOffsetMinutes?: number;
}

// Normalized day for engine processing.
interface EngineDay {
    date: IsoDate;
    cycleDay: number;
    log?: Log;
    reliability: { temp: number; mucus: number; lh: number };
    tempValue?: number;
    mucusValue?: number; // 0=dry 1=sticky 2=creamy 3=watery 4=eggwhite
    isLhPositive?: boolean;
    isBleeding?: boolean;
}

interface Signal {
    source: SignalSource;
    anchorDay: number;   // cycle day
    confidence: number;  // 0..1
    explanation: string;
}

interface EngineResult {
    ovulationDay: number;
    window: { start: number; end: number }; // fertile window in cycle days
    confidence: number;
    signals: Signal[];
    anomalies: string[];
    isConfirmed: boolean;
    tier: 'confirmation' | 'prediction';
}

// =============================================================================
// CONFIG — every tunable constant lives here (engine-v6 §6.5). Each is covered
// by a reference test; do not scatter magic numbers through the logic.
// =============================================================================
export const CONFIG = {
    cycle: {
        MIN_CYCLE: 15,            // shortest cycle we will predict for
        MAX_CYCLE: 90,           // longer ⇒ treat prior cycle as still open / gap
        MAX_BLEED_BREAK: 1,      // days of break tolerated inside one menses
        DEFAULT_LENGTH: 28,
        DEFAULT_PERIOD_LENGTH: 5,
        RECENT_WINDOW: 6,        // cycles used for median/spread
        MIN_CYCLES_FOR_STRONG_HISTORY: 3,
    },
    luteal: { DEFAULT: 14, MIN: 10, MAX: 20 },
    ovulation: { MIN_DAY: 5 },
    window: { PRE: 5, POST: 1 }, // fertile window = [ov-5, ov+1]
    bbt: {
        ROUND_STEP: 0.05,
        BASELINE_DAYS: 6,        // LTL = max of previous 6 reliable temps
        THRESHOLD: 0.2,          // °C above LTL (clinical 3-over-6 rule)
        MIN_PRIOR_TEMPS: 6,
        MIN_VALID: 34, MAX_VALID: 42,
    },
    irregular: {
        SPREAD_DAYS: 7,          // recent max-min spread above which → irregular
        RANGE_SPAN_MIN: 1,
        RANGE_SPAN_MAX: 5,
    },
    corroboration: { DAYS: 2 },  // secondary signal must land within ±2d of BBT
    conf: {
        BBT: 0.85, LH: 0.80, MUCUS: 0.55,
        CALENDAR_REGULAR: 0.40, CALENDAR_IRREGULAR: 0.25,
        ALIGN_BONUS: 0.05, ALIGN_MAX: 0.15, CONFLICT_PENALTY: 0.10,
        MIN: 0.1, MAX: 0.99,
    },
} as const;

const MUCUS_SCORES: Record<string, number> = {
    dry: 0, sticky: 1, creamy: 2, watery: 3, eggwhite: 4,
};

// =============================================================================
// Guardrails (engine-v6 §9.1) — clamps + soft invariant checks. We *degrade,
// never throw* on user data so a bad reading can't 500 the API.
// =============================================================================
function clamp(value: number, lo: number, hi: number): number {
    return Math.max(lo, Math.min(hi, value));
}

function isValidTemp(t: number | null | undefined): t is number {
    return typeof t === 'number' && Number.isFinite(t) && t >= CONFIG.bbt.MIN_VALID && t <= CONFIG.bbt.MAX_VALID;
}

// Soft assertion: records a violated invariant without crashing the request.
// Tests assert on engine *output* directly; this only guards production.
function softAssert(condition: boolean, message: string): void {
    if (!condition && process.env.NODE_ENV !== 'production' && process.env.ENGINE_STRICT === '1') {
        throw new Error(`[engine invariant] ${message}`);
    }
    if (!condition) {
        // eslint-disable-next-line no-console
        console.warn(`[engine invariant] ${message}`);
    }
}

function median(values: number[]): number {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 1
        ? sorted[mid]
        : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

function roundToStep(value: number, step: number): number {
    const inv = 1 / step;
    return Math.round(value * inv) / inv;
}

// =============================================================================
// Main entry — signature unchanged (consumed by EngineService).
// =============================================================================
export function runFusionEngine(userId: string, context: EngineContext): {
    statuses: DailyStatus[];
    cycles: Cycle[];
} {
    const sortedLogs = [...context.logs].sort((a, b) => a.date.localeCompare(b.date));
    if (sortedLogs.length === 0) return { statuses: [], cycles: [] };

    const logMap = new Map<string, Log>();
    sortedLogs.forEach((l) => logMap.set(l.date, l));

    const cycles = identifyCycles(userId, sortedLogs, context.existingCycles || []);

    const lastLogDate = sortedLogs[sortedLogs.length - 1].date;
    const today = context.today ?? isoToday(context.timezoneOffsetMinutes);
    const viewEnd = addDays(today, 30);

    const relevantCycles = cycles.filter((c) => {
        const isActive = !c.end_date;
        // Regenerate statuses for any cycle still inside the editable back-log
        // window so editing an old day immediately refreshes its calendar colours.
        const isRecent = !!c.end_date && daysBetween(c.end_date, today) <= BACKLOG_WINDOW_DAYS;
        const isUnanalyzed = !c.ovulation_prediction;
        return isActive || isRecent || isUnanalyzed;
    });

    // Cycle-level facts shared by every day (computed once).
    const cycleStats = computeCycleStats(cycles);
    const predictedLength = predictedCycleLength(cycles, context.meta);
    const personalizedLuteal = inferLutealPhase(cycles, logMap);
    const irregular = detectIrregular(cycles, context.meta);

    const statuses: DailyStatus[] = [];

    for (const cycle of relevantCycles) {
        const lastCycleLogDate = getLastLogDateForCycle(cycle, sortedLogs);
        const analysisEnd = cycle.end_date || lastCycleLogDate || today;
        const cycleStartsWithBleed = isCycleStartBleeding(cycle, logMap);
        const cycleDays = normalizeCycleData(cycle, logMap, analysisEnd);

        const result = fuse(cycleDays, {
            predictedLength,
            luteal: personalizedLuteal,
            irregular,
            cycleStats,
        });

        cycle.ovulation_prediction = addDays(cycle.start_date, result.ovulationDay - 1);
        cycle.ovulation_confirmed_date = result.isConfirmed ? cycle.ovulation_prediction : null;
        cycle.analysis_flags = result.anomalies;

        const activeCycleLength = result.ovulationDay > 0 ? result.ovulationDay + personalizedLuteal : predictedLength;
        const cycleDayOfToday = daysBetween(cycle.start_date, today) + 1;

        const expectedEndDate = addDays(cycle.start_date, activeCycleLength - 1);
        const logsAfterThreshold = sortedLogs.filter(l => l.date > expectedEndDate && l.date >= cycle.start_date);

        const hasFertilitySignal = logsAfterThreshold.some(l => {
            const hasTemp = l.temperature !== null && l.temperature !== undefined;
            const hasMucus = l.mucus !== null && l.mucus !== undefined;
            const hasLh = l.lh_test !== null && l.lh_test !== undefined && String(l.lh_test) !== 'notTaken';
            return hasTemp || hasMucus || hasLh;
        });

        const hasMenstruationOrCervicalFluid = logsAfterThreshold.some(l => {
            const hasBleeding = l.bleeding !== null && l.bleeding !== undefined && l.bleeding !== 'none';
            const hasMucus = l.mucus !== null && l.mucus !== undefined;
            return hasBleeding || hasMucus;
        });

        const lostTrack = !cycle.end_date && cycleDayOfToday > activeCycleLength && !(hasFertilitySignal && hasMenstruationOrCervicalFluid);

        const cycleEnd = cycle.end_date || viewEnd;
        const daysToGen = generateDateRange(cycle.start_date, cycleEnd);
        const periodLength = cycle.period_length || CONFIG.cycle.DEFAULT_PERIOD_LENGTH;

        for (const date of daysToGen) {
            const cycleDay = daysBetween(cycle.start_date, date) + 1;
            const dayData = cycleDays.find((d) => d.date === date);
            const log = logMap.get(date);

            const { status, phase, unsureReason } = classifyDay({
                cycleDay,
                log,
                cycleStartsWithBleed,
                periodLength,
                result,
                irregular,
                strongHistory: cycleStats.completedCount >= CONFIG.cycle.MIN_CYCLES_FOR_STRONG_HISTORY && !irregular.isIrregular,
                activeCycleLength,
                lostTrack,
            });

            statuses.push({
                id: randomUUID(),
                user_id: userId,
                date,
                fertility_status: status,
                phase,
                is_predicted: date > (lastLogDate || today),
                engine_version: ENGINE_VERSION,
                updated_at: new Date().toISOString(),
                insights_payload: buildDayMeta(result, cycleStats, cycleDays, today, date, dayData, irregular, lostTrack, activeCycleLength, unsureReason),
            });
        }
    }

    const uniqueStatuses = Array.from(new Map(statuses.map((s) => [s.date, s])).values());
    return { statuses: uniqueStatuses, cycles };
}

// =============================================================================
// Module 1 — Cycle identification (engine-v6 §6.1, fixes A1–A3)
// =============================================================================

const BLEED_RANK: Record<string, number> = { none: 0, spotting: 1, light: 2, medium: 3, heavy: 4 };

/** A day that counts toward menses clustering: bleeding ≥ light. */
function isMensesBleed(log: Log | undefined): boolean {
    return !!log && (BLEED_RANK[log.bleeding || 'none'] ?? 0) >= BLEED_RANK.light;
}

/**
 * Period starts from logs. An explicit, non-uncertain `cycle_start` marker wins;
 * otherwise the first day of a ≥light bleeding cluster (≤1-day internal gap) that
 * begins ≥MIN_CYCLE days after the previous accepted start. (O1: light starts a
 * cycle; spotting alone does not.)
 */
export function detectCycleStarts(logs: Log[]): IsoDate[] {
    const sorted = [...logs].sort((a, b) => a.date.localeCompare(b.date));
    const starts: IsoDate[] = [];

    const accept = (date: IsoDate) => {
        const prev = starts[starts.length - 1];
        if (!prev || daysBetween(prev, date) >= CONFIG.cycle.MIN_CYCLE) {
            starts.push(date);
            return true;
        }
        return false;
    };

    let lastBleedDate: IsoDate | null = null;
    for (const log of sorted) {
        // Explicit, confident marker: always a start (respecting min-cycle spacing).
        if (log.cycle_start && !log.is_uncertain) {
            accept(log.date);
            lastBleedDate = log.date;
            continue;
        }
        if (!isMensesBleed(log)) continue;

        const continuesMenses =
            lastBleedDate !== null && daysBetween(lastBleedDate, log.date) <= CONFIG.cycle.MAX_BLEED_BREAK + 1;
        if (!continuesMenses) {
            accept(log.date);
        }
        lastBleedDate = log.date;
    }
    return starts;
}

function identifyCycles(userId: string, logs: Log[], existingCycles: Cycle[]): Cycle[] {
    const logMap = new Map<string, Log>();
    logs.forEach((l) => logMap.set(l.date, l));

    const starts = detectCycleStarts(logs);
    if (starts.length === 0) {
        // No detectable menses yet — treat the whole span as one open cycle so the
        // user still gets a calendar-based status.
        const rebuilt: Cycle[] = [newCycle(userId, logs[0].date, null, logMap)];
        return mergeWithHistory(rebuilt, existingCycles);
    }

    const rebuilt: Cycle[] = starts.map((start, i) => {
        const isLast = i === starts.length - 1;
        const end = isLast ? null : addDays(starts[i + 1], -1);
        return newCycle(userId, start, end, logMap);
    });

    return mergeWithHistory(rebuilt, existingCycles);
}

function newCycle(userId: string, start: IsoDate, end: IsoDate | null, logMap: Map<string, Log>): Cycle {
    return {
        id: randomUUID(),
        user_id: userId,
        start_date: start,
        end_date: end,
        ovulation_prediction: null,
        ovulation_confirmed_date: null,
        length: end ? daysBetween(start, end) + 1 : null,
        period_length: calculatePeriodLength(start, logMap),
        analysis_flags: [],
    };
}

/**
 * Keep existing cycles older than the rebuilt window untouched (history outside
 * the log lookback), and preserve IDs/analysis for cycles we re-derived.
 */
function mergeWithHistory(rebuilt: Cycle[], existing: Cycle[]): Cycle[] {
    if (existing.length === 0) return rebuilt;
    const earliestRebuilt = rebuilt[0]?.start_date;
    const olderRetained = earliestRebuilt
        ? existing.filter((c) => c.start_date < earliestRebuilt)
        : [];
    const merged = rebuilt.map((nc) => {
        const match = existing.find((oc) => oc.start_date === nc.start_date);
        if (!match) return nc;
        return {
            ...nc,
            id: match.id,
            ovulation_prediction: match.ovulation_prediction || nc.ovulation_prediction,
            ovulation_confirmed_date: match.ovulation_confirmed_date || nc.ovulation_confirmed_date,
            analysis_flags: match.analysis_flags?.length ? match.analysis_flags : nc.analysis_flags,
        };
    });
    return [...olderRetained, ...merged].sort((a, b) => a.start_date.localeCompare(b.start_date));
}

// =============================================================================
// Module 2 — Normalization & reliability (largely unchanged)
// =============================================================================
function normalizeCycleData(cycle: Cycle, logMap: Map<string, Log>, analysisEnd: string): EngineDay[] {
    const days: EngineDay[] = [];
    const range = generateDateRange(cycle.start_date, analysisEnd);

    for (const date of range) {
        const log = logMap.get(date);
        const cycleDay = daysBetween(cycle.start_date, date) + 1;
        const dist = log?.disturbances || [];

        let rTemp = 1.0;
        if (!isValidTemp(log?.temperature)) rTemp = 0.0;
        else if (dist.includes('sick') || dist.includes('fever')) rTemp = 0.0;
        else {
            if (dist.includes('alcohol')) rTemp *= 0.7;
            if (dist.includes('bad_sleep') || (log?.symptoms || []).includes('sleep:poor')) rTemp *= 0.4;
            if (dist.includes('late_measurement')) rTemp *= 0.8;
            if (dist.includes('stress')) rTemp *= 0.9;
        }

        let rMucus = 1.0;
        if (!log?.mucus) rMucus = 0.0;
        else {
            if (dist.includes('semen_exposure')) rMucus = 0.0;
            if (dist.includes('infection')) rMucus = 0.3;
        }

        const rLh = log?.lh_test ? 1.0 : 0.0;

        days.push({
            date,
            cycleDay,
            log,
            reliability: { temp: rTemp, mucus: rMucus, lh: rLh },
            tempValue: isValidTemp(log?.temperature) ? log!.temperature! : undefined,
            mucusValue: log?.mucus ? MUCUS_SCORES[log.mucus] : 0,
            isLhPositive: log?.lh_test === 'positive',
            isBleeding: Boolean(log?.bleeding && log.bleeding !== 'none'),
        });
    }
    return days;
}

// =============================================================================
// Module 3 — Tier A detectors (engine-v6 §6.4)
// =============================================================================

interface ShiftResult { detected: boolean; anchorDay?: number; evalCompleteDay?: number; rule?: number }

/**
 * BBT shift — the clinical 3-over-6 rule: LTL = max of the previous 6 reliable temps;
 * a first-higher-measurement above LTL confirmed by 3 highs (regular rule) or
 * the two exception rules tolerating one disturbed day. Ovulation = day before
 * the first higher measurement. (Fixes A4–A6.)
 */
export function detectBBTShift(days: EngineDay[]): ShiftResult {
    const temps = days
        .filter((d) => d.reliability.temp > 0.5 && d.tempValue !== undefined)
        .map((d) => ({ cycleDay: d.cycleDay, temp: roundToStep(d.tempValue!, CONFIG.bbt.ROUND_STEP) }));

    if (temps.length < CONFIG.bbt.MIN_PRIOR_TEMPS + 1) return { detected: false };

    for (let i = CONFIG.bbt.BASELINE_DAYS; i < temps.length; i++) {
        const prior = temps.slice(i - CONFIG.bbt.BASELINE_DAYS, i);
        const ltl = Math.max(...prior.map((p) => p.temp));
        if (temps[i].temp <= ltl) continue;

        const next = temps.slice(i + 1, i + 4);
        const t = CONFIG.bbt.THRESHOLD - 1e-4;

        // Regular rule: next 2 days above LTL, and the 3rd high ≥0.2 above LTL.
        if (next.length >= 2 && next[0].temp > ltl && next[1].temp > ltl && next[1].temp - ltl >= t) {
            return { detected: true, rule: 0, anchorDay: temps[i - 1].cycleDay, evalCompleteDay: next[1].cycleDay };
        }
        // 1st exception: 3 consecutive highs, 4th day also > LTL.
        if (next.length >= 3 && next.every((d) => d.temp > ltl)) {
            return { detected: true, rule: 1, anchorDay: temps[i - 1].cycleDay, evalCompleteDay: next[2].cycleDay };
        }
        // 2nd exception: one of next two dips to/below LTL (not both), 3rd ≥0.2 above.
        if (next.length >= 3) {
            const d2 = next[0].temp <= ltl;
            const d3 = next[1].temp <= ltl;
            if (((d2 || d3) && !(d2 && d3)) && next[2].temp - ltl >= t) {
                return { detected: true, rule: 2, anchorDay: temps[i - 1].cycleDay, evalCompleteDay: next[2].cycleDay };
            }
        }
    }
    return { detected: false };
}

/**
 * Mucus shift — peak fertile mucus (watery=3 or eggwhite=4) confirmed by 3
 * following days of lower quality (the dry-up). (Fixes A7–A8.)
 */
export function detectMucusShift(days: EngineDay[]): ShiftResult {
    const mucusDays = days.filter((d) => d.reliability.mucus > 0.5 && d.mucusValue !== undefined);
    let best = 0;
    for (let i = 0; i < mucusDays.length; i++) {
        const v = mucusDays[i].mucusValue!;
        if (v > best) best = v;
        if (best < 3) continue;            // only watery/eggwhite count as a peak
        if (v !== best) continue;
        const following = mucusDays.slice(i + 1, i + 4);
        if (following.length < 3) continue;
        if (following.some((d) => (d.mucusValue ?? 0) >= best)) continue;
        return { detected: true, anchorDay: mucusDays[i].cycleDay, evalCompleteDay: following[2].cycleDay };
    }
    return { detected: false };
}

function detectLhSurge(days: EngineDay[]): { anchorDay: number | null; multiSurge: boolean } {
    const positives = days.filter((d) => d.isLhPositive);
    if (positives.length === 0) return { anchorDay: null, multiSurge: false };
    const last = positives[positives.length - 1];
    const multiSurge = positives.length > 2 && last.cycleDay - positives[0].cycleDay > 5;
    return { anchorDay: last.cycleDay + 1, multiSurge }; // ovulation ~24-36h after surge
}

// =============================================================================
// Module 4 — Tier B prediction + irregular handling (engine-v6 §6.2, §6.8)
// =============================================================================

interface IrregularInfo { isIrregular: boolean; spread: number; reason: string | null }

function completedLengths(cycles: Cycle[]): number[] {
    return cycles
        .filter((c) => c.end_date && c.length && c.length >= CONFIG.cycle.MIN_CYCLE && c.length <= CONFIG.cycle.MAX_CYCLE)
        .map((c) => c.length!);
}

function recentLengths(cycles: Cycle[]): number[] {
    const all = completedLengths(cycles);
    return all.slice(Math.max(0, all.length - CONFIG.cycle.RECENT_WINDOW));
}

function predictedCycleLength(cycles: Cycle[], meta: EngineMeta): number {
    const recent = recentLengths(cycles);
    if (recent.length > 0) return median(recent);
    if (meta.avg_cycle_length > 0) return Math.round(meta.avg_cycle_length);
    return CONFIG.cycle.DEFAULT_LENGTH;
}

function detectIrregular(cycles: Cycle[], meta: EngineMeta): IrregularInfo {
    const recent = recentLengths(cycles);
    if (recent.length >= 2) {
        const spread = Math.max(...recent) - Math.min(...recent);
        if (spread > CONFIG.irregular.SPREAD_DAYS) return { isIrregular: true, spread, reason: 'spread' };
    }
    if (meta.cycle_regularity === 'irregular' || meta.cycle_regularity === 'unsure') {
        return { isIrregular: true, spread: 0, reason: 'setting' };
    }
    return { isIrregular: false, spread: recent.length >= 2 ? Math.max(...recent) - Math.min(...recent) : 0, reason: null };
}

/** Resolve luteal phase to the physiological band. */
export function resolveLuteal(value: number): number {
    if (value <= 0) return CONFIG.luteal.DEFAULT;
    return clamp(value, CONFIG.luteal.MIN, CONFIG.luteal.MAX);
}

/**
 * Ovulation cycle-day (1-based) by counting back from the next period. Returns 0
 * when the cycle is too short to place ovulation. (Luteal back-count from the
 * next expected period.)
 */
export function calcOvulationDay(cycleLength: number, luteal: number): { day: number; exact: boolean } {
    if (cycleLength < CONFIG.luteal.MIN + CONFIG.ovulation.MIN_DAY) return { day: 0, exact: false };
    let resolved = resolveLuteal(luteal);
    const maxSupported = cycleLength - CONFIG.ovulation.MIN_DAY;
    if (maxSupported < CONFIG.luteal.MIN) return { day: 0, exact: false };
    let exact = true;
    if (resolved > maxSupported) { resolved = maxSupported; exact = false; }
    const day = cycleLength - resolved;
    if (day < CONFIG.ovulation.MIN_DAY) return { day: 0, exact: false };
    return { day, exact };
}

/**
 * Personalized luteal phase from past cycles' confirmed ovulation (BBT shift),
 * averaged, clamped to [10,20], needs ≥2 samples. Falls back to default. (§6.3)
 */
export function inferLutealPhase(cycles: Cycle[], logMap: Map<string, Log>): number {
    const finished = cycles.filter((c) => c.end_date && c.length);
    const lengths: number[] = [];
    for (const c of finished) {
        const days = normalizeCycleData(c, logMap, c.end_date!);
        const shift = detectBBTShift(days);
        if (!shift.detected || !shift.anchorDay) continue;
        const luteal = (c.length || 0) - shift.anchorDay;
        if (luteal >= CONFIG.luteal.MIN && luteal <= CONFIG.luteal.MAX) lengths.push(luteal);
    }
    if (lengths.length < 2) return CONFIG.luteal.DEFAULT;
    return clamp(Math.round(lengths.reduce((a, b) => a + b, 0) / lengths.length), CONFIG.luteal.MIN, CONFIG.luteal.MAX);
}

// =============================================================================
// Module 5 — Fusion (engine-v6 §6.5)
// =============================================================================
function fuse(
    days: EngineDay[],
    ctx: { predictedLength: number; luteal: number; irregular: IrregularInfo; cycleStats: CycleStats },
): EngineResult {
    const signals: Signal[] = [];
    const anomalies: string[] = [];

    // --- Tier A bio-signals ---
    const bbt = detectBBTShift(days);
    if (bbt.detected && bbt.anchorDay) {
        signals.push({ source: 'BBT', anchorDay: bbt.anchorDay, confidence: CONFIG.conf.BBT, explanation: `Temp shift; ovulation CD ${bbt.anchorDay}` });
    }

    const lh = detectLhSurge(days);
    if (lh.anchorDay !== null) {
        signals.push({ source: 'LH', anchorDay: lh.anchorDay, confidence: CONFIG.conf.LH, explanation: `LH surge → ovulation CD ${lh.anchorDay}` });
        if (lh.multiSurge) anomalies.push('Multiple LH Surges (PCOS Risk)');
    }

    const mucus = detectMucusShift(days);
    if (mucus.detected && mucus.anchorDay) {
        signals.push({ source: 'MUCUS', anchorDay: mucus.anchorDay, confidence: CONFIG.conf.MUCUS, explanation: `Peak mucus CD ${mucus.anchorDay}` });
    }

    // --- Tier B calendar (always available as the floor) ---
    const calc = calcOvulationDay(ctx.predictedLength, ctx.luteal);
    const calendarDay = calc.day > 0 ? calc.day : Math.max(CONFIG.ovulation.MIN_DAY, Math.round(ctx.predictedLength - CONFIG.luteal.DEFAULT));
    signals.push({
        source: 'CALENDAR',
        anchorDay: calendarDay,
        confidence: ctx.irregular.isIrregular ? CONFIG.conf.CALENDAR_IRREGULAR : CONFIG.conf.CALENDAR_REGULAR,
        explanation: `History predicts ovulation CD ${calendarDay}`,
    });

    // --- Anchor by hierarchy: BBT > LH > MUCUS > CALENDAR ---
    const bioSignals = signals.filter((s) => s.source !== 'CALENDAR');
    const tier: EngineResult['tier'] = bioSignals.length > 0 ? 'confirmation' : 'prediction';
    const anchorSignal =
        signals.find((s) => s.source === 'BBT') ??
        signals.find((s) => s.source === 'LH') ??
        signals.find((s) => s.source === 'MUCUS') ??
        signals.find((s) => s.source === 'CALENDAR')!;

    let ovulationDay = anchorSignal.anchorDay;
    let confidence = anchorSignal.confidence;

    // Agreement / conflict adjustment (documented model, not magic numbers).
    let conflicts = 0;
    for (const s of bioSignals) {
        if (s === anchorSignal) continue;
        const diff = Math.abs(s.anchorDay - ovulationDay);
        if (diff <= CONFIG.corroboration.DAYS) confidence += CONFIG.conf.ALIGN_BONUS;
        else if (diff > CONFIG.corroboration.DAYS + 1) { conflicts++; confidence -= CONFIG.conf.CONFLICT_PENALTY; }
    }
    confidence = Math.min(confidence, anchorSignal.confidence + CONFIG.conf.ALIGN_MAX);
    if (conflicts > 0) anomalies.push('Conflicting Bio-signals');

    // --- Double-confirmation (P2): BBT + corroboration from mucus dry-up or LH. ---
    let isConfirmed = false;
    if (bbt.detected && bbt.anchorDay) {
        const corroborated =
            (mucus.detected && mucus.anchorDay !== undefined && Math.abs(mucus.anchorDay - bbt.anchorDay) <= CONFIG.corroboration.DAYS) ||
            (lh.anchorDay !== null && Math.abs(lh.anchorDay - bbt.anchorDay) <= CONFIG.corroboration.DAYS);
        isConfirmed = corroborated;
    }

    confidence = clamp(confidence, CONFIG.conf.MIN, CONFIG.conf.MAX);

    // Fertile window around the anchor.
    let winStart = Math.max(1, ovulationDay - CONFIG.window.PRE);
    let winEnd = ovulationDay + CONFIG.window.POST;
    // Irregular + prediction-only: widen toward fertile (P1) — never narrower.
    if (tier === 'prediction' && ctx.irregular.isIrregular) {
        const span = clamp(ctx.irregular.spread || CONFIG.irregular.RANGE_SPAN_MIN, CONFIG.irregular.RANGE_SPAN_MIN, CONFIG.irregular.RANGE_SPAN_MAX);
        winStart = Math.max(1, winStart - span);
        winEnd = winEnd + span;
    }

    // Output invariants (§9.2) — soft-asserted, never thrown in prod.
    softAssert(winStart >= 1 && winEnd >= winStart, `window geometry [${winStart},${winEnd}]`);
    softAssert(!isConfirmed || bbt.detected, 'confirmed without a BBT shift');

    return { ovulationDay, window: { start: winStart, end: winEnd }, confidence, signals: bioSignals.length ? bioSignals : signals, anomalies, isConfirmed, tier };
}

// =============================================================================
// Module 6 — Day classification (engine-v6 §6.7; P1/P2 safety semantics)
// =============================================================================
function classifyDay(args: {
    cycleDay: number;
    log: Log | undefined;
    cycleStartsWithBleed: boolean;
    periodLength: number;
    result: EngineResult;
    irregular: IrregularInfo;
    strongHistory: boolean;
    activeCycleLength: number;
    lostTrack: boolean;
}): { status: FertilityStatus; phase: Phase; unsureReason: UnsureReason | null } {
    const { cycleDay, log, cycleStartsWithBleed, periodLength, result, strongHistory, activeCycleLength, lostTrack } = args;

    // When the day comes out `unsure`, prefer the more specific "signals disagree"
    // explanation over the generic phase-based one. Conflicting signals are the
    // most actionable thing to tell the user. (Reason only — never alters status.)
    const conflicting = result.anomalies.includes('Conflicting Bio-signals');

    // Period override: actual bleeding ≥light, or within the period span of a
    // bleeding-started cycle (uses real period_length, not a hardcoded 5).
    const bleedingNow = log && (BLEED_RANK[log.bleeding || 'none'] ?? 0) >= BLEED_RANK.light;
    if (bleedingNow || (cycleStartsWithBleed && cycleDay <= periodLength)) {
        return { status: 'period', phase: 'Period', unsureReason: null };
    }

    // Predict next cycle's period if we are past this cycle's predicted length
    if (cycleDay > activeCycleLength) {
        if (lostTrack) {
            return { status: 'unsure', phase: 'Luteal', unsureReason: 'lost_track' };
        }
        const projectedDay = ((cycleDay - 1) % activeCycleLength) + 1;
        if (projectedDay <= periodLength) {
            return { status: 'period', phase: 'Period', unsureReason: null };
        }
    }

    const { start, end } = result.window;
    if (cycleDay >= start && cycleDay <= end) {
        return { status: 'fertile', phase: 'Ovulatory', unsureReason: null };
    }

    if (cycleDay < start) {
        // Pre-ovulation. P1: unclear ⇒ unsure unless we have a strong, regular
        // history to justify a (low-confidence) infertile call (O2).
        if (strongHistory) {
            return { status: 'not_fertile', phase: 'Follicular', unsureReason: null };
        }
        return {
            status: 'unsure',
            phase: 'Follicular',
            unsureReason: conflicting ? 'conflicting_signals' : 'awaiting_ovulation',
        };
    }

    // Post-window. P2: only confidently infertile when ovulation is confirmed.
    if (result.isConfirmed) {
        return { status: 'not_fertile', phase: 'Luteal', unsureReason: null };
    }
    return {
        status: 'unsure',
        phase: 'Luteal',
        unsureReason: conflicting ? 'conflicting_signals' : 'awaiting_confirmation',
    };
}

// =============================================================================
// Cycle stats + day metadata (insights_payload — keep fields buildInsightCards reads)
// =============================================================================
interface CycleStats {
    avgCycleLength: number;
    medianCycleLength: number;
    minCycleLength: number;
    maxCycleLength: number;
    variation: number;
    avgPeriodLength: number | null;
    completedCount: number;
}

function computeCycleStats(cycles: Cycle[]): CycleStats {
    const lengths = completedLengths(cycles);
    const completed = cycles.filter((c) => c.end_date);
    const avgCycleLength = lengths.length ? Math.round(lengths.reduce((a, c) => a + c, 0) / lengths.length) : CONFIG.cycle.DEFAULT_LENGTH;

    let variation = 0;
    if (lengths.length > 1) {
        const variance = lengths.reduce((a, c) => a + Math.pow(c - avgCycleLength, 2), 0) / lengths.length;
        variation = Math.round(Math.sqrt(variance));
    }

    const withPeriod = completed.filter((c) => c.period_length);
    const avgPeriodLength = withPeriod.length
        ? Math.round(withPeriod.reduce((a, c) => a + (c.period_length || 0), 0) / withPeriod.length)
        : null;

    return {
        avgCycleLength,
        medianCycleLength: lengths.length ? median(lengths) : CONFIG.cycle.DEFAULT_LENGTH,
        minCycleLength: lengths.length ? Math.min(...lengths) : 0,
        maxCycleLength: lengths.length ? Math.max(...lengths) : 0,
        variation,
        avgPeriodLength,
        completedCount: lengths.length,
    };
}

function buildDayMeta(
    result: EngineResult,
    stats: CycleStats,
    cycleDays: EngineDay[],
    today: string,
    date: string,
    day: EngineDay | undefined,
    irregular: IrregularInfo,
    lostTrack?: boolean,
    activeCycleLength?: number,
    unsureReason?: UnsureReason | null,
) {
    const primarySignal: SignalSource = result.signals.length > 0 ? result.signals[0].source : 'CALENDAR';
    const daysToOvulation = day ? result.ovulationDay - day.cycleDay : null;

    return {
        cycleDay: day?.cycleDay ?? null,
        confidenceScore: result.confidence,
        primarySignal,
        isConfirmed: result.isConfirmed,
        daysToOvulation,
        anomalies: result.anomalies,
        // Why this day is `unsure` (null otherwise) — drives the Today screen's
        // plain-language explanation of the uncertainty. See buildInsightCards.
        unsureReason: unsureReason ?? null,
        tempReliability: day?.reliability.temp ?? null,
        hasTemp: !!day?.tempValue,
        hasLh: !!day?.log?.lh_test,
        hasMucus: !!day?.log?.mucus,
        lostTrack,
        // The engine's predicted length for THIS cycle (ovulationDay + luteal, or
        // the calendar fallback). The single source for "days to next period":
        // next period date = cycle start + activeCycleLength. Both the calendar
        // route and the Today cycle line read this so they can never disagree.
        activeCycleLength: activeCycleLength ?? null,
        stats: {
            avgCycleLength: stats.avgCycleLength,
            medianCycleLength: stats.medianCycleLength,
            completedCycles: stats.completedCount,
        },
    };
}

function isCycleStartBleeding(cycle: Cycle, logMap: Map<string, Log>): boolean {
    const startLog = logMap.get(cycle.start_date);
    return isMensesBleed(startLog) || (!!startLog?.cycle_start && !startLog?.is_uncertain);
}

function getLastLogDateForCycle(cycle: Cycle, logs: Log[]): string | null {
    let lastDate: string | null = null;
    for (const log of logs) {
        if (log.date < cycle.start_date) continue;
        if (cycle.end_date && log.date > cycle.end_date) break;
        lastDate = log.date;
    }
    return lastDate;
}

function calculatePeriodLength(startDate: string, logMap: Map<string, Log>): number | null {
    let count = 0;
    let cursor = startDate;
    // Tolerate the same ≤1-day break inside the menses that segmentation allows.
    let breakRun = 0;
    while (true) {
        const log = logMap.get(cursor);
        const bleeds = !!log && !!log.bleeding && log.bleeding !== 'none';
        if (bleeds) { count += 1; breakRun = 0; }
        else {
            breakRun += 1;
            if (count === 0 || breakRun > CONFIG.cycle.MAX_BLEED_BREAK) break;
        }
        cursor = addDays(cursor, 1);
        if (daysBetween(startDate, cursor) > 15) break; // safety cap
    }
    return count > 0 ? count : null;
}
