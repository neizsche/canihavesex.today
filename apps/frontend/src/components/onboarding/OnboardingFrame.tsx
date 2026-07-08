import * as React from 'react';
import { cn } from '@/lib/utils';
import { BrandTitle } from '@/components/common/BrandTitle';

/** Total steps in the flow — drives the header progress dots. */
export const TOTAL_ONBOARDING_STEPS = 4;

/**
 * Flat, system-blue filled action — the same treatment as the sign-in primary
 * button so auth flows straight into onboarding. Depth comes from the color, not
 * a glow (deliberately no drop shadow).
 */
export const onboardingPrimaryButton =
  'h-14 w-full rounded-2xl bg-accent text-[17px] font-semibold text-white ' +
  'transition-all hover:bg-[#0070e0] active:scale-[0.98] ' +
  'disabled:opacity-40 disabled:pointer-events-none';

/** Quiet outline action, used for the optional "Install App" CTA. */
export const onboardingSecondaryButton =
  'flex h-14 w-full items-center justify-center gap-2 rounded-2xl border border-border/60 ' +
  'bg-card text-[17px] font-semibold text-foreground transition-all hover:bg-muted ' +
  'active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none';

function OnboardingDots({ total, active }: { total: number; active: number }) {
  return (
    <div className="flex items-center gap-1.5" aria-hidden="true">
      {Array.from({ length: total }).map((_, i) => (
        <span
          key={i}
          className={cn(
            'h-1.5 rounded-full transition-all duration-300',
            i === active ? 'w-5 bg-zinc-800 dark:bg-zinc-100' : 'w-1.5 bg-zinc-300 dark:bg-zinc-700'
          )}
        />
      ))}
    </div>
  );
}

/** What each step hands the frame: centered content, a pinned footer, and the
 * gap/alignment tuning for its content stack. */
export interface OnboardingStepView {
  content: React.ReactNode;
  footer: React.ReactNode;
  /** Per-step tuning for the content stack (gap, text alignment, padding). */
  contentClassName?: string;
}

/**
 * The single shell for the whole flow — rendered once and kept mounted across
 * every step. The brand mark, progress dots, and footer container never remount,
 * so the active dot glides forward between steps and the CTA holds rock-still.
 * Only the keyed content region swaps, and each step's content settles in with
 * the same gentle rise, giving the flow one unified sense of motion.
 */
export function OnboardingFrame({
  stepIndex,
  contentKey,
  footer,
  children,
  contentClassName,
}: {
  stepIndex: number;
  /** Changing this re-keys the content region so the entrance motion replays. */
  contentKey: React.Key;
  footer: React.ReactNode;
  children: React.ReactNode;
  contentClassName?: string;
}) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background animate-in fade-in duration-300 motion-reduce:animate-none">
      <div className="onboarding-header z-50 !flex-col gap-3">
        <BrandTitle />
        <OnboardingDots total={TOTAL_ONBOARDING_STEPS} active={stepIndex} />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-6">
        <div
          key={contentKey}
          className={cn(
            'mx-auto flex min-h-full w-full max-w-md flex-col justify-center',
            'animate-in fade-in slide-in-from-bottom-2 duration-500 ease-out motion-reduce:animate-none',
            contentClassName
          )}
        >
          {children}
        </div>
      </div>
      <div className="onboarding-footer space-y-3 px-6">{footer}</div>
    </div>
  );
}
