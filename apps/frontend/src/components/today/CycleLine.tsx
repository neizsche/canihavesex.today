import * as React from 'react';

interface CycleLineProps {
  day: number;
  length: number;
  daysToNextPeriod: number | null;
  fertileStartDay: number | null;
  fertileEndDay: number | null;
}

const pct = (value: number, length: number) => Math.max(0, Math.min(100, (value / length) * 100));

function nextPeriodLabel(days: number | null): string | null {
  if (days === null) return null;
  if (days <= 0) return 'Period likely today';
  if (days === 1) return 'Period likely tomorrow';
  return `Next period in ${days} days`;
}

/**
 * Variant B "whisper" cycle line: a single quiet hairline showing today's
 * position in the cycle, a faint fertile-window tint, and the next-period
 * estimate. Fertility stays the hero above; this is the period-side context.
 */
export function CycleLine({
  day,
  length,
  daysToNextPeriod,
  fertileStartDay,
  fertileEndDay,
}: CycleLineProps) {
  if (!day || !length) return null;

  const todayLeft = pct(day - 0.5, length);
  const label = nextPeriodLabel(daysToNextPeriod);

  const hasFertile = fertileStartDay != null && fertileEndDay != null;
  const bandLeft = hasFertile ? pct(fertileStartDay - 1, length) : 0;
  const bandWidth = hasFertile ? pct(fertileEndDay, length) - bandLeft : 0;

  return (
    <div className="px-6 pt-2 pb-4">
      <div className="bg-white dark:bg-[#1C1C1E] rounded-[14px] px-5 py-5">
        <div className="flex items-baseline justify-between mb-4">
          <span className="text-[13px] font-semibold text-zinc-900 dark:text-zinc-100">
            Cycle day {day}
          </span>
          {label && (
            <span className="text-[13px] font-medium text-zinc-400 dark:text-zinc-500">
              {label}
            </span>
          )}
        </div>

        <div className="relative h-4 mx-0.5">
          {/* track */}
          <div className="absolute top-[6px] left-0 right-0 h-1 rounded-full bg-zinc-200 dark:bg-zinc-700/60" />

          {/* fertile window tint */}
          {hasFertile && bandWidth > 0 && (
            <div
              className="absolute top-[6px] h-1 rounded-full bg-red-500/20 dark:bg-red-500/25"
              style={{ left: `${bandLeft}%`, width: `${bandWidth}%` }}
            />
          )}

          {/* today marker */}
          <div
            className="absolute top-0 -translate-x-1/2 w-4 h-4 rounded-full bg-white dark:bg-[#1C1C1E] border border-zinc-200 dark:border-zinc-700 flex items-center justify-center"
            style={{ left: `${todayLeft}%` }}
          >
            <div className="w-1.5 h-1.5 rounded-full bg-[#007AFF]" />
          </div>
        </div>
      </div>
    </div>
  );
}
