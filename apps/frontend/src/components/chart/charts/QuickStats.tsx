import * as React from 'react';
import { Sparkles } from 'lucide-react';
import { QuickStatsData } from '@/lib/mock-data';
import { CHARTS_VIEW_LABELS } from './ChartsView.config';

interface QuickStatsProps {
  data?: QuickStatsData;
}

export function QuickStats({ data }: QuickStatsProps) {
  // Checkbox state for historical view. Declared before any early return so the
  // hook is called in the same order on every render (rules-of-hooks).
  const [isAccurate, setIsAccurate] = React.useState(true);

  if (!data) return null;

  if (data.isHistorical) {
    return (
      <div className="mt-8 px-6 pb-6">
        <h3 className="text-[13px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wide mb-3 pl-1">
          Cycle Summary
        </h3>
        <div className="bg-white dark:bg-zinc-900/50 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              {/* Dynamic Label based on prediction status */}
              <div className="text-[13px] text-zinc-500 dark:text-zinc-400 font-medium mb-0.5">
                {data.isPredicted ? 'Period Predicted' : 'Period Started'}
              </div>
              <div className="text-[17px] font-semibold text-zinc-900 dark:text-white">
                {data.subText || data.periodStartDate}
              </div>
            </div>
            <div className="text-right">
              {/* Only show secondary date if relevant */}
              {data.ovulationDate && (
                <>
                  <div className="text-[13px] text-zinc-500 dark:text-zinc-400 font-medium mb-0.5">
                    Probable Ovulation
                  </div>
                  <div className="text-[17px] font-semibold text-zinc-900 dark:text-white">
                    {data.ovulationDate}
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between gap-3">
            {/* Show Phase if available, else show Accuracy Checkbox */}
            {data.phase ? (
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                <span className="text-[14px] text-zinc-900 dark:text-white font-medium">
                  {data.phase}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <div
                  onClick={() => setIsAccurate(!isAccurate)}
                  className={`w-5 h-5 rounded-md border flex items-center justify-center cursor-pointer transition-colors ${isAccurate ? 'bg-zinc-900 border-zinc-900 dark:bg-white dark:border-white' : 'border-zinc-300 dark:border-zinc-600'}`}
                >
                  {isAccurate && (
                    <Sparkles className="w-3 h-3 text-white dark:text-zinc-900 fill-current" />
                  )}
                </div>
                <span
                  className="text-[14px] text-zinc-600 dark:text-zinc-400 font-medium selection:bg-none cursor-pointer"
                  onClick={() => setIsAccurate(!isAccurate)}
                >
                  Predictions were accurate
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-8 px-6 pb-6">
      <h3 className="text-[13px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wide mb-3 pl-1">
        {CHARTS_VIEW_LABELS.quickStats.title}
      </h3>
      <div className="bg-white dark:bg-zinc-900/50 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 shadow-sm">
        <div className="flex items-center">
          {/* Countdown */}
          <div className="flex flex-col items-center justify-center pr-6 border-r border-zinc-100 dark:border-zinc-800">
            <div className="text-4xl font-bold text-zinc-900 dark:text-white tracking-tight leading-none mb-1">
              {data.daysToPeriod ?? '-'}
            </div>
            <div className="text-[11px] font-medium text-zinc-400 dark:text-zinc-500 uppercase tracking-wide text-center leading-tight">
              Days to
              <br />
              Period
            </div>
          </div>

          {/* Stats List */}
          <div className="flex-1 pl-6 space-y-3">
            {/* Cycle Day */}
            <div className="flex justify-between items-center">
              <span className="text-[15px] text-zinc-500 dark:text-zinc-400 font-medium">
                {CHARTS_VIEW_LABELS.quickStats.cycleDay}
              </span>
              <span className="text-[15px] font-semibold text-zinc-900 dark:text-white font-mono">
                {data.cycleDay}
              </span>
            </div>

            {/* Fertile Window */}
            <div className="flex justify-between items-center">
              <span className="text-[15px] text-zinc-500 dark:text-zinc-400 font-medium">
                {CHARTS_VIEW_LABELS.quickStats.fertility}
              </span>
              <div
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full ${data.fertilityStatus === 'High' ? 'bg-rose-100 dark:bg-rose-500/20' : 'bg-zinc-100 dark:bg-zinc-800'}`}
              >
                {data.fertilityStatus === 'High' && (
                  <Sparkles className="w-3 h-3 text-rose-600 dark:text-rose-400 fill-current" />
                )}
                <span
                  className={`text-[12px] font-bold ${data.fertilityStatus === 'High' ? 'text-rose-600 dark:text-rose-400' : 'text-zinc-500'}`}
                >
                  {data.fertilityStatus || 'Low'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
