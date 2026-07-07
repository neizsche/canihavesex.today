interface CycleLineProps {
  day: number;
  length: number;
  fertileStartDay: number | null;
  fertileEndDay: number | null;
  nextPeriodDateStr: string | null;
  fertileStartDateStr: string | null;
  fertileEndDateStr: string | null;
}

/**
 * The cycle summary as a borderless line that floats on the page background —
 * cycle day, a progress track with the fertile window highlighted, and the two
 * key dates as a footnote. No card, so it shares the zen language of the hero.
 */
export function CycleLine({
  day,
  length,
  fertileStartDay,
  fertileEndDay,
  nextPeriodDateStr,
  fertileStartDateStr,
  fertileEndDateStr,
}: CycleLineProps) {
  if (!day || !length) return null;

  const hasFertile = fertileStartDay != null && fertileEndDay != null;

  // Percentages mapping for 1-indexed cycle progression
  const lengthSpan = Math.max(1, length - 1);
  const progressPercent = Math.min(100, Math.max(0, ((day - 1) / lengthSpan) * 100));

  const fStartPercent = hasFertile ? Math.max(0, ((fertileStartDay - 1) / lengthSpan) * 100) : 0;
  const fEndPercent = hasFertile ? Math.min(100, ((fertileEndDay - 1) / lengthSpan) * 100) : 0;
  const fWidth = hasFertile ? Math.max(0, fEndPercent - fStartPercent) : 0;

  const hasFertileDates = hasFertile && !!fertileStartDateStr && !!fertileEndDateStr;
  const hasNextPeriod = !!nextPeriodDateStr;

  return (
    <div className="px-2 text-center">
      <p className="text-[15px] tracking-[0.01em] text-zinc-500 dark:text-zinc-500">
        Cycle day <span className="font-semibold text-zinc-900 dark:text-white">{day}</span>
      </p>

      <div className="relative mt-6 h-1.5 rounded-full bg-zinc-200 dark:bg-white/15">
        {hasFertile && (
          <div
            className="absolute top-0 h-full rounded-full bg-[#FF3B30]/50 dark:bg-[#FF453A]/50"
            style={{ left: `${fStartPercent}%`, width: `${fWidth}%` }}
          />
        )}

        <div
          className="absolute top-1/2 z-10 -translate-x-1/2 -translate-y-1/2"
          style={{ left: `${progressPercent}%` }}
        >
          <span className="block h-3 w-3 rounded-full bg-zinc-950 ring-4 ring-background dark:bg-white" />
        </div>
      </div>

      {(hasFertileDates || hasNextPeriod) && (
        <p className="mt-6 text-[13.5px] leading-relaxed text-zinc-500 dark:text-zinc-500">
          {hasFertileDates && (
            <>
              Fertile{' '}
              <span className="text-zinc-700 dark:text-zinc-300">
                {fertileStartDateStr} – {fertileEndDateStr}
              </span>
            </>
          )}
          {hasFertileDates && hasNextPeriod && (
            <span className="px-2 text-zinc-300 dark:text-zinc-700">·</span>
          )}
          {hasNextPeriod && (
            <>
              Period <span className="text-zinc-700 dark:text-zinc-300">{nextPeriodDateStr}</span>
            </>
          )}
        </p>
      )}
    </div>
  );
}
