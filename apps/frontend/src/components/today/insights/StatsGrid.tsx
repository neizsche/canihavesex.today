import * as React from 'react';
import { History, CalendarCheck, Droplet, AlertCircle } from 'lucide-react';
import { InsightPageData } from '@/lib/mock-data';
import { cn } from '@/lib/utils';

interface StatsGridProps {
  data: InsightPageData;
}

const getStatConfig = (label: string, value: string) => {
  const lowerLabel = label.toLowerCase();

  if (lowerLabel.includes('variation')) {
    return {
      title: 'Cycle Variation',
      icon: History,
      iconColor: 'text-violet-500',
      iconBg: 'bg-violet-500/10 dark:bg-violet-500/15',
      description:
        value === 'None' || value === '±0d' || value === '±1d' || value === '±2d'
          ? 'Highly regular cycle'
          : value.includes('3') || value.includes('4')
            ? 'Consistent length'
            : 'Variable length',
    };
  }

  if (lowerLabel.includes('logged') || lowerLabel.includes('logging')) {
    const rate = parseInt(value) || 0;
    return {
      title: 'Logging Rate',
      icon: CalendarCheck,
      iconColor: 'text-[#007AFF]',
      iconBg: 'bg-[#007AFF]/10 dark:bg-[#007AFF]/15',
      description:
        rate >= 80 ? 'Excellent record' : rate >= 50 ? 'Good consistency' : 'Log daily to improve',
    };
  }

  if (lowerLabel.includes('period') || lowerLabel.includes('flow')) {
    return {
      title: 'Avg Period',
      icon: Droplet,
      iconColor: 'text-rose-500',
      iconBg: 'bg-rose-500/10 dark:bg-rose-500/15',
      description: 'Typical bleeding length',
    };
  }

  if (lowerLabel.includes('gap')) {
    const isNone = value.toLowerCase() === 'none' || value === '0d' || value === '0';
    return {
      title: 'Data Gaps',
      icon: AlertCircle,
      iconColor: isNone ? 'text-emerald-500' : 'text-amber-500',
      iconBg: isNone
        ? 'bg-emerald-500/10 dark:bg-emerald-500/15'
        : 'bg-amber-500/10 dark:bg-amber-500/15',
      description: isNone ? 'Perfect log coverage' : 'Some missing logs',
    };
  }

  // Fallback default
  return {
    title: label,
    icon: History,
    iconColor: 'text-zinc-500',
    iconBg: 'bg-zinc-500/10',
    description: '',
  };
};

export function StatsGrid({ data }: StatsGridProps) {
  if (!data || !data.stats || data.stats.length === 0) return null;

  return (
    <div className="grid grid-cols-2 gap-4 mb-8">
      {data.stats.map((stat, idx) => {
        const config = getStatConfig(stat.label, stat.value);
        const Icon = config.icon;

        return (
          <div
            key={`stat-${idx}`}
            className="flex flex-col items-start p-5 rounded-[24px] bg-black/[0.02] dark:bg-white/[0.02] border border-black/[0.05] dark:border-white/[0.05] shadow-sm backdrop-blur-md"
          >
            {/* Title Row */}
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  'w-7 h-7 rounded-[8px] flex items-center justify-center shrink-0',
                  config.iconBg
                )}
              >
                <Icon className={cn('w-4 h-4', config.iconColor)} strokeWidth={2.5} />
              </div>
              <span className="text-[11px] sm:text-[12px] font-extrabold text-black/40 dark:text-white/45 tracking-tight uppercase">
                {config.title}
              </span>
            </div>

            {/* Value */}
            <div className="text-[26px] sm:text-[28px] font-black text-foreground tracking-tight mt-3 leading-none">
              {stat.value}
            </div>

            {/* Description Context */}
            {config.description && (
              <p className="text-[13px] font-semibold text-black/40 dark:text-white/40 leading-tight mt-2">
                {config.description}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
