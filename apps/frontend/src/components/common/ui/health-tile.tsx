import * as React from 'react';
import { cn } from '@/lib/utils';
import { LucideIcon, Lock, ChevronRight } from 'lucide-react';

interface HealthTileProps {
  title: string;
  description?: string; // Main big value
  sublabel?: string;
  icon?: LucideIcon;
  iconColor?: string;
  className?: string;
  locked?: boolean;
  showLockIcon?: boolean;
  lockLabel?: string;
  date?: string;
  onClick?: () => void;
}

export const HealthTile = React.memo(
  ({
    title,
    description,
    sublabel,
    icon: Icon,
    iconColor = 'text-[#007AFF]', // Default Apple blue
    className,
    locked,
    showLockIcon = true,
    lockLabel = 'PREMIUM',
    date,
    onClick,
  }: HealthTileProps) => {
    return (
      <div
        onClick={locked ? undefined : onClick}
        className={cn(
          'relative w-full bg-white dark:bg-[#1C1C1E] rounded-[20px] p-5 transition-all duration-300 ease-out select-none',
          onClick && !locked ? 'cursor-pointer active:scale-[0.98]' : 'cursor-default',
          className
        )}
      >
        {/* Header: Icon + Title */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {Icon && <Icon className={cn('w-5 h-5', iconColor)} strokeWidth={2.5} />}
            <h3 className="text-[15px] font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 uppercase">
              {title}
            </h3>
          </div>
          {!locked && onClick && (
            <ChevronRight className="w-5 h-5 text-zinc-300 dark:text-zinc-600" />
          )}
        </div>

        {/* Main Content Area */}
        <div className="mt-1">
          {/* Main Hero Text (Value) */}
          {description && (
            <div className="text-[28px] sm:text-[32px] font-bold text-zinc-900 dark:text-white leading-tight tracking-tight">
              {description}
            </div>
          )}

          {/* Sublabel */}
          {sublabel && (
            <p className="text-[15px] font-medium text-zinc-500 dark:text-zinc-400 mt-1">
              {sublabel}
            </p>
          )}

          {/* Date */}
          {date && (
            <p className="text-[13px] font-medium text-zinc-400 dark:text-zinc-500 mt-3 uppercase tracking-wider">
              {date}
            </p>
          )}
        </div>

        {/* Locked Overlay */}
        {locked && showLockIcon && (
          <div className="absolute inset-0 z-20 backdrop-blur-[8px] bg-white/40 dark:bg-black/40 flex flex-col items-center justify-center text-center p-6 rounded-[20px]">
            {/* Small Lock Icon */}
            <div className="w-10 h-10 bg-zinc-100/80 dark:bg-zinc-800/80 backdrop-blur-md rounded-full flex items-center justify-center mb-3">
              <Lock className="w-5 h-5 text-zinc-600 dark:text-zinc-300" strokeWidth={2.5} />
            </div>

            {/* Lock Label/Title */}
            <h3 className="text-[16px] font-bold text-zinc-900 dark:text-white mb-1">
              {lockLabel}
            </h3>

            {/* Description */}
            <p className="text-[13px] text-zinc-600 dark:text-zinc-400 mb-4 max-w-[200px] leading-snug">
              Upgrade for insights
            </p>

            {/* Upgrade Button */}
            <button className="px-5 py-2 bg-[#007AFF] hover:bg-[#0066D6] text-white text-[14px] font-semibold rounded-full transition-all duration-200 active:scale-95 shadow-sm">
              Get Premium
            </button>
          </div>
        )}
      </div>
    );
  }
);

HealthTile.displayName = 'HealthTile';
