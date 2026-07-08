import * as React from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  TILE_LABEL,
  SEGMENT_TRACK,
  SEGMENT_ITEM,
  SEGMENT_ON,
  SEGMENT_OFF,
  SEGMENT_TEXT_NEUTRAL,
  CHIP,
  OPTION_IDLE,
} from './logStyles';

type Option = { id: string; label: string };

/**
 * Icon tile + field label, shared by every row in the log form. `iconWrapClass`
 * is a complete tile token from logStyles (e.g. `TILE.bleeding`).
 */
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
      <div className={iconWrapClass}>
        <Icon className={iconClass} />
      </div>
      <span className={TILE_LABEL}>{label}</span>
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
    <div className={SEGMENT_TRACK}>
      {options.map((opt) => (
        <button
          key={opt.id}
          onClick={() => onChange(value === opt.id ? null : opt.id)}
          className={cn(
            SEGMENT_ITEM,
            value === opt.id ? `${SEGMENT_ON} ${SEGMENT_TEXT_NEUTRAL}` : SEGMENT_OFF
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
          className={cn(CHIP, selected.includes(opt.id) ? activeClass : OPTION_IDLE)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
