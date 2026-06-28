import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
    runFusionEngine,
    detectCycleStarts,
    calcOvulationDay,
    resolveLuteal,
    detectBBTShift,
    detectMucusShift,
    inferLutealPhase,
    CONFIG,
    type EngineMeta,
} from '../src/engine.js';
import type { Log } from '../src/repositories/LogRepository.js';
import { addDaysIso, daysBetweenIso } from '../src/utils/dates.js';

// --- helpers ---------------------------------------------------------------
type LogSpec = Partial<Pick<Log, 'bleeding' | 'temperature' | 'mucus' | 'lh_test' | 'disturbances' | 'cycle_start' | 'is_uncertain'>>;

function log(date: string, spec: LogSpec = {}): Log {
    return {
        id: date, user_id: 'u', date,
        bleeding: spec.bleeding ?? null,
        temperature: spec.temperature ?? null,
        mucus: spec.mucus ?? null,
        lh_test: spec.lh_test ?? null,
        disturbances: spec.disturbances ?? [],
        symptoms: [], notes: null,
        cycle_start: spec.cycle_start, is_uncertain: spec.is_uncertain,
        created_at: date,
    };
}

const META: EngineMeta = { avg_cycle_length: 28 };

/** Build N back-to-back `cycleLen`-day cycles of period-only logs ending today. */
function calendarCycles(start: string, cycleLen: number, n: number): { logs: Log[]; today: string } {
    const logs: Log[] = [];
    let d = start;
    for (let c = 0; c < n; c++) {
        for (let p = 0; p < 4; p++) logs.push(log(addDaysIso(d, p), { bleeding: p === 0 ? 'heavy' : 'medium' }));
        d = addDaysIso(d, cycleLen);
    }
    return { logs, today: addDaysIso(start, cycleLen * (n - 1) + 6) };
}

/** Engine days for a single in-memory cycle (used to drive the detectors directly). */
function engineDaysFromLogs(logs: Log[]) {
    const start = logs[0].date;
    return logs.map((l) => ({
        date: l.date,
        cycleDay: daysBetweenIso(start, l.date) + 1,
        log: l,
        reliability: {
            temp: l.temperature != null && !(l.disturbances || []).includes('sick') ? 1 : 0,
            mucus: l.mucus ? 1 : 0,
            lh: l.lh_test ? 1 : 0,
        },
        tempValue: l.temperature ?? undefined,
        mucusValue: l.mucus ? ({ dry: 0, sticky: 1, creamy: 2, watery: 3, eggwhite: 4 } as Record<string, number>)[l.mucus] : 0,
        isLhPositive: l.lh_test === 'positive',
        isBleeding: !!l.bleeding && l.bleeding !== 'none',
    }));
}

// ===========================================================================
// 1. Reference vectors — mirror docs/design/fertility-engine-v6.md
// ===========================================================================
describe('reference vectors — resolveLuteal', () => {
    const cases: Array<[number, number]> = [
        [0, 14], [-5, 14], [5, 10], [9, 10], [10, 10], [14, 14], [20, 20], [25, 20],
    ];
    for (const [input, want] of cases) {
        test(`resolveLuteal(${input}) = ${want}`, () => assert.equal(resolveLuteal(input), want));
    }
});

// ===========================================================================
// 2. Named golden fixtures (sympto style)
// ===========================================================================
describe('golden: clean symptothermal cycle → confirmed ovulation', () => {
    // Period CD1-4; low temps CD5-13 (~36.4); eggwhite peak CD12-13; LH+ CD13;
    // sustained temp rise CD15+ (~36.75) → BBT shift confirms ovulation.
    const start = '2026-01-01';
    const logs: Log[] = [];
    for (let p = 0; p < 4; p++) logs.push(log(addDaysIso(start, p), { bleeding: p === 0 ? 'heavy' : 'medium' }));
    for (let cd = 5; cd <= 13; cd++) logs.push(log(addDaysIso(start, cd - 1), { temperature: 36.4 }));
    logs.push(log(addDaysIso(start, 11), { temperature: 36.4, mucus: 'eggwhite' }));
    logs.push(log(addDaysIso(start, 12), { temperature: 36.4, mucus: 'eggwhite', lh_test: 'positive' }));
    logs.push(log(addDaysIso(start, 13), { temperature: 36.45, mucus: 'creamy' }));
    for (let cd = 15; cd <= 22; cd++) logs.push(log(addDaysIso(start, cd - 1), { temperature: 36.75, mucus: 'dry' }));

    const today = addDaysIso(start, 23);
    const { statuses, cycles } = runFusionEngine('u', { logs, meta: META, today });

    test('detects a single cycle starting on the period', () => {
        assert.equal(cycles[0].start_date, start);
    });
    test('ovulation is confirmed (BBT + corroboration)', () => {
        assert.ok(cycles[0].ovulation_confirmed_date, 'expected a confirmed ovulation date');
    });
    test('has fertile days and a post-ovulation infertile stretch', () => {
        const byDate = new Map(statuses.map((s) => [s.date, s]));
        assert.ok([...byDate.values()].some((s) => s.fertility_status === 'fertile'));
        // A late luteal day after confirmation must be not_fertile (P2 satisfied).
        const late = byDate.get(addDaysIso(start, 20));
        assert.equal(late?.fertility_status, 'not_fertile');
    });
});

describe('golden: light-period segmentation (A1 regression)', () => {
    // Two cycles whose periods are only ever logged as `light`.
    const logs = [
        log('2026-01-01', { bleeding: 'light' }),
        log('2026-01-02', { bleeding: 'light' }),
        log('2026-01-29', { bleeding: 'light' }),
        log('2026-01-30', { bleeding: 'light' }),
    ];
    test('a light period still starts a new cycle', () => {
        const starts = detectCycleStarts(logs);
        assert.deepEqual(starts, ['2026-01-01', '2026-01-29']);
    });
    test('spotting alone does NOT start a cycle', () => {
        const starts = detectCycleStarts([log('2026-01-01', { bleeding: 'spotting' })]);
        assert.equal(starts.length, 0);
    });
    test('explicit cycle_start marker is honored', () => {
        const starts = detectCycleStarts([log('2026-02-10', { cycle_start: true })]);
        assert.deepEqual(starts, ['2026-02-10']);
    });
    test('an uncertain explicit marker is ignored', () => {
        const starts = detectCycleStarts([log('2026-02-10', { cycle_start: true, is_uncertain: true })]);
        assert.equal(starts.length, 0);
    });
});

describe('golden: calendar-only single cycle → P1 (never confident infertile early)', () => {
    const logs = [
        log('2026-03-01', { bleeding: 'heavy' }),
        log('2026-03-02', { bleeding: 'medium' }),
        log('2026-03-03', { bleeding: 'light' }),
    ];
    const today = addDaysIso('2026-03-01', 8);
    const { statuses } = runFusionEngine('u', { logs, meta: META, today });

    test('no day is a confident not_fertile without history/signals', () => {
        const offenders = statuses.filter((s) => s.fertility_status === 'not_fertile');
        assert.equal(offenders.length, 0, 'P1 violated: confident infertile with no history');
    });
});

describe('golden: missed-log gap → median robust', () => {
    // 6 cycles of 28d but one middle period is unlogged, merging two cycles into
    // a ~56d outlier. With several clean cycles the median must shrug it off.
    const { logs, today } = calendarCycles('2026-01-01', 28, 6);
    const gapStart = addDaysIso('2026-01-01', 84); // drop the 4th cycle's period
    const filtered = logs.filter((l) => daysBetweenIso(gapStart, l.date) < 0 || daysBetweenIso(gapStart, l.date) > 4);
    const { cycles } = runFusionEngine('u', { logs: filtered, meta: META, today });
    test('a 56-day merged cycle does not poison the median length', () => {
        const lengths = cycles.filter((c) => c.length).map((c) => c.length!);
        assert.ok(lengths.some((l) => l >= 50), 'fixture should contain the merged outlier');
        const sorted = [...lengths].sort((a, b) => a - b);
        const med = sorted.length % 2 ? sorted[(sorted.length - 1) / 2] : (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2;
        assert.ok(med <= 30, `median length ${med} should be ~28, not dragged by the gap`);
    });
});

// ===========================================================================
// 3. Unit: detectors
// ===========================================================================
describe('detectors', () => {
    test('BBT shift: max(prev6)+0.2 over 3 days, ovulation = day before shift', () => {
        const start = '2026-01-01';
        const logs: Log[] = [];
        for (let cd = 1; cd <= 12; cd++) logs.push(log(addDaysIso(start, cd - 1), { temperature: 36.4 }));
        for (let cd = 13; cd <= 16; cd++) logs.push(log(addDaysIso(start, cd - 1), { temperature: 36.7 }));
        const shift = detectBBTShift(engineDaysFromLogs(logs));
        assert.equal(shift.detected, true);
        assert.equal(shift.anchorDay, 12); // last low temp before the rise
    });

    test('BBT shift: a single sick-day dip does not break detection', () => {
        const start = '2026-01-01';
        const logs: Log[] = [];
        for (let cd = 1; cd <= 12; cd++) logs.push(log(addDaysIso(start, cd - 1), { temperature: 36.4 }));
        logs.push(log(addDaysIso(start, 12), { temperature: 36.7 }));            // CD13 high
        logs.push(log(addDaysIso(start, 13), { temperature: 36.4 }));            // CD14 dip
        logs.push(log(addDaysIso(start, 14), { temperature: 36.72 }));           // CD15 high
        logs.push(log(addDaysIso(start, 15), { temperature: 36.75 }));           // CD16 high
        const shift = detectBBTShift(engineDaysFromLogs(logs));
        assert.equal(shift.detected, true);
    });

    test('mucus shift: watery counts and dry-up confirms', () => {
        const start = '2026-01-01';
        const logs = [
            log(addDaysIso(start, 9), { mucus: 'creamy' }),
            log(addDaysIso(start, 10), { mucus: 'watery' }),  // peak
            log(addDaysIso(start, 11), { mucus: 'dry' }),
            log(addDaysIso(start, 12), { mucus: 'dry' }),
            log(addDaysIso(start, 13), { mucus: 'dry' }),
        ];
        const shift = detectMucusShift(engineDaysFromLogs(logs));
        assert.equal(shift.detected, true);
        // engineDaysFromLogs numbers cycle-days from the first log, so the watery
        // peak (2nd entry) is cycle day 2.
        assert.equal(shift.anchorDay, 2);
    });

    test('inferLutealPhase falls back to default with no confirmed cycles', () => {
        assert.equal(inferLutealPhase([], new Map()), CONFIG.luteal.DEFAULT);
    });
});

// ===========================================================================
// 4. Property / fuzz — invariants over many generated inputs
// ===========================================================================
describe('property: calcOvulationDay invariants', () => {
    test('any calculable ovulation day is strictly inside the cycle and ≥ MIN_DAY', () => {
        for (let i = 0; i < 5000; i++) {
            const len = 1 + Math.floor(Math.random() * 120);
            const lut = -20 + Math.floor(Math.random() * 60);
            const { day } = calcOvulationDay(len, lut);
            if (day === 0) continue;
            assert.ok(day >= CONFIG.ovulation.MIN_DAY, `day ${day} < MIN for len ${len}`);
            assert.ok(day < len, `day ${day} not < len ${len}`);
        }
    });
});

describe('property: detectCycleStarts spacing', () => {
    test('consecutive detected starts are ≥ MIN_CYCLE apart', () => {
        for (let iter = 0; iter < 300; iter++) {
            const logs: Log[] = [];
            let d = '2026-01-01';
            const days = 5 + Math.floor(Math.random() * 200);
            for (let i = 0; i < days; i++) {
                if (Math.random() < 0.25) {
                    const opts: Array<Log['bleeding']> = ['spotting', 'light', 'medium', 'heavy'];
                    logs.push(log(d, { bleeding: opts[Math.floor(Math.random() * opts.length)] }));
                }
                d = addDaysIso(d, 1);
            }
            const starts = detectCycleStarts(logs);
            for (let i = 1; i < starts.length; i++) {
                assert.ok(daysBetweenIso(starts[i - 1], starts[i]) >= CONFIG.cycle.MIN_CYCLE);
            }
        }
    });
});

describe('property: engine output is always well-formed (fuzz)', () => {
    test('window geometry holds and status enum is valid for random logs', () => {
        const VALID = new Set(['fertile', 'unsure', 'not_fertile', 'period']);
        for (let iter = 0; iter < 200; iter++) {
            const logs: Log[] = [];
            let d = '2026-01-01';
            const days = 1 + Math.floor(Math.random() * 120);
            for (let i = 0; i < days; i++) {
                const spec: LogSpec = {};
                if (Math.random() < 0.3) spec.bleeding = (['none', 'spotting', 'light', 'medium', 'heavy'] as const)[Math.floor(Math.random() * 5)];
                if (Math.random() < 0.3) spec.temperature = 35 + Math.random() * 3;
                if (Math.random() < 0.2) spec.mucus = (['dry', 'sticky', 'creamy', 'watery', 'eggwhite'] as const)[Math.floor(Math.random() * 5)];
                if (Math.random() < 0.1) spec.lh_test = Math.random() < 0.5 ? 'positive' : 'negative';
                if (Object.keys(spec).length) logs.push(log(d, spec));
                d = addDaysIso(d, 1);
            }
            if (!logs.length) continue;
            const today = addDaysIso(logs[logs.length - 1].date, 5);
            const { statuses } = runFusionEngine('u', { logs, meta: META, today });
            for (const s of statuses) {
                assert.ok(VALID.has(s.fertility_status), `bad status ${s.fertility_status}`);
                assert.ok(['Follicular', 'Ovulatory', 'Luteal', 'Period'].includes(s.phase));
            }
        }
    });
});

describe('lostTrack - overdue cycle handling', () => {
    test('computes lostTrack correctly and drops projected days to unsure/Luteal status', () => {
        const start = '2026-03-01';
        const logs = [
            log(start, { bleeding: 'heavy' }),
            log(addDaysIso(start, 1), { bleeding: 'medium' }),
        ];
        const today = addDaysIso(start, 34); // CD 35
        const { statuses } = runFusionEngine('u', { logs, meta: META, today });
        const byDate = new Map(statuses.map((s) => [s.date, s]));
        
        const cd28Status = byDate.get(addDaysIso(start, 27)); // CD 28
        assert.ok(cd28Status);
        
        const cd29Status = byDate.get(addDaysIso(start, 28)); // CD 29
        assert.ok(cd29Status);
        assert.equal(cd29Status.fertility_status, 'unsure');
        assert.equal(cd29Status.phase, 'Luteal');
        assert.equal(cd29Status.insights_payload.lostTrack, true);
        
        const todayEarly = addDaysIso(start, 19); // CD 20
        const { statuses: statusesEarly } = runFusionEngine('u', { logs, meta: META, today: todayEarly });
        const byDateEarly = new Map(statusesEarly.map((s) => [s.date, s]));
        const cd29StatusEarly = byDateEarly.get(addDaysIso(start, 28)); // CD 29
        assert.ok(cd29StatusEarly);
        assert.equal(cd29StatusEarly.fertility_status, 'period');
        assert.equal(cd29StatusEarly.phase, 'Period');
        assert.equal(cd29StatusEarly.insights_payload.lostTrack, false);

        // 1. If a user logs ONLY temperature (fertility signal but no menstruation/cervical fluid) after expected length:
        const logsWithOnlyTemp = [
            ...logs,
            log(addDaysIso(start, 29), { temperature: 36.6 }), // CD 30 log
        ];
        const { statuses: statusesOnlyTemp } = runFusionEngine('u', { logs: logsWithOnlyTemp, meta: META, today });
        const byDateOnlyTemp = new Map(statusesOnlyTemp.map((s) => [s.date, s]));
        const statusOnlyTemp = byDateOnlyTemp.get(addDaysIso(start, 28)); // CD 29
        assert.ok(statusOnlyTemp);
        assert.equal(statusOnlyTemp.fertility_status, 'unsure');
        assert.equal(statusOnlyTemp.phase, 'Luteal');
        assert.equal(statusOnlyTemp.insights_payload.lostTrack, true);

        // 2. If a user logs ONLY mucus (both fertility signal and cervical fluid) after expected length:
        const logsWithOnlyMucus = [
            ...logs,
            log(addDaysIso(start, 29), { mucus: 'sticky' }), // CD 30 log
        ];
        const { statuses: statusesOnlyMucus } = runFusionEngine('u', { logs: logsWithOnlyMucus, meta: META, today });
        const byDateOnlyMucus = new Map(statusesOnlyMucus.map((s) => [s.date, s]));
        const statusOnlyMucus = byDateOnlyMucus.get(addDaysIso(start, 28)); // CD 29
        assert.ok(statusOnlyMucus);
        assert.equal(statusOnlyMucus.fertility_status, 'period');
        assert.equal(statusOnlyMucus.phase, 'Period');
        assert.equal(statusOnlyMucus.insights_payload.lostTrack, false);

        // 3. If a user logs temperature and spotting (fertility signal + menstruation) after expected length:
        const logsWithTempAndSpotting = [
            ...logs,
            log(addDaysIso(start, 29), { temperature: 36.6, bleeding: 'spotting' }), // CD 30 log
        ];
        const { statuses: statusesTempAndSpotting } = runFusionEngine('u', { logs: logsWithTempAndSpotting, meta: META, today });
        const byDateTempAndSpotting = new Map(statusesTempAndSpotting.map((s) => [s.date, s]));
        const statusTempAndSpotting = byDateTempAndSpotting.get(addDaysIso(start, 28)); // CD 29
        assert.ok(statusTempAndSpotting);
        assert.equal(statusTempAndSpotting.fertility_status, 'period');
        assert.equal(statusTempAndSpotting.phase, 'Period');
        assert.equal(statusTempAndSpotting.insights_payload.lostTrack, false);

        // 4. If a user logs ONLY menstruation/spotting (no fertility signal like temp/mucus/LH):
        const logsWithOnlySpotting = [
            ...logs,
            log(addDaysIso(start, 29), { bleeding: 'spotting' }), // CD 30 log
        ];
        const { statuses: statusesOnlySpotting } = runFusionEngine('u', { logs: logsWithOnlySpotting, meta: META, today });
        const byDateOnlySpotting = new Map(statusesOnlySpotting.map((s) => [s.date, s]));
        const statusOnlySpotting = byDateOnlySpotting.get(addDaysIso(start, 28)); // CD 29
        assert.ok(statusOnlySpotting);
        assert.equal(statusOnlySpotting.fertility_status, 'unsure');
        assert.equal(statusOnlySpotting.phase, 'Luteal');
        assert.equal(statusOnlySpotting.insights_payload.lostTrack, true);
    });
});
