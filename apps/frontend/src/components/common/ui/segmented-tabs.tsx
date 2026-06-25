import * as React from 'react';
import { cn } from '@/lib/utils';

export interface SegmentedTabOption<T extends string> {
  value: T;
  label: string;
}

interface SegmentedTabsProps<T extends string> {
  tabs: SegmentedTabOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}

/**
 * iOS-style segmented control. Equal-width pills inside a tinted track; the
 * active pill lifts onto a white surface. Used for the chart screen's
 * Calendar / Stats / Data switch, but intentionally generic.
 */
export function SegmentedTabs<T extends string>({
  tabs,
  value,
  onChange,
  className,
}: SegmentedTabsProps<T>) {
  return (
    <div className={cn('flex gap-2 bg-zinc-100 dark:bg-zinc-900 rounded-2xl p-1', className)}>
      {tabs.map((tab) => (
        <button
          key={tab.value}
          onClick={() => onChange(tab.value)}
          className={cn(
            'flex-1 px-4 py-2.5 rounded-xl text-[15px] font-semibold transition-all duration-200',
            value === tab.value
              ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm'
              : 'text-zinc-500 dark:text-zinc-400'
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
