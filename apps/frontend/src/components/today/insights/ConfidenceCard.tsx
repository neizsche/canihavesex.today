import * as React from 'react';
import { Calendar, Thermometer, Activity, Droplets, Check, Plus } from 'lucide-react';
import { cn } from '../../../lib/utils';

interface ConfidenceCardProps {
    data: {
        label: string;
        score: number;
        message: string;
        signals?: {
            temp: boolean;
            lh: boolean;
            mucus: boolean;
            calendar: boolean;
        };
    };
}

export function ConfidenceCard({ data }: ConfidenceCardProps) {
    if (!data) return null;

    const score = data.score ?? 50;

    // Ring color mapping
    let ringColorClass = 'stroke-amber-500';
    if (score >= 85) {
        ringColorClass = 'stroke-emerald-500 dark:stroke-emerald-400';
    } else if (score >= 70) {
        ringColorClass = 'stroke-[#007AFF]';
    } else if (score >= 50) {
        ringColorClass = 'stroke-violet-500 dark:stroke-violet-400';
    }

    // User-friendly display label mapping
    const friendlyLabelMap: Record<string, string> = {
        'Very High': 'Highly Accurate',
        'High': 'Accurate',
        'Moderate': 'Basic Data',
        'Building': 'Needs Logs'
    };
    const displayLabel = friendlyLabelMap[data.label] || data.label;

    const signals = data.signals || {
        calendar: true,
        temp: false,
        lh: false,
        mucus: false
    };

    const signalList = [
        {
            key: 'calendar' as const,
            label: 'Calendar',
            active: !!signals.calendar,
            icon: Calendar,
            bgActive: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
        },
        {
            key: 'temp' as const,
            label: 'Temp',
            active: !!signals.temp,
            icon: Thermometer,
            bgActive: 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20'
        },
        {
            key: 'lh' as const,
            label: 'LH Test',
            active: !!signals.lh,
            icon: Activity,
            bgActive: 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20'
        },
        {
            key: 'mucus' as const,
            label: 'Mucus',
            active: !!signals.mucus,
            icon: Droplets,
            bgActive: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
        }
    ];

    return (
        <div className="mb-8 p-5 rounded-[28px] bg-black/[0.02] dark:bg-white/[0.02] border border-black/[0.05] dark:border-white/[0.05] shadow-sm backdrop-blur-md">
            {/* Header: Title + Accents */}
            <div className="flex items-center justify-between mb-4">
                <h4 className="text-[12px] font-bold text-black/40 dark:text-white/40 tracking-[0.12em] uppercase">
                    Prediction Basis
                </h4>
                <div className="px-3 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800 border border-black/[0.03] dark:border-white/[0.03]">
                    <span className="text-[12px] font-bold text-zinc-600 dark:text-zinc-300 tracking-tight">
                        {displayLabel}
                    </span>
                </div>
            </div>

            {/* Content Row: Ring on left, checklist on right */}
            <div className="flex flex-col sm:flex-row items-center gap-5 sm:gap-6 bg-white/[0.4] dark:bg-white/[0.01] p-4 rounded-[22px] border border-black/[0.02] dark:border-white/[0.01]">
                {/* SVG Ring Gauge */}
                <div className="relative w-16 h-16 flex items-center justify-center shrink-0">
                    <svg className="w-16 h-16 transform -rotate-90">
                        <circle
                            cx="32"
                            cy="32"
                            r="26"
                            className="stroke-black/[0.05] dark:stroke-white/[0.06] fill-transparent"
                            strokeWidth="4"
                        />
                        <circle
                            cx="32"
                            cy="32"
                            r="26"
                            className={cn("fill-transparent transition-all duration-1000 ease-out", ringColorClass)}
                            strokeWidth="4"
                            strokeDasharray="163"
                            strokeDashoffset={163 - (163 * score) / 100}
                            strokeLinecap="round"
                        />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-[15px] font-extrabold text-zinc-900 dark:text-white leading-none">
                            {score}%
                        </span>
                    </div>
                </div>

                {/* Signal Grid */}
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5 flex-1 w-full">
                    {signalList.map((sig) => {
                        const Icon = sig.icon;
                        return (
                            <div
                                key={sig.key}
                                className={cn(
                                    "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-semibold border transition-all duration-300",
                                    sig.active
                                        ? cn("border-solid", sig.bgActive)
                                        : "bg-transparent text-zinc-400 dark:text-zinc-500 border-dashed border-zinc-200 dark:border-zinc-800"
                                )}
                            >
                                <Icon className={cn("w-3.5 h-3.5", sig.active ? "" : "opacity-45")} />
                                <span>{sig.label}</span>
                                {sig.active ? (
                                    <Check className="w-3 h-3 ml-0.5 opacity-80" strokeWidth={3} />
                                ) : (
                                    <Plus className="w-3 h-3 ml-0.5 opacity-40" strokeWidth={2.5} />
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Friendly bottom status/actions message */}
            <p className="text-[14px] leading-relaxed text-black/60 dark:text-white/60 font-medium mt-4">
                {data.message}
            </p>
        </div>
    );
}
