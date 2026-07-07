import { GraduationCap } from 'lucide-react';

import { BottomSheet } from '@/components/common/ui/bottom-sheet';
import { LOG_SCREEN_LABELS } from './LogScreen.config';

interface LogCoachSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * One-time educational sheet teaching correct symptothermal logging technique.
 * Auto-opens on the user's first visit to the log screen (gated in LogScreen via
 * localStorage) and is re-openable from the "How to log" CTA. Renders inside the
 * shared {@link BottomSheet} shell.
 */
export function LogCoachSheet({ isOpen, onClose }: LogCoachSheetProps) {
  const { coach } = LOG_SCREEN_LABELS;

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} actionLabel={coach.dismiss}>
      <div className="flex shrink-0 flex-col items-center px-6 pb-4 pt-7 text-center">
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-blue-500/10 dark:bg-blue-400/10">
          <GraduationCap className="icon-md text-blue-600 dark:text-blue-400" />
        </div>
        <h2 className="text-[20px] font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
          {coach.title}
        </h2>
        <p className="mt-1 text-[13px] leading-snug text-zinc-500 dark:text-zinc-400">
          {coach.intro}
        </p>
      </div>

      <div className="space-y-4 overflow-y-auto no-scrollbar px-6 pb-2">
        {coach.steps.map((step) => (
          <div key={step.title} className="flex flex-col gap-1">
            <h3 className="text-[15px] font-semibold text-zinc-900 dark:text-zinc-100">
              {step.title}
            </h3>
            <p className="text-[13px] leading-relaxed text-zinc-500 dark:text-zinc-400">
              {step.body}
            </p>
          </div>
        ))}
      </div>
    </BottomSheet>
  );
}
