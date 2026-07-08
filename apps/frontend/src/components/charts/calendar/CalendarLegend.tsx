import * as React from 'react';

/** Quiet key for the calendar's colour language. Floats on the background. */
export function CalendarLegend() {
  return (
    <div className="mt-6 px-6">
      <div className="flex justify-between max-w-[280px] mx-auto text-[11px] font-medium text-zinc-400 dark:text-zinc-500 tracking-tight">
        <div className="flex flex-col items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-[#ff3b30] dark:bg-[#ff453a]" />
          <span>Period</span>
        </div>
        <div className="flex flex-col items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-[#af52de]/25 dark:bg-[#bf5af2]/30" />
          <span>Fertile</span>
        </div>
        <div className="flex flex-col items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-[#af52de] dark:bg-[#bf5af2]" />
          <span>Ovulation</span>
        </div>
        <div className="flex flex-col items-center gap-1.5">
          <svg
            viewBox="0 0 12 12"
            className="w-2.5 h-2.5 text-[#007aff] dark:text-[#5aa9ff]"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.2}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M2.4 6.3 L4.9 8.8 L9.6 3.4" />
          </svg>
          <span>Logged</span>
        </div>
      </div>
    </div>
  );
}
