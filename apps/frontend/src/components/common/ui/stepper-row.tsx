import * as React from 'react';
import { Minus, Plus } from 'lucide-react';

interface StepperRowProps {
  label: string;
  value: number;
  /** Lower bound (inclusive). Decrementing never goes below this. */
  min: number;
  /** Upper bound (inclusive). Incrementing never goes above this. */
  max: number;
  /** Called with the clamped next value when the user steps up or down. */
  onChange: (value: number) => void;
  /** Unit suffix shown after the value, e.g. "days". */
  unit?: string;
}

/** Label + −/value/+ stepper, clamped to [min, max]. */
export function StepperRow({ label, value, min, max, onChange, unit }: StepperRowProps) {
  return (
    <div className="flex items-center justify-between p-3 px-4">
      <div className="text-[13px] font-medium text-zinc-700 dark:text-zinc-300">{label}</div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => onChange(Math.max(min, value - 1))}
          className="w-7 h-7 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>
        <div className="w-14 text-center font-semibold text-[14px] text-zinc-900 dark:text-zinc-100">
          {value}
          {unit ? ` ${unit}` : ''}
        </div>
        <button
          type="button"
          onClick={() => onChange(Math.min(max, value + 1))}
          className="w-7 h-7 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
