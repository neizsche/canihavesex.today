import * as React from 'react';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface ToggleTileProps {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  icon: LucideIcon;
  activeBgClass: string; // e.g. "bg-pink-500/10"
  activeTextClass: string; // e.g. "text-pink-500"
  disabled?: boolean;
  onHelp?: () => void;
}

import { useLongPress } from '@/components/common/hooks/useLongPress';

export function ToggleTile({
  label,
  checked,
  onChange,
  icon: Icon,
  activeBgClass,
  activeTextClass,
  disabled = false,
  onHelp,
}: ToggleTileProps) {
  const longPressProps = useLongPress(() => onHelp?.(), 600);

  const activeStyle = checked
    ? `${activeBgClass} ${activeTextClass} border-transparent shadow-sm scale-[1.02]`
    : 'bg-muted/10 border-transparent hover:bg-muted/20 text-muted-foreground';

  return (
    <button
      disabled={disabled}
      onClick={() => {
        // If onHelp was just triggered, useLongPress would have cleared the timer
        // We can check if it's still active or just rely on the fact that longPress
        // typically triggers BEFORE the click if held, but click fires on release.
        // However, standard browser behavior is that if a pointer event is handled,
        // click might still fire.
        onChange(!checked);
      }}
      {...longPressProps}
      onContextMenu={(e) => {
        if (onHelp) {
          e.preventDefault();
          onHelp();
        }
      }}
      className={cn(
        'flex flex-col items-center justify-center p-2 rounded-2xl border transition-all duration-300 ease-out aspect-square group active:scale-[0.95] disabled:opacity-50 disabled:scale-100 disabled:cursor-not-allowed relative select-none',
        activeStyle
      )}
    >
      <div
        className={cn(
          'w-[calc(2rem*var(--scale-factor))] h-[calc(2rem*var(--scale-factor))] rounded-full flex items-center justify-center mb-1 transition-colors duration-300',
          checked
            ? activeBgClass
            : 'bg-muted/20 text-muted-foreground group-hover:bg-muted/30 group-hover:text-foreground'
        )}
      >
        <Icon className={cn('icon-md')} strokeWidth={2.5} />
      </div>
      <span
        className={cn(
          'text-[calc(10px*var(--font-scale))] font-bold leading-tight text-center tracking-tight transition-colors duration-300',
          checked ? activeTextClass : 'text-muted-foreground group-hover:text-foreground'
        )}
      >
        {label}
      </span>
    </button>
  );
}
