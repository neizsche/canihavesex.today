import * as React from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

type Option = { id: string; label: string };

/** Icon tile + field label, shared by every row in the log form. */
export function FieldHeader({
  icon: Icon,
  iconWrapClass,
  iconClass = 'icon-sm text-white',
  label,
}: {
  icon: LucideIcon;
  iconWrapClass: string;
  iconClass?: string;
  label: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className={cn('w-7 h-7 flex items-center justify-center', iconWrapClass)}>
        <Icon className={iconClass} />
      </div>
      <span className="text-[17px] text-zinc-900 dark:text-white font-medium">{label}</span>
    </div>
  );
}

/**
 * Single-select segmented pill row. Tapping the active option clears it
 * (`null`), matching the log form's "optional" semantics.
 */
export function PillGroup({
  options,
  value,
  onChange,
}: {
  options: ReadonlyArray<Option>;
  value: string | null;
  onChange: (value: string | null) => void;
}) {
  return (
    <div className="flex bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl">
      {options.map((opt) => (
        <button
          key={opt.id}
          onClick={() => onChange(value === opt.id ? null : opt.id)}
          className={cn(
            'flex-1 py-1.5 rounded-[9px] text-[13px] font-semibold transition-all shadow-sm',
            value === opt.id
              ? 'bg-white dark:bg-zinc-600 text-zinc-900 dark:text-white shadow-sm ring-1 ring-black/5'
              : 'text-zinc-500 dark:text-zinc-400 shadow-none bg-transparent'
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

/** Multi-select chip row. `activeClass` styles the selected state per group. */
export function ChipGroup({
  options,
  selected,
  onToggle,
  activeClass,
}: {
  options: ReadonlyArray<Option>;
  selected: string[];
  onToggle: (id: string) => void;
  activeClass: string;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <button
          key={opt.id}
          onClick={() => onToggle(opt.id)}
          className={cn(
            'py-1.5 px-3 rounded-full text-[13px] font-medium border transition-all shadow-sm',
            selected.includes(opt.id)
              ? activeClass
              : 'bg-white dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800'
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
