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
  'h-14 w-full rounded-2xl bg-[#0a84ff] text-[17px] font-semibold text-white ' +
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

/**
 * The single shell every onboarding step renders into: brand mark + progress
 * dots up top, a vertically-centered (but scrollable on short screens) content
 * region, and a pinned footer where the primary CTA always rests in the same
 * spot. Steps supply their content and footer; the frame keeps pacing identical.
 */
export function OnboardingFrame({
  stepIndex,
  footer,
  children,
  contentClassName,
}: {
  stepIndex: number;
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
      <div className={cn('min-h-0 flex-1 overflow-y-auto px-6', contentClassName)}>{children}</div>
      <div className="onboarding-footer space-y-3 px-6">{footer}</div>
    </div>
  );
}
