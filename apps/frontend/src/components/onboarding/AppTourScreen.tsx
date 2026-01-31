import * as React from 'react';
import { Sparkles, PencilLine, TrendingUp, Settings } from 'lucide-react';

import { BrandTitle } from '../common/BrandTitle';
import { cn } from '../../lib/utils';
import { useSwipe } from '../common/hooks/useSwipe';

type IconType = React.ComponentType<{ className?: string; strokeWidth?: number }>;

type TourSlide = {
  id: 'today' | 'log' | 'chart' | 'settings';
  title: string;
  description: string;
  accent: string;
  accentSoft: string;
  icon: IconType;
};

const TOUR_SLIDES: TourSlide[] = [
  {
    id: 'today',
    title: 'Today, at a glance',
    description: 'Your daily fertility status and insights, distilled into a single focused view.',
    accent: '#0A84FF',
    accentSoft: 'rgba(10, 132, 255, 0.14)',
    icon: Sparkles,
  },
  {
    id: 'log',
    title: 'Log in seconds',
    description: 'Capture temperature, mucus, LH, and notes with quick, one-tap inputs.',
    accent: '#FF2D55',
    accentSoft: 'rgba(255, 45, 85, 0.14)',
    icon: PencilLine,
  },
  {
    id: 'chart',
    title: 'Trends that matter',
    description: 'See your calendar and cycle stats evolve with clean, readable charts.',
    accent: '#34C759',
    accentSoft: 'rgba(52, 199, 89, 0.14)',
    icon: TrendingUp,
  },
  {
    id: 'settings',
    title: 'Fine-tune your experience',
    description: 'Adjust cycle settings, export data, and manage privacy with clarity.',
    accent: '#8E8E93',
    accentSoft: 'rgba(142, 142, 147, 0.18)',
    icon: Settings,
  },
];

interface AppTourScreenProps {
  onComplete: () => void;
  onSkip?: () => void;
}

function PreviewShell({ slide, children }: { slide: TourSlide; children: React.ReactNode }) {
  return (
    <div className="relative mx-auto w-full max-w-sm">
      <div
        className="absolute -inset-6 rounded-[40px] blur-3xl opacity-70"
        style={{ background: slide.accentSoft }}
      />
      <div className="relative aspect-[10/16] w-full rounded-[34px] border border-white/70 dark:border-white/10 bg-white/80 dark:bg-zinc-900/80 shadow-[0_24px_70px_rgba(0,0,0,0.18)] backdrop-blur-xl overflow-hidden">
        <div className="absolute top-3 left-1/2 h-5 w-20 -translate-x-1/2 rounded-full bg-zinc-900/10 dark:bg-white/10" />
        <div className="absolute inset-0 pointer-events-none">
          <div
            className="absolute -top-24 left-1/2 h-44 w-44 -translate-x-1/2 rounded-full blur-3xl"
            style={{ background: slide.accentSoft }}
          />
        </div>
        <div className="relative h-full p-5 flex flex-col gap-4">
          {children}
        </div>
      </div>
    </div>
  );
}

function TodayPreview({ slide }: { slide: TourSlide }) {
  return (
    <PreviewShell slide={slide}>
      <div className="flex items-center justify-between">
        <div className="text-[11px] font-semibold text-zinc-400">Today</div>
        <div
          className="rounded-full px-2.5 py-1 text-[10px] font-semibold"
          style={{ backgroundColor: slide.accentSoft, color: slide.accent }}
        >
          High
        </div>
      </div>
      <div className="flex-1 flex flex-col justify-center gap-4">
        <div className="rounded-2xl p-4" style={{ backgroundColor: slide.accentSoft }}>
          <div className="text-[11px] text-zinc-500">Fertility status</div>
          <div className="mt-1 text-[20px] font-semibold" style={{ color: slide.accent }}>
            Highly fertile
          </div>
          <div className="mt-3 h-2 rounded-full bg-white/60">
            <div className="h-2 rounded-full" style={{ backgroundColor: slide.accent, width: '68%' }} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="h-16 rounded-xl bg-zinc-100/80 dark:bg-white/5" />
          <div className="h-16 rounded-xl bg-zinc-100/80 dark:bg-white/5" />
        </div>
      </div>
      <div className="flex items-center justify-between text-[10px] text-zinc-400">
        <span>Insights</span>
        <span>Swipe</span>
      </div>
    </PreviewShell>
  );
}

function LogPreview({ slide }: { slide: TourSlide }) {
  return (
    <PreviewShell slide={slide}>
      <div className="flex items-center justify-between">
        <div className="text-[11px] font-semibold text-zinc-400">Daily Log</div>
        <div className="text-[10px] font-medium" style={{ color: slide.accent }}>
          Saved
        </div>
      </div>
      <div className="space-y-2">
        {['Temperature', 'Mucus', 'LH Test', 'Notes'].map((label, idx) => (
          <div
            key={label}
            className={cn(
              'flex items-center justify-between rounded-xl px-3 py-2',
              idx === 0 ? 'bg-zinc-100/90 dark:bg-white/10' : 'bg-zinc-100/70 dark:bg-white/5'
            )}
          >
            <div className="text-[11px] text-zinc-600 dark:text-zinc-300">{label}</div>
            <div
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: idx === 0 ? slide.accent : 'rgba(142, 142, 147, 0.5)' }}
            />
          </div>
        ))}
      </div>
      <div
        className="mt-auto h-10 rounded-2xl text-[11px] font-semibold flex items-center justify-center"
        style={{ backgroundColor: slide.accentSoft, color: slide.accent }}
      >
        Save log
      </div>
    </PreviewShell>
  );
}

function ChartPreview({ slide }: { slide: TourSlide }) {
  const days = Array.from({ length: 28 });
  return (
    <PreviewShell slide={slide}>
      <div className="flex items-center justify-between">
        <div className="text-[11px] font-semibold text-zinc-400">Cycle Calendar</div>
        <div className="text-[10px] font-medium" style={{ color: slide.accent }}>
          Feb
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((_, idx) => (
          <div
            key={idx}
            className="h-2 rounded-full"
            style={{
              backgroundColor: idx % 9 === 0 ? slide.accent : idx % 4 === 0 ? slide.accentSoft : 'rgba(209, 213, 219, 0.6)',
            }}
          />
        ))}
      </div>
      <div className="mt-4 rounded-2xl bg-zinc-100/80 dark:bg-white/5 p-3">
        <div className="flex items-end justify-between h-16">
          {[0.4, 0.65, 0.35, 0.8, 0.55].map((val, idx) => (
            <div
              key={idx}
              className="w-3 rounded-full"
              style={{
                height: `${Math.round(val * 60) + 12}px`,
                backgroundColor: idx === 3 ? slide.accent : 'rgba(142, 142, 147, 0.4)',
              }}
            />
          ))}
        </div>
      </div>
      <div className="text-[10px] text-zinc-400">Stats + patterns</div>
    </PreviewShell>
  );
}

function SettingsPreview({ slide }: { slide: TourSlide }) {
  return (
    <PreviewShell slide={slide}>
      <div className="flex items-center justify-between">
        <div className="text-[11px] font-semibold text-zinc-400">Settings</div>
        <div className="text-[10px] font-medium" style={{ color: slide.accent }}>
          Secure
        </div>
      </div>
      <div className="space-y-2">
        {['Cycle settings', 'Export data', 'Privacy', 'Account'].map((label) => (
          <div
            key={label}
            className="flex items-center justify-between rounded-xl bg-zinc-100/80 dark:bg-white/5 px-3 py-2"
          >
            <div className="text-[11px] text-zinc-600 dark:text-zinc-300">{label}</div>
            <div className="h-2 w-2 rounded-full bg-zinc-400/60" />
          </div>
        ))}
      </div>
      <div className="mt-auto flex items-center justify-between rounded-2xl border border-zinc-200/60 dark:border-white/10 px-3 py-2 text-[11px] text-zinc-500">
        <span>Premium</span>
        <span className="font-semibold" style={{ color: slide.accent }}>
          Manage
        </span>
      </div>
    </PreviewShell>
  );
}

function SlidePreview({ slide }: { slide: TourSlide }) {
  if (slide.id === 'today') return <TodayPreview slide={slide} />;
  if (slide.id === 'log') return <LogPreview slide={slide} />;
  if (slide.id === 'chart') return <ChartPreview slide={slide} />;
  return <SettingsPreview slide={slide} />;
}

export function AppTourScreen({ onComplete, onSkip }: AppTourScreenProps) {
  const [index, setIndex] = React.useState(0);
  const activeSlide = TOUR_SLIDES[index];
  const isLast = index === TOUR_SLIDES.length - 1;

  const swipeHandlers = useSwipe({
    onSwipeLeft: () => setIndex((prev) => Math.min(prev + 1, TOUR_SLIDES.length - 1)),
    onSwipeRight: () => setIndex((prev) => Math.max(prev - 1, 0)),
    range: 40,
  });

  const Icon = activeSlide.icon;

  return (
    <div className="fixed inset-0 z-50 bg-background">
      <div className="absolute inset-0 bg-gradient-to-b from-white via-white to-zinc-100 dark:from-black dark:via-black dark:to-zinc-950" />
      <div className="relative h-full flex flex-col">
        <div className="grid grid-cols-3 items-center px-6 pt-6">
          <button
            onClick={() => setIndex((prev) => Math.max(prev - 1, 0))}
            className={cn(
              'text-sm font-medium text-zinc-400 transition-opacity',
              index === 0 && 'opacity-0 pointer-events-none'
            )}
          >
            Back
          </button>
          <div className="flex justify-center">
            <BrandTitle className="text-[18px] text-zinc-900 dark:text-zinc-100" />
          </div>
          <div className="flex justify-end">
            <button
              onClick={onSkip || onComplete}
              className="text-sm font-medium text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
            >
              Skip
            </button>
          </div>
        </div>

        <div className="px-6 pt-2 text-center">
          <div className="text-[11px] uppercase tracking-[0.28em] text-zinc-400">App Tour</div>
          <div className="mt-2 inline-flex items-center gap-2 rounded-full px-3 py-1 text-[12px] font-semibold"
            style={{ backgroundColor: activeSlide.accentSoft, color: activeSlide.accent }}
          >
            <Icon className="h-4 w-4" strokeWidth={2.2} />
            <span>{activeSlide.title}</span>
          </div>
          <p className="mt-3 text-[15px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
            {activeSlide.description}
          </p>
        </div>

        <div className="flex-1 flex flex-col justify-center" {...swipeHandlers}>
          <div className="overflow-hidden">
            <div
              className="flex transition-transform duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)]"
              style={{ transform: `translateX(-${index * 100}%)` }}
            >
              {TOUR_SLIDES.map((slide) => (
                <div key={slide.id} className="w-full shrink-0 px-6 pb-4">
                  <SlidePreview slide={slide} />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="px-6 pb-6">
          <div className="flex items-center justify-center gap-2">
            {TOUR_SLIDES.map((slide, idx) => (
              <button
                key={slide.id}
                onClick={() => setIndex(idx)}
                aria-label={`Go to ${slide.title}`}
                className={cn(
                  'h-2 w-2 rounded-full transition-all',
                  idx === index ? 'bg-zinc-900 dark:bg-white w-6' : 'bg-zinc-300 dark:bg-zinc-700'
                )}
              />
            ))}
          </div>
          <div className="mt-3 text-center text-[11px] text-zinc-400">
            {index + 1} of {TOUR_SLIDES.length}
          </div>
          <button
            onClick={() => (isLast ? onComplete() : setIndex((prev) => Math.min(prev + 1, TOUR_SLIDES.length - 1)))}
            className="mt-4 w-full h-12 rounded-2xl bg-[#007aff] text-white font-semibold text-[16px] transition-all hover:bg-[#0051d5] active:scale-[0.98] shadow-lg shadow-blue-500/20"
          >
            {isLast ? 'Continue' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
}
