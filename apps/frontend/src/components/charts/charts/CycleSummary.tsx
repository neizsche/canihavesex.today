import * as React from 'react';

export interface CycleSummaryData {
  averageCycleLength: number;
  medianCycleLength: number;
  minCycleLength: number;
  maxCycleLength: number;
  avgPeriodLength: number | null;
  variation: number;
  regularityLabel: 'Regular' | 'Variable';
  cyclesTracked: number;
}

interface CycleSummaryProps {
  summary: CycleSummaryData;
}

/**
 * Layer 1 — the honest backbone of the Stats tab. A single Apple-Health-style
 * card: a calm hero number (average cycle) with a quiet regularity chip, then a
 * hairline-divided strip of supporting stats. All values are already gated by
 * the ≥3-cycle check upstream. Monochrome by brand — colour signals fertility
 * status only, never decoration.
 */
export function CycleSummary({ summary }: CycleSummaryProps) {
  const strip: { label: string; value: string }[] = [
    { label: 'Median', value: `${summary.medianCycleLength}` },
    { label: 'Range', value: `${summary.minCycleLength}–${summary.maxCycleLength}` },
    {
      label: 'Avg period',
      value: summary.avgPeriodLength != null ? `${summary.avgPeriodLength}d` : '–',
    },
  ];

  return (
    <section>
      <div className="bg-card rounded-2xl border border-border/30 overflow-hidden">
        {/* Hero — bold number, quiet answer. */}
        <div className="flex items-start justify-between px-5 pt-5 pb-4">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground/80">
              Average cycle
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-[44px] font-bold tracking-[-0.03em] text-foreground leading-none">
                {summary.averageCycleLength}
              </span>
              <span className="text-[15px] font-medium text-muted-foreground">days</span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1 pt-1">
            <span className="rounded-full bg-muted px-3 py-1 text-[13px] font-semibold text-foreground">
              {summary.regularityLabel}
            </span>
            <span className="text-[11px] font-medium text-muted-foreground">
              ±{summary.variation}d variation
            </span>
          </div>
        </div>

        {/* Supporting stats — hairline-divided strip. */}
        <div className="grid grid-cols-3 divide-x divide-border/30 border-t border-border/30">
          {strip.map((cell) => (
            <div key={cell.label} className="px-2 py-3.5 text-center">
              <div className="text-[19px] font-bold tracking-tight text-foreground tabular-nums">
                {cell.value}
              </div>
              <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                {cell.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
