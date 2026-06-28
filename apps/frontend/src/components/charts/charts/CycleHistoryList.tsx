import * as React from 'react';
import { Check } from 'lucide-react';
import { type CycleData } from '@/lib/cycle-types';
import { addDays } from '@/lib/date';

interface CycleHistoryListProps {
  data: CycleData[];
}

const INITIAL_CAP = 12;

/** Parse a `YYYY-MM-DD` string as a local date (no UTC shift). */
function parseLocal(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** `May 3` style label. */
function monthDay(iso: string): string {
  return parseLocal(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * Layer 1b — newest-first list of past cycles, one inset row each. Replaces the
 * old period-length bar chart: each row carries the full per-cycle picture
 * (range, cycle length, period length, ovulation) the bars threw away.
 */
export function CycleHistoryList({ data }: CycleHistoryListProps) {
  const [showAll, setShowAll] = React.useState(false);

  // Newest first; drop the in-progress current cycle (no settled length).
  const completed = [...data].filter((c) => c.complete !== false).reverse();
  const visible = showAll ? completed : completed.slice(0, INITIAL_CAP);

  if (completed.length === 0) return null;

  return (
    <section>
      <h3 className="text-[11px] font-bold uppercase tracking-[0.06em] text-muted-foreground/70 mb-2.5 ml-1">
        Cycle History
      </h3>
      <div className="bg-card rounded-2xl border border-border/30 overflow-hidden divide-y divide-border/30">
        {visible.map((cycle) => {
          const endIso = addDays(cycle.startDate, cycle.length - 1);
          return (
            <div key={cycle.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <div className="text-[15px] font-semibold text-foreground">
                  {monthDay(cycle.startDate)} – {monthDay(endIso)}
                </div>
                <div className="mt-0.5 flex items-center gap-1.5 text-[13px] text-muted-foreground">
                  <span>Period {cycle.periodLength}d</span>
                  {cycle.ovulationDay != null && (
                    <>
                      <span className="text-muted-foreground/40">·</span>
                      <span className="inline-flex items-center gap-1">
                        Ovulation day {cycle.ovulationDay}
                        {cycle.ovulationConfirmed && (
                          <Check className="w-3 h-3 text-foreground/50" strokeWidth={2.5} />
                        )}
                      </span>
                    </>
                  )}
                </div>
              </div>
              <div className="shrink-0 flex items-baseline gap-1">
                <span className="text-[17px] font-bold tracking-tight text-foreground tabular-nums">
                  {cycle.length}
                </span>
                <span className="text-[12px] font-medium text-muted-foreground">days</span>
              </div>
            </div>
          );
        })}
      </div>

      {completed.length > INITIAL_CAP && (
        <button
          onClick={() => setShowAll((v) => !v)}
          className="mt-3 w-full text-[14px] font-semibold text-[#007aff] dark:text-[#0a84ff] py-2 transition-opacity active:opacity-70"
        >
          {showAll ? 'Show less' : `Show all ${completed.length}`}
        </button>
      )}
    </section>
  );
}
