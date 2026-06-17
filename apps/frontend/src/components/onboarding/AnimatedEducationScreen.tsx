import * as React from 'react';
import { cn } from '@/lib/utils';
import { BrandTitle } from '@/components/common/BrandTitle';
import { OnboardingSkipLink } from './OnboardingSkipLink';

interface AnimatedEducationItem {
  title: string;
  desc: string;
  icon?: any;
  colorClass?: string;
}

interface AnimatedEducationScreenProps {
  title: string;
  items: AnimatedEducationItem[];
  onComplete: () => void;
  /** Disables the button and shows a spinner label while an async action runs. */
  busy?: boolean;
  /** Error message shown above the button; presence flips the label to "Try again". */
  error?: string | null;
  ctaLabel?: string;
  /** When provided, renders a subtle "Skip for now" link beneath the CTA. */
  onSkip?: () => void;
}

export function AnimatedEducationScreen({
  title,
  items,
  onComplete,
  busy = false,
  error = null,
  ctaLabel = 'Continue',
  onSkip,
}: AnimatedEducationScreenProps) {
  // The content items slide in with a quick, gentle stagger. The CTA and skip
  // link are intentionally NOT gated behind this — they're visible and tappable
  // from the first frame so an impatient user never waits on the animation.
  const [revealed, setRevealed] = React.useState(false);

  React.useEffect(() => {
    // Flip on the next frame so the initial (hidden) state paints first and the
    // transition actually runs. Reduced-motion users are handled in CSS below.
    const id = requestAnimationFrame(() => setRevealed(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background animate-in fade-in duration-300 motion-reduce:animate-none">
      <div className="z-50 flex flex-shrink-0 items-center justify-center pt-8 pb-4">
        <BrandTitle />
      </div>

      {/* Scrollable hero/content — centered, and only scrolls if a very short
          viewport can't fit it. The CTA below stays pinned and always reachable. */}
      <div className="min-h-0 flex-1 overflow-y-auto px-6">
        <div className="mx-auto flex min-h-full w-full max-w-md flex-col justify-center gap-8 py-4">
          <div className="space-y-6 text-center">
            {/* App logo hero — same treatment as the consent screen for a consistent
                flow. Hidden on very short screens to keep everything on one page. */}
            <div className="short-hide flex justify-center">
              <div className="relative">
                <div className="absolute inset-0 rounded-full bg-rose-500/10 blur-2xl" />
                <div className="relative flex h-24 w-24 items-center justify-center transition-transform duration-500 hover:scale-105">
                  <img
                    src="/logo.png"
                    alt="App Logo"
                    className="h-full w-full object-contain drop-shadow-2xl"
                  />
                </div>
              </div>
            </div>
            <h2 className="text-[34px] font-bold leading-tight tracking-tight text-zinc-900 dark:text-zinc-100 short-text-lg">
              {title}
            </h2>
          </div>

          <div className="space-y-6 pl-2">
            {items.map((item, index) => {
              const Icon = item.icon;
              return (
                <div
                  key={index}
                  style={{ transitionDelay: `${60 + index * 110}ms` }}
                  className={cn(
                    'flex transform items-start gap-5 transition-all duration-500 ease-out motion-reduce:translate-y-0 motion-reduce:opacity-100 motion-reduce:transition-none',
                    revealed ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'
                  )}
                >
                  {Icon && (
                    <div
                      className={cn(
                        'mt-1 flex h-12 w-12 shrink-0 items-center justify-center rounded-xl',
                        item.colorClass || 'bg-[#007aff]/10 text-[#007aff]'
                      )}
                    >
                      <Icon className="h-6 w-6" strokeWidth={2.5} />
                    </div>
                  )}
                  <div className="space-y-1">
                    <h3 className="text-[19px] font-bold text-zinc-900 dark:text-zinc-100">
                      {item.title}
                    </h3>
                    <p className="text-[16px] leading-relaxed text-zinc-500 dark:text-zinc-400">
                      {item.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Pinned footer — primary CTA and skip are available immediately so the
          user never has to wait for the content reveal to finish. */}
      <div className="mx-auto w-full max-w-md flex-shrink-0 space-y-4 px-6 pt-2 pb-8">
        {error && (
          <p className="text-center text-[15px] text-red-500" role="alert">
            {error}
          </p>
        )}
        <button
          onClick={onComplete}
          disabled={busy}
          className="h-14 w-full rounded-xl bg-[#007aff] text-[17px] font-semibold text-white shadow-lg shadow-blue-500/20 transition-all hover:bg-[#0051d5] active:scale-[0.98] disabled:pointer-events-none disabled:opacity-60"
        >
          {busy ? 'Setting up…' : error ? 'Try again' : ctaLabel}
        </button>
        {onSkip && <OnboardingSkipLink onClick={onSkip} disabled={busy} />}
      </div>
    </div>
  );
}
