import { ChevronRight } from 'lucide-react';

export function TodayLogPromptState({
  lostTrack,
  reanchor,
  reanchorPending,
  onLogToday,
  onStillNoPeriod,
  onPauseTracking,
}: {
  lostTrack: boolean;
  reanchor?: { show?: boolean; acked?: boolean };
  reanchorPending: boolean;
  onLogToday: () => void;
  onStillNoPeriod: () => void;
  onPauseTracking: () => void;
}) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
      <img
        src="/logo.png"
        alt="App Logo"
        width={80}
        height={80}
        decoding="sync"
        fetchPriority="high"
        className="w-20 h-20 object-contain mix-blend-multiply dark:mix-blend-normal mb-8"
      />

      <h1 className="text-[30px] font-extrabold tracking-[-0.04em] text-zinc-900 dark:text-white leading-[1.1]">
        How are you
        <br />
        feeling today?
      </h1>

      <p className="text-[15px] text-zinc-400 dark:text-zinc-600 mt-3 max-w-[230px] leading-relaxed">
        {reanchor?.acked
          ? "Still waiting on your period — we'll keep today open."
          : lostTrack
            ? "You're past your usual cycle length. Log today to refresh your predictions."
            : "Log your symptoms to see today's fertility status."}
      </p>

      <button
        onClick={onLogToday}
        className="mt-8 px-9 py-3.5 rounded-full bg-white dark:bg-[#1C1C1E] border border-zinc-200 dark:border-zinc-800 text-[15px] font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2 active:scale-[0.98] transition-transform"
      >
        Log Today
        <ChevronRight className="h-4 w-4 text-zinc-400 dark:text-zinc-600" />
      </button>

      {reanchor?.show && (
        <div className="mt-5 flex items-center justify-center gap-4">
          <button
            onClick={onStillNoPeriod}
            disabled={reanchorPending}
            className="text-[13px] font-medium text-[#007AFF] dark:text-[#0A84FF] active:opacity-70 disabled:opacity-60 transition-opacity"
          >
            Still no period
          </button>
          <span className="w-px h-3 bg-zinc-300 dark:bg-zinc-700" />
          <button
            onClick={onPauseTracking}
            disabled={reanchorPending}
            className="text-[13px] font-medium text-zinc-400 dark:text-zinc-500 active:opacity-70 disabled:opacity-60 transition-opacity"
          >
            Pause tracking
          </button>
        </div>
      )}
    </div>
  );
}
