import * as React from 'react';
import { GraduationCap } from 'lucide-react';

import { Button } from '@/components/common/ui/button';
import { LOG_SCREEN_LABELS } from './LogScreen.config';

interface LogCoachSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * One-time educational sheet teaching correct symptothermal logging technique.
 * Auto-opens on the user's first visit to the log screen (gated in LogScreen via
 * localStorage) and is re-openable from the "How to log" CTA. Backdrop + slide
 * animation mirror {@link ActionSheet}.
 */
export function LogCoachSheet({ isOpen, onClose }: LogCoachSheetProps) {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    if (isOpen) {
      setMounted(true);
    } else {
      const timer = setTimeout(() => setMounted(false), 200);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!mounted && !isOpen) return null;

  const { coach } = LOG_SCREEN_LABELS;

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-end justify-center sm:items-center transition-opacity duration-300 ${
        isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={onClose} />

      <div
        className={`w-full max-w-md relative transition-transform duration-300 ease-out transform ${
          isOpen ? 'translate-y-0' : 'translate-y-10'
        }`}
      >
        <div className="bg-white dark:bg-[#1C1C1E] rounded-t-3xl sm:rounded-3xl sm:mx-4 shadow-2xl flex flex-col max-h-[85vh]">
          {/* Header */}
          <div className="px-6 pt-7 pb-4 flex flex-col items-center text-center shrink-0">
            <div className="w-12 h-12 rounded-full bg-blue-500/10 dark:bg-blue-400/10 flex items-center justify-center mb-3">
              <GraduationCap className="icon-md text-blue-600 dark:text-blue-400" />
            </div>
            <h2 className="text-[20px] font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
              {coach.title}
            </h2>
            <p className="text-[13px] text-zinc-500 dark:text-zinc-400 mt-1 leading-snug">
              {coach.intro}
            </p>
          </div>

          {/* Steps */}
          <div className="px-6 pb-2 overflow-y-auto no-scrollbar space-y-4">
            {coach.steps.map((step) => (
              <div key={step.title} className="flex flex-col gap-1">
                <h3 className="text-[15px] font-semibold text-zinc-900 dark:text-zinc-100">
                  {step.title}
                </h3>
                <p className="text-[13px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
                  {step.body}
                </p>
              </div>
            ))}
          </div>

          {/* Dismiss */}
          <div className="px-6 pt-4 pb-8 shrink-0">
            <Button
              onClick={onClose}
              className="w-full h-12 text-[17px] font-semibold bg-[#007AFF] hover:bg-[#0066D6] text-white rounded-xl shadow-sm transition-all active:scale-[0.98]"
            >
              {coach.dismiss}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
