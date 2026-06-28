import * as React from 'react';
import { CalendarDays, ChevronRight } from 'lucide-react';

import { cn } from '@/lib/utils';
import { InsetGroup } from '@/components/common/ui/inset-group';
import { CycleLine } from './CycleLine';

const SIGNAL_KEYS = [
  { key: 'temp', label: 'Temp' },
  { key: 'lh', label: 'LH' },
  { key: 'mucus', label: 'Fluid' },
  { key: 'calendar', label: 'Calendar' },
] as const;

export function TodayReadyState({
  phase,
  statusTitle,
  statusAccent,
  statusDot,
  dynamicSubtitle,
  onViewCalendar,
  cycle,
  lastUpdatedText,
  confidenceLabel,
  basisShort,
  signals,
  confidenceMessage,
}: {
  phase: string;
  statusTitle: string;
  statusAccent: string;
  statusDot: string;
  dynamicSubtitle: string;
  onViewCalendar: () => void;
  cycle?: {
    day?: number | null;
    length?: number | null;
    fertileStartDay?: number | null;
    fertileEndDay?: number | null;
    nextPeriodDateStr?: string | null;
    fertileStartDateStr?: string | null;
    fertileEndDateStr?: string | null;
  };
  lastUpdatedText: string;
  confidenceLabel: string;
  basisShort: string;
  signals: Record<string, unknown>;
  confidenceMessage: string;
}) {
  return (
    <>
      <div className="flex-1 flex flex-col items-center justify-center px-8 text-center min-h-[280px]">
        {phase && (
          <div
            className={cn(
              'flex items-center gap-2 mb-4 text-[12px] font-bold uppercase tracking-[0.1em]',
              statusAccent
            )}
          >
            <div className={cn('w-1.5 h-1.5 rounded-full', statusDot)} />
            {phase}
          </div>
        )}

        <h1 className="text-[42px] font-extrabold tracking-[-0.05em] leading-none text-zinc-900 dark:text-white">
          {statusTitle}
        </h1>

        <p className="text-[15px] text-zinc-500 dark:text-zinc-500 mt-3 max-w-[260px] leading-relaxed">
          {dynamicSubtitle}
        </p>
      </div>

      <div className="flex flex-col gap-5 pb-[var(--inset-gap)]">
        <div className="-mb-2 mt-1 flex justify-center">
          <button
            onClick={onViewCalendar}
            className="group inline-flex items-center gap-2 rounded-full border border-border/40 bg-card/70 py-1.5 pl-2 pr-3 shadow-sm backdrop-blur-xl transition-all hover:bg-card hover:shadow active:scale-95"
          >
            <span className="flex h-[22px] w-[22px] items-center justify-center rounded-full bg-blue-500/10 dark:bg-blue-400/10">
              <CalendarDays
                className="h-[13px] w-[13px] text-blue-600 dark:text-blue-400"
                strokeWidth={2.5}
              />
            </span>
            <span className="text-[13px] font-medium tracking-tight text-zinc-700 dark:text-zinc-200">
              View Full Calendar
            </span>
            <ChevronRight className="h-3.5 w-3.5 text-zinc-300 transition-transform duration-200 group-hover:translate-x-0.5 dark:text-zinc-600" />
          </button>
        </div>

        {cycle?.day && cycle?.length && (
          <CycleLine
            day={cycle.day}
            length={cycle.length}
            fertileStartDay={cycle.fertileStartDay ?? null}
            fertileEndDay={cycle.fertileEndDay ?? null}
            nextPeriodDateStr={cycle.nextPeriodDateStr ?? null}
            fertileStartDateStr={cycle.fertileStartDateStr ?? null}
            fertileEndDateStr={cycle.fertileEndDateStr ?? null}
            lastUpdatedText={lastUpdatedText}
          />
        )}

        <InsetGroup containerClassName="mb-0">
          <div className="flex">
            <div className="flex-1 py-4 pl-4">
              <div className="text-[11px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.06em] mb-1">
                Confidence
              </div>
              <div className="text-[17px] font-bold text-zinc-800 dark:text-zinc-100 tracking-tight leading-tight">
                {confidenceLabel || '—'}
              </div>
            </div>
            <div className="w-px self-stretch my-3 bg-zinc-100 dark:bg-zinc-800/80" />
            <div className="flex-1 pl-4 py-4 pr-4">
              <div className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-[0.06em] mb-1">
                Basis
              </div>
              <div className="text-[17px] font-bold text-zinc-800 dark:text-zinc-100 tracking-tight leading-tight">
                {basisShort}
              </div>
            </div>
          </div>

          <div className="mb-4 mx-4 border-t border-zinc-100 dark:border-zinc-800/60 pt-3">
            <div className="flex items-center justify-between">
              {SIGNAL_KEYS.map(({ key, label }, i) => {
                const active = Boolean(signals[key]);
                return (
                  <React.Fragment key={key}>
                    <div className="flex items-center gap-1.5">
                      {active && (
                        <svg
                          viewBox="0 0 12 12"
                          className="h-2.5 w-2.5 text-[#007AFF] dark:text-[#0A84FF] mt-0.5"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={2.5}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden="true"
                        >
                          <path d="M2.4 6.3 L4.9 8.8 L9.6 3.4" />
                        </svg>
                      )}
                      <span
                        className={cn(
                          'text-[13px] font-semibold transition-colors',
                          active
                            ? 'text-zinc-800 dark:text-zinc-100'
                            : 'text-zinc-400 dark:text-zinc-500'
                        )}
                      >
                        {label}
                      </span>
                    </div>
                    {i < SIGNAL_KEYS.length - 1 && (
                      <span className="w-px h-3 bg-zinc-100 dark:bg-zinc-800/60" />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          {confidenceMessage && (
            <div className="pb-3.5 px-4 -mt-1">
              <p className="text-[12px] font-medium text-zinc-500 dark:text-zinc-400 leading-relaxed">
                {confidenceMessage}
              </p>
            </div>
          )}
        </InsetGroup>
      </div>
    </>
  );
}
