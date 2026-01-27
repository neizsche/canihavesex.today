import * as React from 'react';
import { InsightPageData, StatItem } from '../../../lib/mock-data';

interface StatsGridProps {
    data: InsightPageData;
}

export function StatsGrid({ data }: StatsGridProps) {
    return (
        <div className="grid grid-cols-2 gap-4 mb-8">
            {/* Render all stats generically */}
            {data.stats.map((stat, idx) => {
                // Determine style based on variant
                const valueColor = stat.variant === 'success' ? 'text-green-500' :
                    stat.variant === 'error' ? 'text-red-500' :
                        'text-foreground';

                return (
                    <div key={`stat-${idx}`} className="text-center">
                        <div className={`text-[20px] font-bold ${valueColor}`}>
                            {stat.value}
                        </div>
                        <div className="text-[13px] text-muted-foreground font-medium">
                            {stat.label}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
