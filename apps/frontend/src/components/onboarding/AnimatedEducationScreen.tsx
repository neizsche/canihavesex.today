import * as React from 'react';
import { cn } from '@/lib/utils';
import { BrandTitle } from '@/components/common/BrandTitle';

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
}

export function AnimatedEducationScreen({
  title,
  items,
  onComplete,
  busy = false,
  error = null,
  ctaLabel = 'Continue',
}: AnimatedEducationScreenProps) {
  const [visibleCount, setVisibleCount] = React.useState(0);
  const [showButton, setShowButton] = React.useState(false);

  React.useEffect(() => {
    // Staggered reveal sequence
    const timers: NodeJS.Timeout[] = [];

    // Show item 1 immediately
    timers.push(setTimeout(() => setVisibleCount(1), 400));

    // Show item 2 after delay
    timers.push(setTimeout(() => setVisibleCount(2), 1200));

    // Show item 3 after delay
    timers.push(setTimeout(() => setVisibleCount(3), 2000));

    // Show button after reading time
    timers.push(setTimeout(() => setShowButton(true), 2600));

    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col animate-in fade-in duration-500">
      <div className="flex-shrink-0 pt-8 pb-4 flex items-center justify-center z-50">
        <BrandTitle />
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="min-h-full flex flex-col items-center justify-center px-6 py-8">
          <div className="w-full max-w-md space-y-10">
            <div className="text-center space-y-6">
              {/* App logo hero — same treatment as the consent screen for a consistent flow */}
              <div className="flex justify-center">
                <div className="relative">
                  <div className="absolute inset-0 bg-rose-500/10 blur-2xl rounded-full" />
                  <div className="relative w-24 h-24 flex items-center justify-center transition-transform hover:scale-105 duration-500">
                    <img
                      src="/logo.png"
                      alt="App Logo"
                      className="w-full h-full object-contain drop-shadow-2xl"
                    />
                  </div>
                </div>
              </div>
              <h2 className="text-[34px] font-bold tracking-tight text-zinc-900 dark:text-zinc-100 leading-tight">
                {title}
              </h2>
            </div>

            <div className="space-y-8 pl-2">
              {items.map((item, index) => {
                const Icon = item.icon;
                return (
                  <div
                    key={index}
                    className={cn(
                      'flex items-start gap-5 transition-all duration-700 ease-[cubic-bezier(0.2,0.8,0.2,1)] transform',
                      index < visibleCount ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
                    )}
                  >
                    {Icon && (
                      <div
                        className={cn(
                          'mt-1 shrink-0 w-12 h-12 rounded-xl flex items-center justify-center',
                          item.colorClass || 'bg-[#007aff]/10 text-[#007aff]'
                        )}
                      >
                        <Icon className="w-6 h-6" strokeWidth={2.5} />
                      </div>
                    )}
                    <div className="space-y-1">
                      <h3 className="font-bold text-[19px] text-zinc-900 dark:text-zinc-100">
                        {item.title}
                      </h3>
                      <p className="text-[16px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
                        {item.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div
              className={cn(
                'pt-8 transition-all duration-1000 ease-out transform',
                showButton ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'
              )}
            >
              {error && (
                <p className="mb-3 text-center text-[15px] text-red-500" role="alert">
                  {error}
                </p>
              )}
              <button
                onClick={onComplete}
                disabled={busy}
                className="w-full h-14 rounded-xl bg-[#007aff] text-white font-semibold text-[17px] transition-all hover:bg-[#0051d5] active:scale-[0.98] shadow-lg shadow-blue-500/20 disabled:opacity-60 disabled:pointer-events-none"
              >
                {busy ? 'Setting up…' : error ? 'Try again' : ctaLabel}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
