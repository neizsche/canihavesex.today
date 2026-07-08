import * as React from 'react';
import { LineChart } from 'lucide-react';
import { CycleLengthChart } from './CycleLengthChart';
import { CycleHistoryList } from './CycleHistoryList';
import { CycleSummary, type CycleSummaryData } from './CycleSummary';
import { BodyPatterns, type Pattern } from './BodyPatterns';
import { SECTION_CAPTION, STATS_CARD } from './statsStyles';

interface ChartsViewProps {
  data: any[]; // CycleHistory[]
  insufficientData?: boolean;
  cyclesTracked?: number;
  headline?: { text: string; trend?: string } | null;
  summary?: Omit<CycleSummaryData, 'cyclesTracked'> | null;
  averages?: { averageCycleLength: number; cyclesTracked: number } | null;
  patterns?: Pattern[];
}

const CYCLES_NEEDED = 3;

/** Encouraging empty state — progress toward the 3-cycle unlock, not a dead end. */
function StatsEmptyState({ tracked }: { tracked: number }) {
  const done = Math.min(tracked, CYCLES_NEEDED);
  return (
    <div className="flex flex-col items-center justify-center px-8 py-16 text-center max-w-md mx-auto">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
        <LineChart className="h-7 w-7 text-muted-foreground" strokeWidth={1.75} />
      </div>
      <h2 className="mt-5 text-[19px] font-bold tracking-tight text-foreground">
        Building your stats
      </h2>
      <p className="mt-1.5 text-[14px] text-muted-foreground leading-relaxed">
        Log {CYCLES_NEEDED} complete cycles and your trends, patterns and history unlock here.
      </p>
      <div className="mt-6 flex items-center gap-2">
        {Array.from({ length: CYCLES_NEEDED }).map((_, i) => (
          <span
            key={i}
            className={
              i < done
                ? 'h-2 w-2 rounded-full bg-foreground'
                : 'h-2 w-2 rounded-full bg-muted-foreground/25'
            }
          />
        ))}
      </div>
      <p className="mt-3 text-[12px] font-medium text-muted-foreground">
        {done} of {CYCLES_NEEDED} cycles tracked
      </p>
    </div>
  );
}

export function ChartsView({
  data = [],
  insufficientData = false,
  cyclesTracked = 0,
  headline = null,
  summary = null,
  averages = null,
  patterns = [],
}: ChartsViewProps) {
  const summaryData: CycleSummaryData | null =
    summary && averages
      ? {
          ...summary,
          averageCycleLength: averages.averageCycleLength,
          cyclesTracked: averages.cyclesTracked,
        }
      : null;

  return (
    <div className="flex flex-col h-full bg-background dark:bg-black">
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="px-6 py-6 pb-24 max-w-md mx-auto space-y-7">
          {insufficientData ? (
            <StatsEmptyState tracked={cyclesTracked} />
          ) : (
            <>
              {/* Hero — average cycle + warm read of recent regularity. */}
              {summaryData && <CycleSummary summary={summaryData} headline={headline} />}

              {/* Cycle length trend chart */}
              <section>
                <h3 className={SECTION_CAPTION}>Cycle length</h3>
                <div className={`${STATS_CARD} p-5`}>
                  <CycleLengthChart data={data} />
                </div>
              </section>

              {/* Phase-based body patterns */}
              <BodyPatterns patterns={patterns} />

              {/* Cycle history list */}
              <CycleHistoryList data={data} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
