import { ChevronRight } from 'lucide-react';

import { CycleLine } from './CycleLine';
import { TodayHero } from './TodayHero';

export function TodayReadyState({
  phase,
  statusTitle,
  statusAccent,
  statusDot,
  dynamicSubtitle,
  subtitleWarn,
  cycle,
  onViewInsights,
}: {
  phase: string;
  statusTitle: string;
  statusAccent: string;
  statusDot: string;
  dynamicSubtitle: string;
  subtitleWarn?: boolean;
  cycle?: {
    day?: number | null;
    length?: number | null;
    fertileStartDay?: number | null;
    fertileEndDay?: number | null;
    nextPeriodDateStr?: string | null;
    fertileStartDateStr?: string | null;
    fertileEndDateStr?: string | null;
  };
  onViewInsights: () => void;
}) {
  return (
    <div className="flex min-h-full flex-col justify-between px-6 pb-[var(--inset-gap)]">
      <div className="flex-1 flex flex-col items-center justify-center px-2 text-center min-h-[280px]">
        <TodayHero
          phase={phase}
          title={statusTitle}
          accent={statusAccent}
          dot={statusDot}
          subtitle={dynamicSubtitle}
          subtitleWarn={subtitleWarn}
        />
      </div>

      <div className="flex flex-col gap-6">
        {cycle?.day && cycle?.length && (
          <CycleLine
            day={cycle.day}
            length={cycle.length}
            fertileStartDay={cycle.fertileStartDay ?? null}
            fertileEndDay={cycle.fertileEndDay ?? null}
            nextPeriodDateStr={cycle.nextPeriodDateStr ?? null}
            fertileStartDateStr={cycle.fertileStartDateStr ?? null}
            fertileEndDateStr={cycle.fertileEndDateStr ?? null}
          />
        )}

        <button
          onClick={onViewInsights}
          className="group inline-flex items-center gap-1 self-center text-[14px] font-medium text-zinc-400 transition-opacity active:opacity-60 dark:text-zinc-500"
        >
          TODAY EXPLAINED
          <ChevronRight className="h-4 w-4 text-zinc-300 transition-transform group-hover:translate-x-0.5 dark:text-zinc-600" />
        </button>
      </div>
    </div>
  );
}
