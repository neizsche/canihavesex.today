import * as React from 'react';
import { InsetGroup } from '@/components/common/ui/inset-group';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { OnboardingSkipLink } from './OnboardingSkipLink';

interface OnboardingSetupProps {
  regularity?: 'regular' | 'irregular' | 'unsure' | null;
  cycleLength?: number;
  onUpdate: (data: { regularity?: any; cycleLength?: number }) => void;
  onContinue: () => void;
  onSkip?: () => void;
  skipBusy?: boolean;
}

export function OnboardingSetup({
  regularity,
  cycleLength = 28,
  onUpdate,
  onContinue,
  onSkip,
  skipBusy,
}: OnboardingSetupProps) {
  return (
    <div className="flex h-full w-full flex-col bg-background font-sans">
      {/* Scrollable form region — the Continue button below stays pinned. */}
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pt-4 pb-4">
        <div className="mx-auto max-w-md space-y-6">
          {/* Header Area */}
          <div className="space-y-2 px-4">
            <h1 className="text-[30px] font-extrabold tracking-[-0.04em] text-zinc-900 dark:text-zinc-100 leading-tight">
              About Your Cycle
            </h1>
            <p className="text-[15px] leading-relaxed text-zinc-500 dark:text-zinc-400">
              Quick details for better predictions.
            </p>
          </div>

          <div className="space-y-6">
            {/* 2. Regularity Section */}
            <InsetGroup
              title="Cycle Regularity"
              className="divide-y divide-zinc-200/50 dark:divide-zinc-800/50"
            >
              {[
                { id: 'regular', label: 'Regular', desc: ' varies by <7 days' },
                { id: 'irregular', label: 'Irregular', desc: ' varies widely' },
                { id: 'unsure', label: 'Unsure', desc: " I don't know" },
              ].map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => onUpdate({ regularity: opt.id })}
                  className={cn(
                    'w-full flex items-center justify-between p-4 transition-colors text-left',
                    regularity === opt.id
                      ? 'bg-blue-50/50 dark:bg-blue-900/10'
                      : 'hover:bg-zinc-50 dark:hover:bg-white/5'
                  )}
                >
                  <div className="flex flex-col">
                    <span
                      className={cn(
                        'text-[17px]',
                        regularity === opt.id
                          ? 'font-semibold text-[#007aff]'
                          : 'text-zinc-900 dark:text-zinc-100'
                      )}
                    >
                      {opt.label}
                    </span>
                    <span className="text-[13px] text-muted-foreground">{opt.desc}</span>
                  </div>
                  {regularity === opt.id && (
                    <Check className="w-5 h-5 text-[#007aff]" strokeWidth={2.5} />
                  )}
                </button>
              ))}
            </InsetGroup>
          </div>

          {/* Cycle Length — a single typical value. The engine only needs an
              average for its cold start, so we ask for one number and refine it
              from real logs later. */}
          <div className="space-y-4 pt-2">
            <div className="space-y-1 px-4">
              <h3 className="font-semibold text-[17px] text-zinc-900 dark:text-zinc-100">
                Typical Cycle Length
              </h3>
            </div>
            <InsetGroup>
              <div className="p-6 space-y-5">
                <div className="flex items-baseline justify-center gap-1.5">
                  <span className="text-[44px] font-bold leading-none text-zinc-900 dark:text-zinc-100">
                    {cycleLength}
                  </span>
                  <span className="text-[17px] font-medium text-zinc-500 dark:text-zinc-400">
                    days
                  </span>
                </div>
                <input
                  type="range"
                  min={21}
                  max={35}
                  value={cycleLength}
                  onChange={(e) => onUpdate({ cycleLength: Number(e.target.value) })}
                  className="w-full h-2 bg-zinc-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-[#007aff]"
                />
                <p className="text-center text-[13px] leading-relaxed text-zinc-500 dark:text-zinc-400">
                  Not sure? 28 days is typical — we'll fine-tune it as you log.
                </p>
              </div>
            </InsetGroup>
          </div>
        </div>
      </div>

      {/* Pinned footer — Continue is always visible without scrolling to it. */}
      <div className="onboarding-footer space-y-3 px-4">
        <button
          onClick={onContinue}
          className="h-14 w-full rounded-xl bg-[#007aff] text-[17px] font-semibold text-white shadow-lg shadow-blue-500/20 transition-all hover:bg-[#0051d5] active:scale-[0.98]"
        >
          Continue
        </button>
        {onSkip && <OnboardingSkipLink onClick={onSkip} disabled={skipBusy} />}
      </div>
    </div>
  );
}
