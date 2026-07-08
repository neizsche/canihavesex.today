import { ChevronRight, Pause } from 'lucide-react';

import {
  DISPLAY_HEADING,
  LOG_PILL_BUTTON,
  STATE_CONTAINER,
  STATE_SUBTITLE,
  SURFACE_RAISED,
} from './todayStyles';

export function TodayPausedState({ onLogToday }: { onLogToday: () => void }) {
  return (
    <div className={STATE_CONTAINER}>
      <div className={`w-16 h-16 rounded-full ${SURFACE_RAISED} flex items-center justify-center mb-7`}>
        <Pause className="h-7 w-7 text-zinc-400 dark:text-zinc-500" strokeWidth={2.5} />
      </div>

      <h1 className={DISPLAY_HEADING}>
        Tracking paused
      </h1>

      <p className={`${STATE_SUBTITLE} max-w-[270px]`}>
        Predictions are off while you're on a break. Log a period and we'll pick back up.
      </p>

      <button
        onClick={onLogToday}
        className={LOG_PILL_BUTTON}
      >
        Log Today
        <ChevronRight className="h-4 w-4 text-zinc-400 dark:text-zinc-600" />
      </button>
    </div>
  );
}
