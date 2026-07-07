import { ChevronRight, type LucideIcon } from 'lucide-react';

import { cn } from '@/lib/utils';

/**
 * A quiet, centered "pill" affordance — a bordered capsule with a tinted icon,
 * a label, and a trailing chevron. Shared by the log screen's "How to log" CTA
 * and the Today screen's "Why this reading" entry so the two stay identical.
 */
export function CoachPill({
  icon: Icon,
  label,
  onClick,
  className,
}: {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  className?: string;
}) {
  return (
    <div className={cn('flex justify-center', className)}>
      <button
        onClick={onClick}
        className="group inline-flex items-center gap-2 rounded-full border border-border/40 bg-card/70 py-1.5 pl-2 pr-3 shadow-sm backdrop-blur-xl transition-all hover:bg-card hover:shadow active:scale-95"
      >
        <span className="flex h-[22px] w-[22px] items-center justify-center rounded-full bg-blue-500/10 dark:bg-blue-400/10">
          <Icon className="h-[13px] w-[13px] text-blue-600 dark:text-blue-400" strokeWidth={2.5} />
        </span>
        <span className="text-[13px] font-medium tracking-tight text-zinc-700 dark:text-zinc-200">
          {label}
        </span>
        <ChevronRight className="h-3.5 w-3.5 text-zinc-300 transition-transform duration-200 group-hover:translate-x-0.5 dark:text-zinc-600" />
      </button>
    </div>
  );
}
