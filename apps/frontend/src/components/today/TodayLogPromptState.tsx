import { ChevronRight } from 'lucide-react';

import {
  ACCENT_TEXT,
  DISPLAY_HEADING,
  LOG_PILL_BUTTON,
  STATE_CONTAINER,
  STATE_SUBTITLE,
} from './todayStyles';

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
    <div className={STATE_CONTAINER}>
      <img
        src="/assets/logo.png"
        alt="App Logo"
        width={80}
        height={80}
        decoding="sync"
        fetchPriority="high"
        className="w-20 h-20 object-contain mix-blend-multiply dark:mix-blend-normal mb-8"
      />

      <h1 className={DISPLAY_HEADING}>
        How are you
        <br />
        feeling today?
      </h1>

      <p className={`${STATE_SUBTITLE} max-w-[230px]`}>
        {reanchor?.acked
          ? "Still waiting on your period — we'll keep today open."
          : lostTrack
            ? "You're past your usual cycle length. Log today to refresh your predictions."
            : "Log your symptoms to see today's fertility status."}
      </p>

      <button
        onClick={onLogToday}
        className={LOG_PILL_BUTTON}
      >
        Log Today
        <ChevronRight className="h-4 w-4 text-zinc-400 dark:text-zinc-600" />
      </button>

      {reanchor?.show && (
        <div className="mt-5 flex items-center justify-center gap-4">
          <button
            onClick={onStillNoPeriod}
            disabled={reanchorPending}
            className={`text-[13px] font-medium ${ACCENT_TEXT} active:opacity-70 disabled:opacity-60 transition-opacity`}
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
