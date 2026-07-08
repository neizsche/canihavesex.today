import * as React from 'react';
import { onboardingPrimaryButton, type OnboardingStepView } from './OnboardingFrame';

export interface EducationItem {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  title: string;
  desc: string;
}

/**
 * Step 2 — teach, once. The single education screen: the differentiator, three
 * rows with icons. Entrance motion is owned by the frame, so the heading and all
 * three rows rise together as one calm block rather than staggering in.
 */
export function educationStep({
  title,
  items,
  onContinue,
}: {
  title: string;
  items: EducationItem[];
  onContinue: () => void;
}): OnboardingStepView {
  return {
    contentClassName: 'gap-8 py-4',
    content: (
      <>
        <h1 className="text-[32px] font-extrabold leading-[1.1] tracking-[-0.045em] text-zinc-900 dark:text-white short-text-lg">
          {title}
        </h1>

        <div className="space-y-6">
          {items.map((item, index) => {
            const Icon = item.icon;
            return (
              <div key={index} className="flex items-start gap-4">
                <div className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#0a84ff]/10 text-[#007aff] dark:text-[#0a84ff]">
                  <Icon className="h-[22px] w-[22px]" strokeWidth={2.25} />
                </div>
                <div className="space-y-1 pt-0.5">
                  <h3 className="text-[18px] font-bold leading-snug text-zinc-900 dark:text-zinc-100">
                    {item.title}
                  </h3>
                  <p className="text-[15px] leading-relaxed text-zinc-500 dark:text-zinc-400">
                    {item.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </>
    ),
    footer: (
      <button onClick={onContinue} className={onboardingPrimaryButton}>
        Continue
      </button>
    ),
  };
}
