export function buildInsightCards(fertilityStatus: string, phase: string, m: any) {
    if (!m || typeof m !== 'object') return {};

    const cycleDay = m.cycleDay ?? null;
    const confidenceScore = Math.round((m.confidenceScore ?? 0.3) * 100);
    const daysToOv = m.daysToOvulation;
    const s = m.stats || {};
    const avgLen = s.avgCycleLength ?? 28;
    const completedCycles = s.completedCycles ?? 0;

    const pool: string[] = [];

    if (m.anomalies?.includes('Multiple LH Surges (PCOS Risk)'))
        pool.push('Multiple LH surges detected — talk to your doctor.');
    if (m.anomalies?.includes('Conflicting Bio-signals'))
        pool.push('Signals don\'t fully agree. Keep logging.');

    if (daysToOv === 0) pool.push('Ovulation day — peak fertility.');
    else if (daysToOv === 1) pool.push('Ovulation likely tomorrow.');
    else if (daysToOv !== null && daysToOv > 1 && daysToOv <= 5)
        pool.push(`Ovulation in ~${daysToOv} days.`);

    if (m.isConfirmed) pool.push('Ovulation confirmed via temp shift.');

    if (phase === 'Luteal' && m.isConfirmed && cycleDay) {
        const daysToNextPeriod = avgLen - cycleDay;
        if (daysToNextPeriod > 0 && daysToNextPeriod <= 5)
            pool.push(`Period in ~${daysToNextPeriod} days.`);
    }

    if (m.tempReliability === 0) pool.push('Temp excluded (illness) — no impact on prediction.');

    if (pool.length < 2 && !m.hasTemp && fertilityStatus === 'fertile')
        pool.push('Log temp to help confirm ovulation.');

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
        confidenceMessage = completedCycles < 3 ? 'Improving with more cycles.' : 'Add temp or LH for better accuracy.';
    } else {
        confidenceLabel = 'Building';
        confidenceMessage = 'More data will sharpen predictions.';
    }

    // Cycle geometry for the Today "cycle line" (period-side context)
    const ovulationDay =
        m.daysToOvulation != null && cycleDay != null
            ? cycleDay + m.daysToOvulation
            : null;
    const fertileStartDay = ovulationDay != null ? Math.max(1, ovulationDay - 5) : null;
    const fertileEndDay = ovulationDay != null ? ovulationDay + 1 : null;
    const daysToNextPeriod =
        cycleDay == null
            ? null
            : ovulationDay != null
              ? Math.max(0, ovulationDay + 14 - cycleDay) // luteal phase ~14 days
              : Math.max(0, avgLen - cycleDay);

    return {
        today: {
            phase,
            cycleDay,
            cycleLength: avgLen,
            cycle: {
                day: cycleDay,
                length: avgLen,
                daysToNextPeriod,
                fertileStartDay,
                fertileEndDay,
            },
            notifications: pool.slice(0, 2),
            sourceText: sourceMap[m.primarySignal] || sourceMap.CALENDAR,
            confidence: {
                label: confidenceLabel,
                message: confidenceMessage,
                signals: {
                    temp: !!m.hasTemp,
                    lh: !!m.hasLh || m.primarySignal === 'LH',
                    mucus: !!m.hasMucus || m.primarySignal === 'MUCUS',
                    calendar: true,
                },
            },
        },
    };
}
