import * as React from 'react';

import { InsetGroup } from '@/components/common/ui/inset-group';

interface CycleLineProps {
  day: number;
  length: number;
  lastUpdatedText: string;
  fertileStartDay: number | null;
  fertileEndDay: number | null;
  nextPeriodDateStr: string | null;
  fertileStartDateStr: string | null;
  fertileEndDateStr: string | null;
}

export function CycleLine({
  day,
  length,
  lastUpdatedText,
  fertileStartDay,
  fertileEndDay,
  nextPeriodDateStr,
  fertileStartDateStr,
  fertileEndDateStr,
}: CycleLineProps) {
  if (!day || !length) return null;

  const hasFertile = fertileStartDay != null && fertileEndDay != null;
  const isTodayFertile = hasFertile && day >= fertileStartDay && day <= fertileEndDay;

  // Percentages mapping for 1-indexed cycle progression
  const lengthSpan = Math.max(1, length - 1);
  const progressPercent = Math.min(100, Math.max(0, ((day - 1) / lengthSpan) * 100));

  const fStartPercent = hasFertile ? Math.max(0, ((fertileStartDay - 1) / lengthSpan) * 100) : 0;
  const fEndPercent = hasFertile ? Math.min(100, ((fertileEndDay - 1) / lengthSpan) * 100) : 0;
  const fWidth = hasFertile ? Math.max(0, fEndPercent - fStartPercent) : 0;

  return (
    <InsetGroup containerClassName="mb-0">
      <div className="px-5 py-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <span className="text-[14px] font-bold text-zinc-900 dark:text-white">
            Cycle Day {day}
          </span>
          <span className="text-[12px] font-medium text-zinc-400 dark:text-zinc-500">
            {lastUpdatedText}
          </span>
        </div>

        {/* Progress Bar */}
        <div className="relative h-2.5 bg-zinc-100 dark:bg-zinc-800/80 rounded-full mb-5">
          {/* Fertile window overlay */}
          {hasFertile && (
            <div
              className="absolute top-0 h-full bg-[#af52de]/15 dark:bg-[#bf5af2]/20 rounded-full"
              style={{
                left: `${fStartPercent}%`,
                width: `${fWidth}%`,
              }}
            />
          )}

          {/* Current day indicator */}
          <img
            src="/assets/logo.png"
            alt="Current Day"
            className="absolute top-1/2 -mt-4 w-8 h-8 object-contain transition-all duration-300 z-10"
            style={{ left: `calc(${progressPercent}% - 16px)` }}
          />
        </div>

        {/* Details */}
        <div className="flex justify-between items-start">
          <div>
            <div className="text-[11px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.06em] mb-1">
              Fertile Window
            </div>
            <div className="text-[15px] font-bold text-zinc-900 dark:text-zinc-100">
              {hasFertile && fertileStartDateStr && fertileEndDateStr
                ? `${fertileStartDateStr} - ${fertileEndDateStr}`
                : '—'}
            </div>
          </div>

          <div className="text-right">
            <div className="text-[11px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.06em] mb-1">
              Next Period
            </div>
            <div className="text-[15px] font-bold text-zinc-900 dark:text-zinc-100">
              {nextPeriodDateStr || '—'}
            </div>
          </div>
        </div>
      </div>
    </InsetGroup>
  );
}
