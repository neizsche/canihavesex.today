import * as React from 'react';
import { cn } from '@/lib/utils';
import { OnboardingFrame, onboardingPrimaryButton } from './OnboardingFrame';

export interface EducationItem {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  title: string;
  desc: string;
}

/**
 * Step 2 — teach, once. The single education screen: the differentiator, three
 * rows with icons that slide in with a gentle stagger. The CTA below is tappable
 * from the first frame, so an impatient user never waits on the animation.
 */
export function OnboardingEducation({
  title,
  items,
  onContinue,
}: {
  title: string;
  items: EducationItem[];
  onContinue: () => void;
}) {
  const [revealed, setRevealed] = React.useState(false);

  React.useEffect(() => {
    // Flip on the next frame so the hidden state paints first and the transition
    // actually runs. Reduced-motion users are handled by the classes below.
    const id = requestAnimationFrame(() => setRevealed(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <OnboardingFrame
      stepIndex={1}
      footer={
        <button onClick={onContinue} className={onboardingPrimaryButton}>
          Continue
        </button>
      }
    >
      <div className="mx-auto flex min-h-full w-full max-w-md flex-col justify-center gap-9 py-4">
        <h1 className="text-[32px] font-extrabold leading-[1.1] tracking-[-0.045em] text-zinc-900 dark:text-white short-text-lg">
          {title}
        </h1>

        <div className="space-y-7">
          {items.map((item, index) => {
            const Icon = item.icon;
            return (
              <div
                key={index}
                style={{ transitionDelay: `${60 + index * 110}ms` }}
                className={cn(
                  'flex transform items-start gap-4 transition-all duration-500 ease-out motion-reduce:translate-y-0 motion-reduce:opacity-100 motion-reduce:transition-none',
                  revealed ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'
                )}
              >
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
      </div>
    </OnboardingFrame>
  );
}
