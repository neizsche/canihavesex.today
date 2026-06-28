import { ChevronRight, Pause } from 'lucide-react';

export function TodayPausedState({ onLogToday }: { onLogToday: () => void }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
      <div className="w-16 h-16 rounded-full bg-white dark:bg-[#1C1C1E] border border-zinc-200 dark:border-zinc-800 flex items-center justify-center mb-7">
        <Pause className="h-7 w-7 text-zinc-400 dark:text-zinc-500" strokeWidth={2.5} />
      </div>

      <h1 className="text-[30px] font-extrabold tracking-[-0.04em] text-zinc-900 dark:text-white leading-[1.1]">
        Tracking paused
      </h1>

      <p className="text-[15px] text-zinc-400 dark:text-zinc-600 mt-3 max-w-[270px] leading-relaxed">
        Predictions are off while you're on a break. Log a period and we'll pick back up.
      </p>

      <button
        onClick={onLogToday}
        className="mt-8 px-9 py-3.5 rounded-full bg-white dark:bg-[#1C1C1E] border border-zinc-200 dark:border-zinc-800 text-[17px] font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2 active:scale-[0.98] transition-transform"
      >
        Log Today
        <ChevronRight className="h-4 w-4 text-zinc-400 dark:text-zinc-600" />
      </button>
    </div>
  );
}
