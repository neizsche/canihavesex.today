import * as React from 'react';
import {
  Activity,
  CalendarDays,
  Check,
  ChevronRight,
  Droplets,
  Sparkles,
  Thermometer,
  X,
} from 'lucide-react';
import { InsightType } from '@/lib/mock-data';
import { cn } from '@/lib/utils';

interface InsightPageProps {
  isOpen: boolean;
  onClose: () => void;
  insightType: InsightType | null;
  bgImage?: string;
  shadowColor?: string;
  data?: any;
}

function getStatValue(data: any, label: string, fallback = '—') {
  const stat = data?.stats?.find((item: any) => item.label?.toLowerCase() === label.toLowerCase());
  return stat?.value ?? fallback;
}

function SheetMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[18px] bg-zinc-100/80 px-4 py-3 dark:bg-white/[0.04]">
      <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-zinc-400">{label}</p>
      <p className="mt-1 text-[18px] font-bold leading-tight text-zinc-950 dark:text-white">
        {value}
      </p>
    </div>
  );
}

function SignalRow({ data }: { data: any }) {
  const signals = data?.confidence?.signals || {};
  const items = [
    { key: 'temp', label: 'Temperature', Icon: Thermometer },
    { key: 'lh', label: 'LH test', Icon: Activity },
    { key: 'mucus', label: 'Fluid', Icon: Droplets },
    { key: 'calendar', label: 'Cycle history', Icon: CalendarDays },
  ];

  return (
    <div className="grid grid-cols-2 gap-2">
      {items.map(({ key, label, Icon }) => {
        const active = Boolean(signals[key]);
        return (
          <div
            key={key}
            className={cn(
              'flex items-center gap-2 rounded-[16px] border px-3 py-2.5 text-[13px] font-semibold',
              active
                ? 'border-zinc-200 bg-white text-zinc-800 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100'
                : 'border-dashed border-zinc-200 text-zinc-400 dark:border-zinc-800 dark:text-zinc-600'
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span className="min-w-0 flex-1 truncate">{label}</span>
            {active && <Check className="h-3.5 w-3.5 shrink-0 text-emerald-500" strokeWidth={3} />}
          </div>
        );
      })}
    </div>
  );
}

function MiniCycleTimeline() {
  return (
    <div className="rounded-[22px] bg-zinc-100/80 p-4 dark:bg-white/[0.04]">
      <div className="flex h-2 overflow-hidden rounded-full">
        <div className="w-[22%] bg-rose-400" />
        <div className="w-[36%] bg-sky-400" />
        <div className="w-[10%] bg-violet-400" />
        <div className="w-[32%] bg-emerald-400" />
      </div>
      <div className="relative mt-2 h-4">
        <div className="absolute left-[48%] top-0 h-4 w-4 -translate-x-1/2 rounded-full border-[3px] border-white bg-zinc-950 shadow-sm dark:border-zinc-900 dark:bg-white" />
      </div>
      <div className="mt-1 flex justify-between text-[10px] font-bold uppercase text-zinc-400">
        <span>Period</span>
        <span>Fertile</span>
        <span>Luteal</span>
      </div>
    </div>
  );
}

function InsightNotes({ data }: { data: any }) {
  const notes = data?.notifications?.length ? data.notifications.slice(0, 2) : [];

  if (!notes.length && !data?.sourceText) return null;

  return (
    <div className="space-y-2.5">
      {data?.sourceText && (
        <div className="rounded-[20px] border border-zinc-100 bg-white px-4 py-3 dark:border-white/10 dark:bg-zinc-950">
          <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-zinc-400">
            Why this appears
          </p>
          <p className="mt-1 text-[14px] font-medium leading-relaxed text-zinc-700 dark:text-zinc-300">
            {data.sourceText}
          </p>
        </div>
      )}
      {notes.map((note: string, index: number) => (
        <div
          key={`${note}-${index}`}
          className="flex items-start gap-3 rounded-[20px] border border-zinc-100 bg-white px-4 py-3 dark:border-white/10 dark:bg-zinc-950"
        >
          <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#007AFF]/10 text-[#007AFF]">
            <Sparkles className="h-3.5 w-3.5" />
          </div>
          <p className="text-[14px] font-medium leading-relaxed text-zinc-700 dark:text-zinc-300">
            {note}
          </p>
        </div>
      ))}
    </div>
  );
}

function getSheetCopy(insightType: InsightType, data: any) {
  const card = data?.card || {};
  if (insightType === 'today') {
    return {
      kicker: 'Today',
      title: card.subtitle || 'Daily status',
      subtitle: card.description || 'Cycle day',
    };
  }

  if (insightType === 'cycle-stats') {
    return {
      kicker: 'Cycle',
      title: card.description || 'Cycle stats',
      subtitle: card.subtitle || 'Pattern summary',
    };
  }

  return {
    kicker: 'Insights',
    title: 'Daily highlights',
    subtitle: 'Nutrition and body notes',
  };
}

export function InsightPage({ isOpen, onClose, insightType, data: apiData }: InsightPageProps) {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    if (isOpen) {
      setMounted(true);
      document.body.style.overflow = 'hidden';
    } else {
      const timer = setTimeout(() => setMounted(false), 250);
      document.body.style.overflow = '';
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!mounted && !isOpen) return null;
  if (!insightType) return null;

  const data = apiData || { card: {}, stats: [], notifications: [] };
  const copy = getSheetCopy(insightType, data);
  const confidenceScore = data?.confidence?.score;

  return (
    <div
      className={cn(
        'fixed inset-0 z-[100] flex items-end justify-center transition-opacity duration-300',
        isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
      )}
    >
      <div
        className="absolute inset-0 bg-black/20 backdrop-blur-sm dark:bg-black/45"
        onClick={onClose}
      />

      <div
        className={cn(
          'relative w-full max-w-lg rounded-t-[28px] border border-white/70 bg-[#F8F8FA]/95 px-5 pb-8 pt-3 shadow-[0_-18px_60px_rgba(15,23,42,0.18)] backdrop-blur-2xl transition-transform duration-300 dark:border-white/10 dark:bg-zinc-950/95 sm:mb-6 sm:rounded-[28px]',
          isOpen ? 'translate-y-0' : 'translate-y-full'
        )}
        style={{ maxHeight: '74svh' }}
      >
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-zinc-300/80 dark:bg-zinc-700 sm:hidden" />

        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-zinc-200/80 text-zinc-600 transition active:scale-95 dark:bg-zinc-800 dark:text-zinc-300"
          aria-label="Close insight"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="max-h-[calc(74svh-28px)] overflow-y-auto pb-1">
          <div className="pr-10">
            <p className="text-[12px] font-bold uppercase tracking-[0.12em] text-zinc-400">
              {copy.kicker}
            </p>
            <h2 className="mt-2 text-[30px] font-bold leading-tight tracking-tight text-zinc-950 dark:text-white">
              {copy.title}
            </h2>
            <p className="mt-1 text-[15px] font-semibold text-zinc-500 dark:text-zinc-400">
              {copy.subtitle}
            </p>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-2.5">
            {insightType === 'today' && (
              <>
                <SheetMetric label="Phase" value={getStatValue(data, 'Phase')} />
                <SheetMetric
                  label="Confidence"
                  value={getStatValue(
                    data,
                    'Confidence',
                    confidenceScore ? `${confidenceScore}%` : '—'
                  )}
                />
                <SheetMetric label="Ovulation" value={getStatValue(data, 'Ovulation')} />
                <SheetMetric label="Basis" value={data?.confidence?.label || 'Building'} />
              </>
            )}

            {insightType === 'cycle-stats' && (
              <>
                <SheetMetric label="Variation" value={getStatValue(data, 'Variation')} />
                <SheetMetric label="Logged" value={getStatValue(data, 'Logged')} />
                <SheetMetric label="Period" value={getStatValue(data, 'Period')} />
                <SheetMetric label="Gaps" value={getStatValue(data, 'Gaps')} />
              </>
            )}

            {insightType === 'nutrition' && (
              <>
                <SheetMetric label="Focus" value="Phase support" />
                <SheetMetric label="Personalized" value="With logs" />
              </>
            )}
          </div>

          <div className="mt-5 space-y-5">
            {insightType === 'today' && <SignalRow data={data} />}
            {insightType === 'cycle-stats' && <MiniCycleTimeline />}
            {insightType === 'nutrition' && (
              <div className="rounded-[22px] bg-teal-500/10 px-4 py-4 text-teal-900 dark:text-teal-100">
                <p className="text-[14px] font-semibold leading-relaxed">
                  Nutrition guidance is based on cycle phase and logged body signals, not food
                  tracking.
                </p>
              </div>
            )}

            <InsightNotes data={data} />

            <button
              type="button"
              onClick={onClose}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-zinc-950 px-5 text-[15px] font-bold text-white transition active:scale-[0.99] dark:bg-white dark:text-black"
            >
              Done
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
