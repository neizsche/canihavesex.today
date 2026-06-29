import * as React from 'react';
import { CycleLengthChart } from './CycleLengthChart';
import { CycleHistoryList } from './CycleHistoryList';
import { CycleSummary, type CycleSummaryData } from './CycleSummary';
import { BodyPatterns, type Pattern } from './BodyPatterns';

interface ChartsViewProps {
  data: any[]; // CycleHistory[]
  insufficientData?: boolean;
  trends?: { heading: string; msg: string }[];
  summary?: Omit<CycleSummaryData, 'cyclesTracked'> | null;
  averages?: { averageCycleLength: number; cyclesTracked: number } | null;
  patterns?: Pattern[];
}

export function ChartsView({
  data = [],
  insufficientData = false,
  trends = [],
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

  const tracked = averages?.cyclesTracked ?? 0;

  return (
    <div className="flex flex-col h-full bg-background dark:bg-black">
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="px-6 py-6 pb-24 max-w-md mx-auto space-y-7">
          {/* Screen Header */}
          {!insufficientData && (
            <header className="space-y-1 pl-1">
              <h1 className="text-[28px] font-bold tracking-[-0.03em] text-foreground leading-none">
                Your cycle
              </h1>
              {tracked > 0 && (
                <p className="text-[14px] text-muted-foreground">Across {tracked} tracked cycles</p>
              )}
            </header>
          )}

          {/* Dynamic trends or status messages */}
          {trends.length > 0 && (
            <div className="space-y-3">
              {trends.map((trend, idx) => (
                <div key={idx} className="p-4 bg-card rounded-2xl border border-border/30">
                  <h3 className="font-semibold text-[15px] text-foreground">{trend.heading}</h3>
                  <p className="text-[13px] text-muted-foreground mt-1 leading-relaxed">
                    {trend.msg}
                  </p>
                </div>
              ))}
            </div>
          )}

          {!insufficientData && (
            <>
              {/* Cycle Summary component */}
              {summaryData && <CycleSummary summary={summaryData} />}

              {/* Cycle length trend chart */}
              <section>
                <div className="bg-card rounded-2xl border border-border/30 p-5">
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
