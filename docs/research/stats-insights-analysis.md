# Stats & Insights — How Drip & Ovumcy Surface Cycle Info (and what we should)

> Task 3.0 from the [implementation plan](../design/implementation-plan.md).
> Defines what our stats/insight surfaces and `insights_payload` should emit, so
> the engine-v6 **final refinement pass (§8.1)** has a concrete target.
>
> Sources: Drip `components/stats/*` + `lib/cycle.js`; Ovumcy
> `internal/services/stats_*`; ours `apps/backend/src/{engine.ts,utils/insights.ts}`
> + `apps/frontend/.../chart/*`.

---

## 0. The two philosophies

- **Drip = minimal & honest.** A handful of cycle-length numbers, a per-cycle
  symptothermal chart, nothing more. No correlations, no "AI insights." It trusts
  the user to read their own chart.
- **Ovumcy = rich & progressively disclosed.** A deep stats page — trends,
  per-phase mood/symptom patterns, factor correlations, soft medical notices —
  but every block is **gated on data sufficiency** (2+ / 3+ completed cycles) and
  framed to avoid anxiety. Crucially, the gating is a *data meter, never a
  paywall*.

Our north star sits between them: **honest like Drip, with a few of Ovumcy's
genuinely useful insights — and zero upsell** (which our ROADMAP wedge demands).

---

## 1. Drip — what it computes and shows

**Computes** (`lib/cycle.js`, `cycle-length.js`):
- `getAllCycleLengths()` → list of completed cycle lengths.
- `getCycleLengthStats()` → `minimum, maximum, mean, median, stdDeviation`.
- `getStats()` → per cycle: `{ date, cycleLength, bleedingLength }`.

**Shows** (`components/stats`):
- A big **mean cycle length** ("28 days · average").
- A 2-column overview: **min, max, standard deviation, completed cycles**.
- "Show stats" → **PeriodDetailsModal** (per-period bleeding length detail).
- A footnote explaining the std-dev asterisk.
- Separately, the **chart screen** is the daily symptothermal chart (temp curve,
  mucus, bleeding per cycle day) — the thing you *read* to confirm ovulation.

**Takeaway:** central tendency + spread + count, and a great daily chart. That's
it. No phase/symptom/factor analysis. Deliberately un-clever.

---

## 2. Ovumcy — the full insight catalog

Everything below is gated by `StatsFlags` (`HasInsights` ≥2 cycles,
`HasReliableTrend` ≥3, `InsightProgress` = % toward the threshold) and owner-only.

**Core `CycleStats`:** current cycle day + phase; **avg, median, min, max** cycle
length; **std-dev**; completed count; avg/last period length; last cycle length;
luteal phase; next-period date; ovulation date (+ `exact`/`impossible`); fertile
window; pregnancy-paused.

**Trend:** completed cycle lengths over time + their average; reliability gating;
a cycle-length **line chart** with a baseline.

**Current-cycle BBT chart** (`StatsBBTChartViewData`): temp values, computed
**baseline**, and an **ovulation marker** — the symptothermal chart, on the web.

**Cycle-factor context** (`stats_cycle_factor_context.go`) — the standout:
- recent stress/illness/travel/sleep/medication factor counts (90-day window),
- **pattern summaries** (factors that recur),
- **recent factor cycles** — which cycles carried a factor *and whether they ran
  longer/shorter than typical* (`ComparisonKind`),
- **prediction factor hints** — "this cycle's deviation lines up with logged
  stress." This is the "why was my cycle weird?" answer.

**Symptom insights:** top symptoms last cycle (with a frequency summary like "most
days"); **symptom patterns** (which cycle-day range a symptom clusters in); raw
counts.

**Phase insights** (`stats_phase_insights.go`, ≥3 cycles): **mood by phase**
(avg mood per menstrual/follicular/ovulation/luteal), and **top symptoms by
phase**.

**Soft, pattern-gated medical notices** — the anti-anxiety pattern worth copying:
- short-cycle (<24d) / long-cycle (>45d) notices, **only after ≥3 occurrences**
  so one merged-log cycle never shows scary wording,
- perimenopause hint, irregularity notice + insufficient-data variant.
- All framed as a *pattern*, not a single event, and never diagnostic.

**Prediction reliability & explanation:** sample count, recent-window flag,
reliability label/hint, and explanation keys (`irregular_sparse`,
`irregular_ranges`, `variable_ranges`, `unpredictable`, `factor_context`).

---

## 3. Ours — current state

**Backend already produces a lot** (`engine.ts` + `utils/insights.ts`):
- `computeCycleStats`: **avg** cycle length, **variation** (std-dev), avg period
  length, completed count. *(No median yet — the v6 redesign adds it.)*
- `insights_payload` per day: cycleDay, **confidence score**, **primarySignal**,
  isConfirmed, **daysToOvulation**, anomalies (PCOS/conflict), tempReliability,
  hasTemp/Lh/Mucus, and a `stats` block (avgCycleLength, variation, loggingRate,
  maxGap, avgPeriodLength, completedCycles).
- `buildInsightCards` → a **Today** card with: explainable notifications
  (ovulation/period countdowns, confirmation, "log temp" nudge, PCOS warning),
  **source text** ("Anchored by temperature shift"), a **confidence label +
  message**, signal booleans (temp/lh/mucus/calendar), and cycle geometry
  (fertile start/end, days to next period). **This already rivals Ovumcy's
  explainability** and beats Drip.

**Frontend Chart tab:** `QuickStats` ("At a Glance": days-to-period, cycle day,
fertility High/Low; a historical mode with predicted/started + probable
ovulation + phase + a "predictions were accurate" feedback checkbox),
`CycleLengthChart`, `PeriodHistoryChart`.

**Two issues found while reading:**
- ⚠️ **A "premium / Unlock Full Insights" upsell** exists in
  `ChartsView.config.ts`. This contradicts the ROADMAP wedge ("no subscription
  walls on core features"). Ovumcy's `InsightProgress` is the honest alternative:
  a *data-sufficiency* meter ("2 more cycles to unlock trends"), not a paywall.
  **Recommend replacing the premium framing with a data-progress meter.**
- ⚠️ **`QuickStats` is fed from `@/lib/mock-data`**, not the real
  `insights_payload`. Wiring it to engine output is part of the §8.1 refinement.

---

## 4. Capability matrix

| Insight | Drip | Ovumcy | Ours (now) | Action |
|---|:---:|:---:|:---:|---|
| Cycle length avg/median/min/max | mean+median+min/max+SD | ✅ all | avg+SD only | **add median, min/max** |
| Completed-cycle count | ✅ | ✅ | ✅ | — |
| Period length | per-cycle | avg+last | avg | ok (add last) |
| Cycle-length **trend chart** | — | ✅ | `CycleLengthChart` | wire to real data |
| **BBT / symptothermal chart** | ✅ (daily) | ✅ (+baseline+marker) | ❌ | **add** (high value) |
| Confidence + **why** (explainability) | — | partial | ✅ strong | keep; surface more |
| **Cycle-factor correlation** | — | ✅ (standout) | ❌ (data collected) | **add** |
| **Phase × mood/symptom** | — | ✅ | ❌ (data collected) | add (medium) |
| Symptom frequency/patterns | — | ✅ | ❌ | add (medium) |
| **Soft, pattern-gated notices** | — | ✅ (anti-anxiety) | anomaly flags only | **add** (gentle) |
| Data-sufficiency gating | implicit | ✅ meter | ⚠️ premium upsell | **replace upsell w/ meter** |
| Prediction reliability/explanation | — | ✅ | partial (confidence) | extend |
| Next-period / ovulation dates | — | ✅ | ✅ | — |

---

## 5. Recommendations — what to build, mapped to our surfaces

We're already strong on per-day explainability. The gaps are **aggregate
insights** and **honest gating**. Priority order:

### Tier 1 — high value, reuses data we already collect
1. **Cycle-factor correlation** (Ovumcy's standout). We already store per-day
   `disturbances[]` and per-user `context_flags[]`. Surface: "Your last cycle ran
   4 days longer than usual — you logged *illness* during it." Pattern-gated,
   non-diagnostic. *(Also feeds the engine's factor-context hint, §6.8.)*
2. **BBT / symptothermal chart** on the Chart tab — temp curve + computed
   baseline + ovulation marker (Drip & Ovumcy both have it; it's the chart
   fertility-aware users most want, and it makes our open algorithm legible).
3. **Add median + min/max** to cycle stats (the v6 engine already moves to median
   internally — expose it).
4. **Replace the "premium" upsell with a data-sufficiency meter.** "2 more cycles
   to unlock trends" — never a paywall. Aligns with the wedge.

### Tier 2 — good, needs a bit more aggregation
5. **Soft, pattern-gated cycle notices** — short (<24d) / long (>45d) /
   irregular, only after **≥3 occurrences**, framed as a pattern, never
   diagnostic (copy Ovumcy's anti-anxiety gating exactly).
6. **Phase × mood / symptom insights** — we collect mood + symptoms; aggregate by
   phase (≥3 cycles). "You report low energy most often in your luteal phase."
7. **Symptom frequency / patterns** — top symptoms last cycle + which cycle-day
   range they cluster in.

### Tier 3 — polish
8. **Wire `QuickStats` to real `insights_payload`** (remove mock-data).
9. **Prediction reliability copy** keyed off confidence + sample count + irregular
   state (we have the inputs).

### Surface mapping
- **Today tab:** keep the confidence + signals + countdown card; **add the
  factor-context hint** when relevant.
- **Chart tab:** add the **BBT chart**; wire QuickStats; show trend with the
  data-sufficiency meter; add median/min/max.
- **Insights (new Chart section):** factor correlation, phase insights, symptom
  patterns, soft notices — all progressively disclosed by completed-cycle count.

### `insights_payload` additions (for the §8.1 refinement)
Extend the payload (and a per-cycle stats object) to carry:
`medianCycleLength`, `minCycleLength`, `maxCycleLength`, `lastPeriodLength`,
`factorContext` (recent factors + whether the cycle deviated), `phaseInsights`
(mood/symptom by phase), `symptomPatterns`, `softNotices[]` (pattern-gated),
`predictionReliability` (label + sample count + irregular flag), and
`insightProgress` (% toward each gated block). Trim anything no surface renders.

---

## 6. Guardrails for insights (carry the §9 discipline here too)
- **Gate every aggregate on data sufficiency** (≥2 / ≥3 cycles). Never show a
  "trend" from one cycle.
- **Pattern-gate all medical-adjacent wording** (≥3 occurrences) and keep it
  non-diagnostic — anti-anxiety by construction.
- **No paywalls.** Gating communicates *data readiness*, never payment.
- **Insights are read-only derivations** of logs + engine output; they must never
  feed back into the fertility calculation (keep the engine the single source of
  truth).

---

*Conclusion: our per-day explainability already beats Drip and rivals Ovumcy. The
opportunity is aggregate insights — factor correlation, a BBT chart, phase
patterns, soft notices — all from data we already collect, all gated honestly
(meter, not paywall). The `insights_payload` additions above are the concrete
output target for the engine-v6 refinement pass.*
