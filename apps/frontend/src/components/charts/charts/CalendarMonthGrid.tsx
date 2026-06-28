import * as React from 'react';
import { getDayCellVisual, type CalendarDayData } from '@/lib/calendar-cell';
import { CalendarDayCell } from './CalendarDayCell';

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

interface CalendarMonthGridProps {
  year: number;
  month: number;
  /** Weekday index (0-6) the 1st of the month falls on. */
  firstDay: number;
  daysInMonth: number;
  dayMap: Map<string, CalendarDayData>;
  todayStr: string;
  minDateStr: string;
  onSelectDay: (dateIso: string) => void;
}

/** Weekday header + 7-column month grid. Per-cell styling lives in getDayCellVisual. */
export function CalendarMonthGrid({
  year,
  month,
  firstDay,
  daysInMonth,
  dayMap,
  todayStr,
  minDateStr,
  onSelectDay,
}: CalendarMonthGridProps) {
  return (
    <>
      <div className="grid grid-cols-7 text-center mb-3">
        {WEEKDAYS.map((d, idx) => (
          <div
            key={idx}
            className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-600 uppercase tracking-wider"
          >
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-y-1">
        {/* Leading blanks so day 1 lands on its weekday. */}
        {Array.from({ length: firstDay }).map((_, i) => (
          <div key={`empty-${i}`} className="h-12" />
        ))}

        {Array.from({ length: daysInMonth }).map((_, i) => {
          const cell = getDayCellVisual({
            year,
            month,
            dayNum: i + 1,
            col: (firstDay + i) % 7,
            dayMap,
            todayStr,
            minDateStr,
          });
          return <CalendarDayCell key={cell.dayNum} cell={cell} onSelect={onSelectDay} />;
        })}
      </div>
    </>
  );
}
