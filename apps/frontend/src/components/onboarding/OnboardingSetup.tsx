import * as React from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { OnboardingFrame, onboardingPrimaryButton } from './OnboardingFrame';
import { OnboardingSkipLink } from './OnboardingSkipLink';

interface OnboardingSetupProps {
  regularity?: 'regular' | 'irregular' | 'unsure' | null;
  cycleLength?: number;
  onUpdate: (data: { regularity?: 'regular' | 'irregular' | 'unsure'; cycleLength?: number }) => void;
  onContinue: () => void;
  onSkip?: () => void;
  skipBusy?: boolean;
}

const REGULARITY = [
  { id: 'regular', label: 'Regular', desc: 'Varies less than a week' },
  { id: 'irregular', label: 'Irregular', desc: 'Varies a lot' },
  { id: 'unsure', label: 'Not sure', desc: "I'll learn as I log" },
] as const;

/**
 * Step 3 — the only input. Deliberately minimal: two grouped cards, one accent
 * color, no section chrome. The engine only needs a rough regularity + average
 * length for its cold start; everything else is refined from real logs.
 */
export function OnboardingSetup({
  regularity,
  cycleLength = 28,
  onUpdate,
  onContinue,
  onSkip,
  skipBusy,
}: OnboardingSetupProps) {
  return (
    <OnboardingFrame
      stepIndex={2}
      footer={
        <>
          <button onClick={onContinue} className={onboardingPrimaryButton}>
            Continue
          </button>
          {onSkip && <OnboardingSkipLink onClick={onSkip} disabled={skipBusy} />}
        </>
      }
    >
      <div className="mx-auto flex min-h-full w-full max-w-md flex-col justify-center gap-8 py-4">
        <div className="space-y-2">
          <h1 className="text-[32px] font-extrabold leading-[1.1] tracking-[-0.045em] text-zinc-900 dark:text-white">
            Tell us about your cycle
          </h1>
          <p className="text-[15px] leading-relaxed text-zinc-500 dark:text-zinc-400">
            Two quick details. We refine everything from your logs.
          </p>
        </div>

        {/* Regularity — a clean grouped list, one row selected. */}
        <div className="divide-y divide-border/40 overflow-hidden rounded-2xl border border-border/30 bg-card">
          {REGULARITY.map((opt) => {
            const active = regularity === opt.id;
            return (
              <button
                key={opt.id}
                onClick={() => onUpdate({ regularity: opt.id })}
                className={cn(
                  'flex w-full items-center justify-between px-4 py-3.5 text-left transition-colors',
                  active ? 'bg-accent/[0.06]' : 'active:bg-muted/60'
                )}
              >
                <div className="flex flex-col">
                  <span
                    className={cn(
                      'text-[17px]',
                      active
                        ? 'font-semibold text-accent'
                        : 'text-zinc-900 dark:text-zinc-100'
                    )}
                  >
                    {opt.label}
                  </span>
                  <span className="text-[13px] text-zinc-500 dark:text-zinc-400">{opt.desc}</span>
                </div>
                {active && (
                  <Check
                    className="h-5 w-5 shrink-0 text-accent"
                    strokeWidth={2.5}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Cycle length — a single average; inline readout, no big display. */}
        <div className="rounded-2xl border border-border/30 bg-card px-5 py-5">
          <div className="flex items-baseline justify-between">
            <span className="text-[15px] font-medium text-zinc-700 dark:text-zinc-300">
              Typical cycle length
            </span>
            <span className="flex items-baseline gap-1">
              <span className="text-[28px] font-bold leading-none tabular-nums text-zinc-900 dark:text-zinc-100">
                {cycleLength}
              </span>
              <span className="text-[14px] font-medium text-zinc-400">days</span>
            </span>
          </div>
          <input
            type="range"
            min={21}
            max={35}
            value={cycleLength}
            onChange={(e) => onUpdate({ cycleLength: Number(e.target.value) })}
            className="mt-4 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-zinc-200 accent-[rgb(var(--accent))] dark:bg-zinc-700"
          />
          <p className="mt-3 text-[13px] leading-relaxed text-zinc-400 dark:text-zinc-500">
            Not sure? 28 days is typical.
          </p>
        </div>
      </div>
    </OnboardingFrame>
  );
}
