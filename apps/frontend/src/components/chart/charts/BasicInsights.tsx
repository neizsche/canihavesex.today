import * as React from 'react';
import { type CycleData, getMedian } from '../../../lib/mock-data';

interface BasicInsightsProps {
    data: CycleData[];
}

export function BasicInsights({ data }: BasicInsightsProps) {
    // Derive simple insights
    const lengths = data.map(d => d.length);
    const medianLength = getMedian(lengths);

    // Regularity Check
    const isRegular = lengths.every(l => Math.abs(l - medianLength) <= 3);

    return (
        <div className="space-y-4">
            <h3 className="text-[17px] font-semibold text-zinc-900 dark:text-white">Trends</h3>

            <div className="grid gap-4">
                {/* Insight 1: Regularity */}
                <div className="bg-zinc-50 dark:bg-zinc-900 p-4 rounded-xl border border-zinc-100 dark:border-zinc-800/50">
                    <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-200 mb-1">
                        Cycle Regularity
                    </div>
                    <p className="text-[14px] text-zinc-500 dark:text-zinc-400 leading-normal">
                        {isRegular
                            ? "Your cycles have been consistent in length recently."
                            : "Your cycle lengths vary slightly month to month."
                        }
                    </p>
                </div>

                {/* Insight 2: Typical Range */}
                <div className="bg-zinc-50 dark:bg-zinc-900 p-4 rounded-xl border border-zinc-100 dark:border-zinc-800/50">
                    <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-200 mb-1">
                        Typical Length
                    </div>
                    <p className="text-[14px] text-zinc-500 dark:text-zinc-400 leading-normal">
                        Most of your cycles are around <span className="font-medium text-zinc-900 dark:text-zinc-300">{medianLength} days</span> long.
                    </p>
                </div>
            </div>
        </div>
    );
}


