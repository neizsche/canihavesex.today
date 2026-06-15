import * as React from 'react';
import { CycleLengthChart } from './CycleLengthChart';
import { PeriodHistoryChart } from './PeriodHistoryChart';

interface ChartsViewProps {
  data: any[]; // CycleHistory[]
  insufficientData?: boolean;
  trends?: { heading: string; msg: string }[];
}

export function ChartsView({ data = [], insufficientData = false, trends = [] }: ChartsViewProps) {
  return (
    <div className="flex flex-col h-full bg-background dark:bg-black">
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="px-6 py-6 pb-24 max-w-md mx-auto space-y-12">
          {/* Backend Driven Trends (Handles Insufficient Data msg too) */}
          {trends.length > 0 && (
            <div className="space-y-3">
              {trends.map((trend, idx) => (
                <div
                  key={idx}
                  className="p-4 bg-zinc-50/80 dark:bg-zinc-900/50 rounded-2xl border border-zinc-100 dark:border-zinc-800"
                >
                  <h3 className="font-semibold text-[15px] text-zinc-900 dark:text-zinc-100">
                    {trend.heading}
                  </h3>
                  <p className="text-[13px] text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
                    {trend.msg}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Section 1: Cycle Length Trend */}
          {!insufficientData && (
            <section className="space-y-4">
              <CycleLengthChart data={data} />
            </section>
          )}

          {/* Section 2: Period History */}
          {!insufficientData && (
            <section className="space-y-4 pt-4 border-t border-zinc-100 dark:border-zinc-900">
              <PeriodHistoryChart data={data} />
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
