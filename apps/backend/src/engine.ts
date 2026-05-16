import { randomUUID } from 'node:crypto';
import { Log } from './repositories/LogRepository.js';
import { DailyStatus } from './repositories/DailyStatusRepository.js';
import { Cycle } from './repositories/CycleRepository.js';
import { UserMeta } from './repositories/UserMetaRepository.js';
import { addDaysIso as addDays, daysBetweenIso as daysBetween, generateIsoDateRange as generateDateRange, isoToday } from './utils/dates.js';

// --- Types ---
type IsoDate = string;
type FertilityStatus = 'fertile' | 'unsure' | 'not_fertile' | 'period';
type Phase = 'Follicular' | 'Ovulatory' | 'Luteal' | 'Period';

interface EngineContext {
    logs: Log[];
    meta: UserMeta;
    existingCycles?: Cycle[];
    today?: IsoDate;
    timezoneOffsetMinutes?: number;
}

// Normalized Day for Engine Processing
interface EngineDay {
    date: IsoDate;
    cycleDay: number;
    log?: Log;

    // Reliability Scores (0.0 - 1.0)
    reliability: {
        temp: number;
        mucus: number;
        lh: number;
    };

    // Normalized Values
    tempValue?: number;
    mucusValue?: number; // 0=dry, 1=sticky, 2=creamy, 3=watery, 4=eggwhite
    isLhPositive?: boolean;
    isBleeding?: boolean;
}

interface Signal {
    source: 'BBT' | 'LH' | 'MUCUS' | 'CALENDAR';
    anchorDay: number; // Cycle Day
    confidence: number; // 0.0 - 1.0
    explanation: string;
}

interface EngineResult {
    ovulationDay: number; // Final estimated ovulation cycle day
    window: { start: number; end: number }; // Fertile Window (Cycle Days)
    confidence: number;
    signals: Signal[];
    anomalies: string[];
    isConfirmed: boolean;
}

// --- Constants ---
const MUCUS_SCORES: Record<string, number> = {
    'dry': 0, 'sticky': 1, 'creamy': 2, 'watery': 3, 'eggwhite': 4
};

// --- Main Engine Function ---
export function runFusionEngine(userId: string, context: EngineContext): {
    statuses: DailyStatus[];
    cycles: Cycle[];
} {
    // 1. Sort logs
    const sortedLogs = context.logs.sort((a, b) => a.date.localeCompare(b.date));
    if (sortedLogs.length === 0) return { statuses: [], cycles: [] };

    // 2. Identify Cycles (Start on 'medium' or 'heavy' bleeding)
    // To properly analyze history, we need to segment all logs into cycles first.
    const rawCycles = identifyCycles(userId, sortedLogs);

    // Merge with Existing Cycles (Preserve IDs and Analysis of finished cycles)
    const cycles = mergeCycles(rawCycles, context.existingCycles || []);

    // 3. Process Per Cycle (Fusion Logic)
    const statuses: DailyStatus[] = [];

    // Generate dates for current view (Last log to future)
    const lastLogDate = sortedLogs[sortedLogs.length - 1].date;
    const today = context.today ?? isoToday(context.timezoneOffsetMinutes);
    const viewEnd = addDays(today, 30); // Project 30 days ahead

    // OPTIMIZATION: Only re-process:
    // 1. The ACTIVE cycle (no end_date)
    // 2. The MOST RECENT finished cycle (just in case of edge edits)
    // 3. Any cycle that has NO analysis flags yet (newly imported/created)

    const relevantCycles = cycles.filter(c => {
        const isActive = !c.end_date;
        const isRecent = c.end_date && daysBetween(c.end_date, today) < 45; // Last ~1.5 months
        const isUnanalyzed = (c.analysis_flags || []).length === 0;
        return isActive || isRecent || isUnanalyzed;
    });

    const logMap = new Map<string, Log>();
    sortedLogs.forEach(l => logMap.set(l.date, l));

    for (const cycle of relevantCycles) {
        const lastCycleLogDate = getLastLogDateForCycle(cycle, sortedLogs);
        const analysisEnd = cycle.end_date || lastCycleLogDate || today;
        const cycleStartsWithBleed = isCycleStartBleeding(cycle, logMap);
        // A. Data Normalization & Reliability
        const cycleDays = normalizeCycleData(cycle, logMap, analysisEnd);

        // B. Signal Interpretation & Fusion
        const result = fuseSignals(cycleDays, context.meta);

        // C. Update Cycle Metadata
        cycle.ovulation_prediction = addDays(cycle.start_date, result.ovulationDay - 1);
        cycle.ovulation_confirmed_date = result.isConfirmed ? cycle.ovulation_prediction : null;
        cycle.analysis_flags = result.anomalies;

        // D. Generate Daily Statuses
        // We generate status for every day in the cycle (up to today/viewEnd)
        const cycleEnd = cycle.end_date || viewEnd;
        const daysToGen = generateDateRange(cycle.start_date, cycleEnd);
        
        // Pre-calculate stats that are the same for the whole cycle
        const cycleStats = computeCycleStats(cycles);

        for (const date of daysToGen) {
            const cycleDay = daysBetween(cycle.start_date, date) + 1;
            const dayData = cycleDays.find(d => d.date === date);
            const log = logMap.get(date);

            // Calculate Status
            let status: FertilityStatus = 'not_fertile';
            let phase: Phase = 'Follicular';

            // Period Override
            if ((cycleStartsWithBleed && cycleDay <= 5) || (log && (log.bleeding === 'medium' || log.bleeding === 'heavy'))) {
                status = 'period';
                phase = 'Period';
            } else {
                // Fertile Window Logic
                if (cycleDay >= result.window.start && cycleDay <= result.window.end) {
                    status = 'fertile';
                    phase = 'Ovulatory';
                } else if (cycleDay < result.window.start) {
                    status = 'not_fertile';
                    phase = 'Follicular';
                } else {
                    // Post-Ovulation
                    if (result.isConfirmed) {
                        status = 'not_fertile';
                        phase = 'Luteal';
                    } else {
                        // If we passed the window but NOT confirmed, we are "Unsure"
                        status = 'unsure';
                        phase = 'Luteal'; // Assume Luteal but warn
                    }
                }
            }

            // Append Status
            statuses.push({
                id: randomUUID(),
                user_id: userId,
                date: date,
                fertility_status: status,
                phase: phase,
                is_predicted: date > (lastLogDate || today),
                engine_version: 'v5.1.0-fusion',
                updated_at: new Date().toISOString(),
                insights_payload: buildDayMeta(result, cycleStats, cycleDays, today, date, dayData)
            });
        }
    }

    // Filter statuses to uniq by date (latest wins)
    const uniqueStatuses = Array.from(new Map(statuses.map(s => [s.date, s])).values());

    return { statuses: uniqueStatuses, cycles };
}

// --- Module 1: Cycle Identification ---
function identifyCycles(userId: string, logs: Log[]): Cycle[] {
    const cycles: Cycle[] = [];
    let currentStart = logs[0].date;
    const logMap = new Map<string, Log>();
    logs.forEach(log => logMap.set(log.date, log));

    for (let i = 0; i < logs.length; i++) {
        const log = logs[i];
        const isBleeding = log.bleeding === 'medium' || log.bleeding === 'heavy';
        const daysSince = daysBetween(currentStart, log.date);

        // Start new cycle if bleeding and gap > 18 days
        if (isBleeding && daysSince > 18) {
            cycles.push({
                id: randomUUID(),
                user_id: userId,
                start_date: currentStart,
                end_date: addDays(log.date, -1),
                ovulation_prediction: null,
                ovulation_confirmed_date: null,
                length: daysSince,
                period_length: calculatePeriodLength(currentStart, logMap),
                analysis_flags: []
            });
            currentStart = log.date;
        }
    }

    // Active cycle
    cycles.push({
        id: randomUUID(),
        user_id: userId,
        start_date: currentStart,
        end_date: null,
        ovulation_prediction: null,
        ovulation_confirmed_date: null,
        length: null,
        period_length: calculatePeriodLength(currentStart, logMap),
        analysis_flags: []
    });

    return cycles;
}

// --- Module 2: Normalization & Reliability ---
function normalizeCycleData(cycle: Cycle, logMap: Map<string, Log>, analysisEnd: string): EngineDay[] {
    const days: EngineDay[] = [];
    // Analyze through the latest log in this cycle (or cycle end if closed).
    const range = generateDateRange(cycle.start_date, analysisEnd);

    for (const date of range) {
        const log = logMap.get(date);
        const cycleDay = daysBetween(cycle.start_date, date) + 1;

        // Calculate Reliability
        const dist = log?.disturbances || [];

        let rTemp = 1.0;
        if (!log?.temperature) rTemp = 0.0;
        else if (dist.includes('sick') || dist.includes('fever')) rTemp = 0.0; // DISCARD
        else {
            if (dist.includes('alcohol')) rTemp *= 0.7;
            if (dist.includes('bad_sleep')) rTemp *= 0.4;
            if (dist.includes('late_measurement')) rTemp *= 0.8;
            if (dist.includes('stress')) rTemp *= 0.9;
        }

        let rMucus = 1.0;
        if (!log?.mucus) rMucus = 0.0;
        else {
            if (dist.includes('semen_exposure')) rMucus = 0.0; // DISCARD
            if (dist.includes('infection')) rMucus = 0.3;
        }

        let rLh = log?.lh_test ? 1.0 : 0.0;

        days.push({
            date,
            cycleDay,
            log,
            reliability: { temp: rTemp, mucus: rMucus, lh: rLh },
            tempValue: log?.temperature || undefined,
            mucusValue: log?.mucus ? MUCUS_SCORES[log.mucus] : 0,
            isLhPositive: log?.lh_test === 'positive',
            isBleeding: Boolean(log?.bleeding && log.bleeding !== 'none')
        });
    }
    return days;
}

// --- Module 3 & 4: Signal Interpretation & Fusion ---
function fuseSignals(days: EngineDay[], meta: UserMeta): EngineResult {
    const signals: Signal[] = [];
    const anomalies: string[] = [];

    // 1. BBT Shift Detector (The Confirmer)
    // Rule: 3 days > (Mean of prev 6) + 0.15
    let bbtAnchorDay: number | null = null;
    let bbtConfidence = 0;

    const reliableTemps = days.filter(d => d.reliability.temp > 0.5 && d.tempValue);

    if (reliableTemps.length > 8) {
        // Find the shift. Instead of assuming elements are consecutive, we need to check cycleDay gaps.
        for (let i = 6; i <= reliableTemps.length - 3; i++) {
            const prev6 = reliableTemps.slice(i - 6, i);
            const next3 = reliableTemps.slice(i, i + 3);

            // Check if there are too many gaps in this 9-day window.
            const daySpan = next3[2].cycleDay - prev6[0].cycleDay + 1;
            if (daySpan > 12) continue; // Too many gaps, skip this potential shift

            const baseline = prev6.reduce((acc, d) => acc + (d.tempValue || 0), 0) / 6;
            const isShift = next3.every(d => (d.tempValue || 0) > baseline + 0.15); // Slightly relaxed threshold

            if (isShift) {
                // Ovulation happens the day BEFORE the shift (last low temp).
                bbtAnchorDay = prev6[5].cycleDay;
                
                // Confidence drops if there are gaps (daySpan > 9)
                const gapPenalty = (daySpan - 9) * 0.1;
                const rawConfidence = 0.9 * (next3.reduce((a, b) => a + b.reliability.temp, 0) / 3);
                bbtConfidence = Math.max(0.3, rawConfidence - gapPenalty);

                signals.push({
                    source: 'BBT',
                    anchorDay: bbtAnchorDay, 
                    confidence: bbtConfidence, 
                    explanation: `Temp shift detected. Ovulation on CD ${bbtAnchorDay}`
                });
                break; // First valid shift wins
            }
        }
    } else {
        anomalies.push('Insufficient Temp Data');
    }

    // 2. LH Surge Detector (The Predictor)
    const lhPositives = days.filter(d => d.isLhPositive);
    let lhAnchorDay: number | null = null;
    let lhConfidence = 0;

    if (lhPositives.length > 0) {
        // Use last positive in the cluster
        const lastPos = lhPositives[lhPositives.length - 1];
        lhAnchorDay = lastPos.cycleDay + 1; // Ovulation 24-36h after surge
        lhConfidence = 0.95;

        signals.push({
            source: 'LH',
            anchorDay: lhAnchorDay,
            confidence: lhConfidence,
            explanation: `LH Surge CD ${lastPos.cycleDay}`
        });

        if (lhPositives.length > 2 && (lhPositives[lhPositives.length - 1].cycleDay - lhPositives[0].cycleDay > 5)) {
            anomalies.push('Multiple LH Surges (PCOS Risk)');
        }
    }

    // 3. Mucus Peak (The Secondary)
    const peakMucus = days.filter(d => d.reliability.mucus > 0.5 && d.mucusValue === 4); // Eggwhite
    let mucusAnchorDay: number | null = null;
    let mucusConfidence = 0;

    if (peakMucus.length > 0) {
        const lastPeak = peakMucus[peakMucus.length - 1];
        mucusAnchorDay = lastPeak.cycleDay;
        mucusConfidence = 0.7;

        signals.push({
            source: 'MUCUS',
            anchorDay: mucusAnchorDay,
            confidence: mucusConfidence,
            explanation: `Peak Mucus CD ${lastPeak.cycleDay}`
        });
    }

    // 4. Calendar (The Fallback)
    const predictedOv = Math.max(1, Math.round(meta.avg_cycle_length - 14));
    signals.push({
        source: 'CALENDAR',
        anchorDay: predictedOv,
        confidence: 0.3,
        explanation: `History predicts CD ${predictedOv}`
    });

    // --- HIERARCHICAL FUSION ---

    let finalOvulationDay = predictedOv;
    let confidence = 0.3; // Default to calendar confidence
    
    // Select the primary anchor based on hierarchy: LH > BBT > MUCUS > CALENDAR
    if (lhAnchorDay !== null) {
        finalOvulationDay = lhAnchorDay;
        confidence = lhConfidence;
    } else if (bbtAnchorDay !== null) {
        finalOvulationDay = bbtAnchorDay;
        confidence = bbtConfidence;
    } else if (mucusAnchorDay !== null) {
        finalOvulationDay = mucusAnchorDay;
        confidence = mucusConfidence;
    }

    // Adjust confidence based on signal alignment
    const bioSignals = signals.filter(s => s.source !== 'CALENDAR');
    const activeSignals = bioSignals.length > 0 ? bioSignals : signals;

    if (bioSignals.length > 1) {
        // Check if other signals align within ±2 days of the final chosen day
        let aligningSignals = 0;
        let conflictingSignals = 0;

        for (const s of bioSignals) {
            if (s.anchorDay === finalOvulationDay) continue; // Skip the one we used (roughly)
            
            const diff = Math.abs(s.anchorDay - finalOvulationDay);
            if (diff <= 2) {
                aligningSignals++;
                confidence += 0.05; // Boost confidence for alignment
            } else if (diff > 3) {
                conflictingSignals++;
                confidence -= 0.1; // Penalty for strong conflict
            }
        }

        if (conflictingSignals > 0) {
            anomalies.push('Conflicting Bio-signals');
        }
    }
    
    // Clamp confidence between 0.1 and 0.99
    confidence = Math.max(0.1, Math.min(0.99, confidence));

    // Confirmation Check
    const isConfirmed = bbtAnchorDay !== null; // Only BBT confirms

    // Window Calculation (Standard -5 / +1 rule around anchor)
    const winStart = Math.max(1, finalOvulationDay - 5);
    const winEnd = finalOvulationDay + 1;

    return {
        ovulationDay: finalOvulationDay,
        window: { start: winStart, end: winEnd },
        confidence, // 0.0 - 1.0+
        signals: activeSignals,
        anomalies,
        isConfirmed
    };
}


// --- Module 6: Day Metadata (Lean — no UI text) ---
interface CycleStats {
    avgCycleLength: number;
    variation: number;
    avgPeriodLength: number | null;
    completedCount: number;
}

function computeCycleStats(cycles: Cycle[]): CycleStats {
    const completedCycles = cycles.filter(c => c.end_date);
    const avgCycleLength = completedCycles.length
        ? Math.round(completedCycles.reduce((a, c) => a + (c.length || 28), 0) / completedCycles.length)
        : 28;

    let variation = 0;
    if (completedCycles.length > 1) {
        const variance = completedCycles.reduce((a, c) => a + Math.pow((c.length || 28) - avgCycleLength, 2), 0) / completedCycles.length;
        variation = Math.round(Math.sqrt(variance));
    }

    const completedWithPeriod = completedCycles.filter(c => c.period_length);
    const avgPeriodLength = completedWithPeriod.length
        ? Math.round(completedWithPeriod.reduce((a, c) => a + (c.period_length || 0), 0) / completedWithPeriod.length)
        : null;

    return {
        avgCycleLength,
        variation,
        avgPeriodLength,
        completedCount: completedCycles.length
    };
}

function buildDayMeta(
    result: EngineResult,
    stats: CycleStats,
    cycleDays: EngineDay[],
    today: string,
    date: string,
    day?: EngineDay
) {
    // Primary signal that anchored ovulation
    const primarySignal: string = result.signals.length > 0 ? result.signals[0].source : 'CALENDAR';

    // Days to ovulation (negative = past)
    const daysToOvulation = day ? result.ovulationDay - day.cycleDay : null;

    const statsCutoff = date > today ? today : date;
    const loggingStats = computeLoggingStats(cycleDays, statsCutoff);

    return {
        // Core per-day data
        cycleDay: day?.cycleDay ?? null,
        confidenceScore: result.confidence,
        primarySignal,
        isConfirmed: result.isConfirmed,
        daysToOvulation,
        anomalies: result.anomalies,
        tempReliability: day?.reliability.temp ?? null,
        hasTemp: !!day?.tempValue,

        // Aggregated cycle stats (pre-calculated)
        stats: {
            avgCycleLength: stats.avgCycleLength,
            variation: stats.variation,
            loggingRate: loggingStats.rate,
            maxGap: loggingStats.maxGap,
            avgPeriodLength: stats.avgPeriodLength,
            completedCycles: stats.completedCount,
        }
    };
}

function isCycleStartBleeding(cycle: Cycle, logMap: Map<string, Log>): boolean {
    const startLog = logMap.get(cycle.start_date);
    return startLog?.bleeding === 'medium' || startLog?.bleeding === 'heavy';
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
    while (true) {
        const log = logMap.get(cursor);
        if (!log || !log.bleeding || log.bleeding === 'none') break;
        count += 1;
        cursor = addDays(cursor, 1);
    }
    return count > 0 ? count : null;
}

function computeLoggingStats(cycleDays: EngineDay[], upToDate: string): { rate: number; maxGap: number } {
    const days = cycleDays.filter(d => d.date <= upToDate);
    if (!days.length) return { rate: 0, maxGap: 0 };

    let logged = 0;
    let gap = 0;
    let maxGap = 0;

    for (const day of days) {
        if (day.log) {
            logged += 1;
            gap = 0;
        } else {
            gap += 1;
            if (gap > maxGap) maxGap = gap;
        }
    }

    const rate = Math.round((logged / days.length) * 100);
    return { rate, maxGap };
}

// --- Utils ---
function mergeCycles(newCycles: Cycle[], oldCycles: Cycle[]): Cycle[] {
    // Match by start_date (which is stable based on log data)
    return newCycles.map(nc => {
        const match = oldCycles.find(oc => oc.start_date === nc.start_date);
        if (match) {
            // Keep the OLD ID to prevent churn
            return {
                ...nc,
                id: match.id,
                ovulation_prediction: match.ovulation_prediction || nc.ovulation_prediction,
                ovulation_confirmed_date: match.ovulation_confirmed_date || nc.ovulation_confirmed_date,
                analysis_flags: match.analysis_flags && match.analysis_flags.length > 0 ? match.analysis_flags : nc.analysis_flags
            };
        }
        return nc;
    });
}
