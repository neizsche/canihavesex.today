import * as React from 'react';
import { cn } from '@/lib/utils';
import type { DayCellVisual } from '@/lib/calendar-cell';

interface CalendarDayCellProps {
  cell: DayCellVisual;
  onSelect: (dateIso: string) => void;
}

/**
 * One day in the month grid. Layers (back to front): the continuous range band,
 * the solid period-start / ovulation pill, the day number, and the logged tick.
 */
export function CalendarDayCell({ cell, onSelect }: CalendarDayCellProps) {
  const { dayNum, dateIso, isFuture, isToday, isRestricted, isPeriodStart, isOvulation } = cell;
  const interactive = !isFuture && !isRestricted;

  return (
    <div
      onClick={() => interactive && onSelect(dateIso)}
      className={cn(
        'relative h-12 flex items-center justify-center group',
        interactive ? 'cursor-pointer' : 'cursor-default',
        isRestricted && 'opacity-40'
      )}
    >
      {/* Continuous range band (period / fertile window). */}
      {cell.bandClass && (
        <div
          className={cn('absolute inset-y-[2px] left-0 right-0', cell.radiusClass, cell.bandClass)}
        />
      )}

      {/* Period-start pill — solid red marker overlaid on the faded band. */}
      {isPeriodStart && (
        <div className="absolute inset-y-[2px] left-0 right-0 bg-[#ff3b30] dark:bg-[#ff453a] rounded-full shadow-sm" />
      )}

      {/* Ovulation marker — solid pill. */}
      {isOvulation && (
        <div className="absolute inset-y-[2px] left-0 right-0 bg-[#af52de] dark:bg-[#bf5af2] rounded-full shadow-sm" />
      )}

      <span
        className={cn(
          'relative z-10 text-[15px] transition-transform duration-300',
          interactive && 'group-hover:scale-110',
          cell.textClass,
          // Today reads as "now" purely via a larger, bolder number — no ring.
          isToday && 'text-[18px] font-bold'
        )}
      >
        {dayNum}
      </span>

      {/* Logged-day tick, tucked into the top of the cell. */}
      {cell.state === 'logged' && (
        <svg
          viewBox="0 0 12 12"
          className={cn(
            'absolute top-[7px] left-1/2 z-20 h-2 w-2 -translate-x-1/2 opacity-60',
            cell.tickClass
          )}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M2.4 6.3 L4.9 8.8 L9.6 3.4" />
        </svg>
      )}
    </div>
  );
}
