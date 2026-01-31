import * as React from 'react';
import { cn } from '../../../lib/utils';
import { type CycleData } from '../../../lib/mock-data';

interface PeriodHistoryChartProps {
    data: CycleData[];
}

export function PeriodHistoryChart({ data }: PeriodHistoryChartProps) {
    // Requirements: Recent 6 cycles
    const recentData = data.slice(-6).reverse(); // Newest first for vertical list

    // Insight Logic
    const avgDuration = Math.round(data.reduce((acc, c) => acc + c.periodLength, 0) / (data.length || 1));
    const insightText = `Your periods typically last ${avgDuration} days.`;

    const getIntensityColor = (intensity: string) => {
        switch (intensity) {
            case 'light': return 'bg-rose-200 dark:bg-rose-900/40';
            case 'medium': return 'bg-rose-400 dark:bg-rose-700/60';
            case 'heavy': return 'bg-rose-500 dark:bg-rose-600';
            default: return 'bg-zinc-200';
        }
    };

    const getWidthPercent = (days: number) => {
        // Normalize against max of 10 days for bar width
        return Math.min(100, (days / 10) * 100);
    };

    return (
        <div className="space-y-4">
            <div className="space-y-1">
                <h3 className="text-[17px] font-semibold text-zinc-900 dark:text-white">Period History</h3>
                <p className="text-[15px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
                    {insightText}
                </p>
            </div>

            <div className="flex flex-col gap-3">
                {recentData.map((cycle, index) => (
                    <div key={cycle.id} className="flex items-center gap-3">
                        {/* Label */}
                        <div className="w-16 text-[13px] text-zinc-500 dark:text-zinc-400 font-medium whitespace-nowrap">
                            {/* Naive month formatting from start date strings */}
                            {new Date(cycle.startDate).toLocaleDateString('en-US', { month: 'short' })}
                        </div>

                        {/* Bar Track */}
                        <div className="flex-1 h-3 bg-zinc-100 dark:bg-zinc-800/50 rounded-full overflow-hidden relative">
                            {/* Filled Bar */}
                            <div
                                className={cn("h-full rounded-full transition-all duration-500 ease-out", getIntensityColor(cycle.periodIntensity))}
                                style={{ width: `${getWidthPercent(cycle.periodLength)}%` }}
                            />
                        </div>

                        {/* Value */}
                        <div className="w-8 text-[13px] text-zinc-900 dark:text-zinc-300 font-semibold text-right">
                            {cycle.periodLength}d
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
