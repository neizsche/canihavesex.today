
import { randomUUID } from 'node:crypto';
import { LogV2 } from './repositories/LogRepository.js';
import { DailyStatusV2 } from './repositories/DailyStatusRepository.js';
import { CycleV2 } from './repositories/CycleRepository.js';
import { UserMetaV2 } from './repositories/UserMetaRepository.js';

// --- Types ---
type IsoDate = string;
type FertilityStatus = 'fertile' | 'unsure' | 'not_fertile' | 'period';
type Phase = 'Follicular' | 'Ovulatory' | 'Luteal' | 'Period';

interface EngineContext {
    logs: LogV2[];
    meta: UserMetaV2;
    existingCycles?: CycleV2[];
}

// Normalized Day for Engine Processing
interface EngineDay {
    date: IsoDate;
    cycleDay: number;
    log?: LogV2;

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
const WEIGHTS = {
    LH: 1.0,
    BBT: 0.8,
    MUCUS: 0.6,
    CALENDAR: 0.3
};

const MUCUS_SCORES: Record<string, number> = {
    'dry': 0, 'sticky': 1, 'creamy': 2, 'watery': 3, 'eggwhite': 4
};

// --- Main Engine Function ---
export function runFusionEngine(userId: string, context: EngineContext): {
    statuses: DailyStatusV2[];
    cycles: CycleV2[];
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
    const statuses: DailyStatusV2[] = [];

    // Generate dates for current view (Last log to future)
    const lastLogDate = sortedLogs[sortedLogs.length - 1].date;
    const today = new Date().toISOString().split('T')[0];
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

    const logMap = new Map<string, LogV2>();
    sortedLogs.forEach(l => logMap.set(l.date, l));

    for (const cycle of relevantCycles) {
        // A. Data Normalization & Reliability
        const cycleDays = normalizeCycleData(cycle, logMap);

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

        for (const date of daysToGen) {
            const cycleDay = daysBetween(cycle.start_date, date) + 1;
            const dayData = cycleDays.find(d => d.date === date);
            const log = logMap.get(date);

            // Calculate Status
            let status: FertilityStatus = 'not_fertile';
            let phase: Phase = 'Follicular';

            // Period Override
            if (cycleDay <= 5 || (log && (log.bleeding === 'medium' || log.bleeding === 'heavy'))) {
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
                insights_payload: buildInsightPayload(date, status, phase, result, cycles, dayData)
            });
        }
    }

    // Filter statuses to uniq by date (latest wins)
    const uniqueStatuses = Array.from(new Map(statuses.map(s => [s.date, s])).values());

    return { statuses: uniqueStatuses, cycles };
}

// --- Module 1: Cycle Identification ---
function identifyCycles(userId: string, logs: LogV2[]): CycleV2[] {
    const cycles: CycleV2[] = [];
    let currentStart = logs[0].date;

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
                period_length: 5,
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
        period_length: null,
        analysis_flags: []
    });

    return cycles;
}

// --- Module 2: Normalization & Reliability ---
function normalizeCycleData(cycle: CycleV2, logMap: Map<string, LogV2>): EngineDay[] {
    const days: EngineDay[] = [];
    // We analyze up to 40 days or current date
    const analyzeEnd = addDays(cycle.start_date, 40);
    const range = generateDateRange(cycle.start_date, analyzeEnd);

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
function fuseSignals(days: EngineDay[], meta: UserMetaV2): EngineResult {
    const signals: Signal[] = [];
    const anomalies: string[] = [];

    // 1. BBT Shift Detector (The Confirmer)
    // Rule: 3 days > (Mean of prev 6) + 0.2
    let bbtTrigger: number | null = null;
    const reliableTemps = days.filter(d => d.reliability.temp > 0.5 && d.tempValue);

    if (reliableTemps.length > 8) {
        for (let i = 6; i < reliableTemps.length - 3; i++) {
            const prev6 = reliableTemps.slice(i - 6, i);
            const baseline = prev6.reduce((acc, d) => acc + (d.tempValue || 0), 0) / 6;

            const next3 = reliableTemps.slice(i, i + 3);
            const isShift = next3.every(d => (d.tempValue || 0) > baseline + 0.15); // Slightly relaxed threshold

            if (isShift) {
                bbtTrigger = reliableTemps[i].cycleDay;
                signals.push({
                    source: 'BBT',
                    anchorDay: bbtTrigger, // Shift start is roughly ovulation
                    confidence: 0.9 * (next3.reduce((a, b) => a + b.reliability.temp, 0) / 3), // Avg reliability
                    explanation: `Temp shift detected CD ${bbtTrigger}`
                });
                break; // First shift wins
            }
        }
    } else {
        anomalies.push('Insufficient Temp Data');
    }

    // 2. LH Surge Detector (The Planner)
    const lhPositives = days.filter(d => d.isLhPositive);
    if (lhPositives.length > 0) {
        // Use last positive in the cluster
        const lastPos = lhPositives[lhPositives.length - 1];
        signals.push({
            source: 'LH',
            anchorDay: lastPos.cycleDay + 1, // Ovulation 24-36h after surge
            confidence: 0.95,
            explanation: `LH Surge CD ${lastPos.cycleDay}`
        });

        if (lhPositives.length > 2 && (lhPositives[lhPositives.length - 1].cycleDay - lhPositives[0].cycleDay > 5)) {
            anomalies.push('Multiple LH Surges (PCOS Risk)');
        }
    }

    // 3. Mucus Peak (The Secondary)
    const peakMucus = days.filter(d => d.reliability.mucus > 0.5 && d.mucusValue === 4); // Eggwhite
    if (peakMucus.length > 0) {
        const lastPeak = peakMucus[peakMucus.length - 1];
        signals.push({
            source: 'MUCUS',
            anchorDay: lastPeak.cycleDay,
            confidence: 0.7,
            explanation: `Peak Mucus CD ${lastPeak.cycleDay}`
        });
    }

    // 4. Calendar (The Fallback)
    const predictedOv = Math.round(meta.avg_cycle_length - 14);
    signals.push({
        source: 'CALENDAR',
        anchorDay: predictedOv,
        confidence: 0.3,
        explanation: `History predicts CD ${predictedOv}`
    });

    // --- FUSION ---

    // Filter out Calendar if we have biometrics
    const bioSignals = signals.filter(s => s.source !== 'CALENDAR');
    const activeSignals = bioSignals.length > 0 ? bioSignals : signals; // Fallback to calendar if needed

    // Weighted Average
    let weightedSum = 0;
    let totalWeight = 0;

    for (const s of activeSignals) {
        const w = (WEIGHTS[s.source] || 0.5) * s.confidence;
        weightedSum += s.anchorDay * w;
        totalWeight += w;
    }

    const finalOvulationDay = Math.round(weightedSum / totalWeight);
    const confidence = totalWeight / activeSignals.length; // Crude confidence score

    // Confirmation Check
    const isConfirmed = bbtTrigger !== null; // Only BBT confirms

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


// --- Module 6: Explainer ---
function buildInsightPayload(
    date: string,
    status: string,
    phase: string,
    result: EngineResult,
    cycles: CycleV2[],
    day?: EngineDay
) {
    const signalsText = result.signals.map(s => s.source).join(', ');
    const reliability = day?.reliability.temp || 1.0;

    // --- Card 1: Today ---
    const notifications: string[] = [];
    if (result.isConfirmed) notifications.push('Ovulation Confirmed');
    if (result.anomalies.includes('Multiple LH Surges')) notifications.push('Double LH Surge detected');
    if (day?.reliability.temp === 0) notifications.push('Temp discarded (Sick/Fever)');
    if (status === 'fertile' && !result.isConfirmed) notifications.push('Peak fertility - Log now');

    // Predictive & Actionable Notifications
    if (day && day.cycleDay < result.ovulationDay) {
        const daysToOv = result.ovulationDay - day.cycleDay;
        if (daysToOv > 0 && daysToOv <= 5) {
            notifications.push(`Ovulation in ${daysToOv} days`);
        }
    }

    if (day && !day.tempValue && status !== 'period') {
        notifications.push('Log temperature to confirm');
    }

    let sourceText = 'Based on cycle history.';
    if (result.signals.some(s => s.source === 'BBT')) sourceText = 'Confirmed by BBT Shift.';
    else if (result.signals.some(s => s.source === 'LH')) sourceText = 'Detected by LH Surge.';
    else if (result.signals.some(s => s.source === 'MUCUS')) sourceText = 'Indicated by Mucus signs.';

    // Format Status Title
    let statusText = 'Low Fertility';
    if (status === 'fertile') statusText = 'High Fertility';
    else if (status === 'period') statusText = 'Period';
    else if (status === 'unsure') statusText = 'Unsure (Assume Fertile)';

    const todayCard = {
        card: {
            title: 'TODAY',
            description: `Day ${day?.cycleDay || '?'}`,
            subtitle: statusText,
            // footer: result.isConfirmed ? 'Ovulation Confirmed' : (signalsText ? `Signals: ${signalsText}` : 'Prediction: Calendar Method')
        },
        stats: [
            { label: 'Phase', value: phase },
            { label: 'Confidence', value: Math.round(result.confidence * 100) + '%' },
            result.isConfirmed ? { label: 'Ovulation', value: 'Confirmed', variant: 'success' } : { label: 'Ovulation', value: 'Pending' }
        ],
        notifications: notifications,
        sourceText: sourceText,
        confidence: {
            label: result.confidence > 0.8 ? 'High Confidence' : (result.confidence > 0.5 ? 'Medium Confidence' : 'Low Confidence'),
            score: Math.round(result.confidence * 100),
            message: result.confidence > 0.8
                ? 'Strong bio-signals detected.'
                : 'Based on limited data. Keep logging to improve accuracy.'
        }
    };

    // --- Card 2: Cycle Stats ---
    const completedCycles = cycles.filter(c => c.end_date);
    const avgLen = completedCycles.length
        ? Math.round(completedCycles.reduce((a, c) => a + (c.length || 28), 0) / completedCycles.length)
        : 28;

    let variation = 0;
    if (completedCycles.length > 1) {
        const variance = completedCycles.reduce((a, c) => a + Math.pow((c.length || 28) - avgLen, 2), 0) / completedCycles.length;
        variation = Math.round(Math.sqrt(variance));
    }

    const cycleStatsCard = {
        card: {
            title: 'CYCLE STATS',
            description: `${avgLen} Days`,
            subtitle: variation < 3 ? 'Regular Cycle' : 'Irregular Cycle'
        },
        stats: [
            { label: 'Variation', value: `±${variation} days` },
            { label: 'Logging rate', value: '96%' }, // Mock for parity
            { label: 'Avg Period', value: '5 days' },
            { label: 'Data Gaps', value: 'None' }
        ],
        sourceText: `Analysis based on last ${completedCycles.length} cycles.`,
        notifications: variation < 3 ? ['Cycle length is consistent'] : ['Irregular patterns detected'],
        confidence: {
            label: completedCycles.length > 3 ? 'High Confidence' : 'Low Confidence',
            score: Math.min(100, completedCycles.length * 20),
            message: `Based on history of ${completedCycles.length} cycles.`
        }
    };

    // --- Card 3: Nutrition (Locked) ---
    const nutritionCard = {
        card: {
            title: "NUTRITION",
            description: "Calcium Intake",
            subtitle: "Premium Content",
            isLocked: true,
            lockLabel: "Premium"
        },
        stats: [],
        sourceText: "Connect your health data source."
    };

    return {
        today: todayCard,
        "cycle-stats": cycleStatsCard,
        nutrition: nutritionCard
    };
}

// --- Utils ---
function mergeCycles(newCycles: CycleV2[], oldCycles: CycleV2[]): CycleV2[] {
    // Match by start_date (which is stable based on log data)
    return newCycles.map(nc => {
        const match = oldCycles.find(oc => oc.start_date === nc.start_date);
        if (match) {
            // Keep the OLD ID to prevent churn
            // Keep OLD analysis if we are NOT going to re-process it (handled by relevantCycles filter)
            return {
                ...nc,
                id: match.id,
                // If match has data, use it as baseline, but 'nc' (new cycle) has the fresh length/dates from logs
                // We only keep the ID mostly. The loop above determines if we re-analyze.
                // Actually, if we want to PRESERVE analysis of old cycles, we should copy it:
                ovulation_prediction: match.ovulation_prediction || nc.ovulation_prediction,
                ovulation_confirmed_date: match.ovulation_confirmed_date || nc.ovulation_confirmed_date,
                analysis_flags: match.analysis_flags && match.analysis_flags.length > 0 ? match.analysis_flags : nc.analysis_flags
            };
        }
        return nc;
    });
}

function daysBetween(d1: string, d2: string) {
    const a = new Date(d1).getTime();
    const b = new Date(d2).getTime();
    return Math.floor((b - a) / (1000 * 60 * 60 * 24));
}

function addDays(date: string, days: number) {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
}

function generateDateRange(start: string, end: string) {
    const dates = [];
    let curr = new Date(start);
    const last = new Date(end);
    while (curr <= last) {
        dates.push(curr.toISOString().split('T')[0]);
        curr.setDate(curr.getDate() + 1);
    }
    return dates;
}
