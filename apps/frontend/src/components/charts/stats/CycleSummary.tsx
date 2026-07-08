import * as React from 'react';
import { STATS_CARD } from './statsStyles';

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
  /** One warm, specific read of recent regularity (from the API). */
  headline?: { text: string; trend?: string } | null;
}

/**
 * The honest backbone of the Stats tab — the page's hero. A single
 * Apple-Health-style card: a calm hero number (average cycle) with a warm
 * one-line read of recent regularity and a quiet regularity chip, then a
 * hairline-divided strip of supporting stats. All values are already gated by
 * the ≥3-cycle check upstream. Monochrome by brand — colour signals fertility
 * status only, never decoration.
 */
export function CycleSummary({ summary, headline = null }: CycleSummaryProps) {
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
      <div className={`${STATS_CARD} overflow-hidden`}>
        {/* Hero — bold number, warm read, quiet regularity chip. */}
        <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-4">
          <div className="min-w-0">
            <div className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground/80">
              Average cycle
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-[44px] font-bold tracking-[-0.03em] text-foreground leading-none">
                {summary.averageCycleLength}
              </span>
              <span className="text-[15px] font-medium text-muted-foreground">days</span>
            </div>
            {headline && (
              <p className="mt-2.5 text-[13px] text-muted-foreground leading-snug">
                {headline.text}
              </p>
            )}
          </div>
          <span className="shrink-0 rounded-full bg-muted px-3 py-1 text-[13px] font-semibold text-foreground">
            {summary.regularityLabel}
          </span>
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
