export function buildInsightCards(fertilityStatus: string, phase: string, m: any) {
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
        cycleDay == null || m.lostTrack
            ? null
            : Math.max(0, activeCycleLength + 1 - cycleDay);

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

    if (daysToNextPeriod != null && phase === 'Luteal' && m.isConfirmed && daysToNextPeriod > 0 && daysToNextPeriod <= 5)
        pool.push(`Period in ~${daysToNextPeriod} days.`);

    if (m.tempReliability === 0) pool.push('Temp excluded (illness) — no impact on prediction.');

    if (pool.length < 2 && !m.hasTemp && fertilityStatus === 'fertile')
        pool.push('Log temp to help confirm ovulation.');

    const sourceMap: Record<string, string> = {
        BBT: 'Anchored by temperature shift.',
        LH: 'Driven by LH surge.',
        MUCUS: 'Based on mucus pattern.',
        CALENDAR: 'Based on cycle history.',
    };

    // Plain-language explanation of WHY a day is `unsure`, keyed by the engine's
    // structured reason. Honesty-first, and each one nudges the next useful action
    // (mirrors HEALTH_SCIENCE.md: "assume fertile when unsure"; temp confirms ovulation).
    const unsureReasonMap: Record<string, string> = {
        lost_track: "You're past your usual cycle length — log today to refresh your prediction.",
        awaiting_ovulation: "Not enough signal yet to rule out fertility — assume fertile to be safe.",
        awaiting_confirmation: "Ovulation isn't confirmed yet — assume fertile until a temperature shift confirms it.",
        conflicting_signals: "Your signals don't fully agree yet — assume fertile to be safe.",
    };
    const statusReason =
        fertilityStatus === 'unsure' && m.unsureReason && unsureReasonMap[m.unsureReason]
            ? { reason: m.unsureReason as string, message: unsureReasonMap[m.unsureReason] }
            : null;

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

    // ── "Why this?" — the backend composes the ordered explanation so the Today
    // screen renders a list instead of assembling sentences client-side. Each line
    // is one reason behind today's call; deduped, most-important first.
    const why: string[] = [];
    why.push(sourceMap[m.primarySignal] || sourceMap.CALENDAR); // dominant signal
    if (daysToOv === 0) why.push('Ovulation is most likely today — your peak fertile day.');
    else if (daysToOv === 1) why.push('Ovulation is likely tomorrow.');
    else if (daysToOv != null && daysToOv > 1 && daysToOv <= 7)
        why.push(`Ovulation is likely in about ${daysToOv} days.`);
    else if (daysToOv != null && daysToOv < 0 && daysToOv >= -6) {
        const ago = Math.abs(daysToOv);
        why.push(`Ovulation was about ${ago} day${ago === 1 ? '' : 's'} ago.`);
    }
    if (m.isConfirmed) why.push('Your temperature shift confirms ovulation has passed.');
    if (statusReason) why.push(statusReason.message); // the specific "unsure" reason
    if (confidenceMessage) why.push(confidenceMessage); // how much to trust it
    const whyLines = Array.from(new Set(why.filter(Boolean)));

    // Cycle geometry for the Today "cycle line" (period-side context)
    const ovulationDay =
        m.daysToOvulation != null && cycleDay != null
            ? cycleDay + m.daysToOvulation
            : null;
    const fertileStartDay = ovulationDay != null ? Math.max(1, ovulationDay - 5) : null;
    const fertileEndDay = ovulationDay != null ? ovulationDay + 1 : null;
    // daysToNextPeriod is computed once up top (shared with the luteal nudge).

    return {
        today: {
            phase,
            lostTrack: m.lostTrack || false,
            cycle: {
                day: cycleDay,
                length: avgLen,
                daysToNextPeriod,
                fertileStartDay,
                fertileEndDay,
            },
            notifications: pool.slice(0, 2),
            sourceText: sourceMap[m.primarySignal] || sourceMap.CALENDAR,
            // Why this status (only when `unsure`) — plain-language explanation
            // for the Today screen. Null otherwise.
            statusReason,
            // Raw drivers behind today's call, surfaced so the Today screen can
            // compose a dynamic "Why this?" view instead of static copy.
            daysToOvulation: daysToOv ?? null,
            isConfirmed: !!m.isConfirmed,
            primarySignal: m.primarySignal || 'CALENDAR',
            confidenceScore,
            // Backend-composed "Why this?" explanation lines for the Today screen.
            why: whyLines,
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
