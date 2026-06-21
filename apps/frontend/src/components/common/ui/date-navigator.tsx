import * as React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './button';
import { cn } from '@/lib/utils';

interface DateNavigatorProps {
  label: string;
  sublabel?: string;
  /** Tailwind bg-* class for a status dot shown beside the label (e.g. calendar colour). */
  dotClass?: string;
  onPrev: () => void;
  onNext: () => void;
  prevDisabled?: boolean;
  nextDisabled?: boolean;
}

export function DateNavigator({
  label,
  sublabel,
  dotClass,
  onPrev,
  onNext,
  prevDisabled = false,
  nextDisabled = false,
}: DateNavigatorProps) {
  return (
    <div className="px-4 py-3 mb-4">
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-full bg-card shadow-sm active:scale-95 transition-all"
          onClick={onPrev}
          disabled={prevDisabled}
        >
          <ChevronLeft
            className={cn('icon-md text-zinc-600 dark:text-zinc-400', prevDisabled && 'opacity-30')}
          />
        </Button>

        <div className="flex flex-col items-center">
          <div className="flex items-center gap-2 text-[20px] font-bold tracking-tight text-zinc-900 dark:text-white transition-colors">
            {dotClass && <span className={cn('w-2 h-2 rounded-full', dotClass)} />}
            {label}
          </div>
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-full bg-card shadow-sm active:scale-95 transition-all"
          onClick={onNext}
          disabled={nextDisabled}
        >
          <ChevronRight
            className={cn('icon-md text-zinc-600 dark:text-zinc-400', nextDisabled && 'opacity-30')}
          />
        </Button>
      </div>
    </div>
  );
}
