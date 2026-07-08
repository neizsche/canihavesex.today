import * as React from 'react';
import { onboardingPrimaryButton, type OnboardingStepView } from './OnboardingFrame';

/**
 * Step 1 — orient. A single promise and one action. The brand mark in the frame
 * header carries identity, so there's no separate logo hero to repeat.
 */
export function welcomeStep({ onContinue }: { onContinue: () => void }): OnboardingStepView {
  return {
    contentClassName: 'gap-5 text-center',
    content: (
      <>
        <h1 className="text-[40px] font-extrabold leading-[1.05] tracking-[-0.05em] text-zinc-900 dark:text-white">
          Know your
          <br />
          fertile days.
        </h1>
        <p className="mx-auto max-w-[300px] text-[16px] leading-relaxed text-zinc-500 dark:text-zinc-400">
          Your period and fertility, read from your body — not just a calendar.
        </p>
      </>
    ),
    footer: (
      <>
        <button onClick={onContinue} className={onboardingPrimaryButton}>
          Get started
        </button>
        <p className="mx-auto max-w-[300px] text-center text-[13px] leading-relaxed text-muted-foreground">
          Estimates based on your data — not medical advice or birth control.
        </p>
      </>
    ),
  };
}
