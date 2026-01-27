import * as React from 'react';
import { Download, Lock } from 'lucide-react';
import { CycleLengthChart } from './CycleLengthChart';
import { PeriodHistoryChart } from './PeriodHistoryChart';
import { BasicInsights } from './BasicInsights';
import { MOCK_CYCLES } from '../../../lib/mock-data';
import { PremiumUnlockCard } from '../../common/ui/PremiumUnlockCard';
import { usePremiumFeatures } from '../../../lib/featureFlags';
import { CHARTS_VIEW_LABELS } from './ChartsView.config';

interface ChartsViewProps {
    data: any[]; // CycleHistory[]
}

export function ChartsView({ data = [] }: ChartsViewProps) {
    const { premiumEnabled } = usePremiumFeatures();

    return (
        <div className="flex flex-col h-full bg-background dark:bg-black">
            <div className="flex-1 overflow-y-auto min-h-0">
                <div className="px-6 py-6 pb-24 max-w-md mx-auto space-y-12">

                    {/* Section 1: Cycle Length Trend */}
                    <section className="space-y-4">
                        <CycleLengthChart data={data} />
                    </section>

                    {/* Section 2: Period History */}
                    <section className="space-y-4 pt-4 border-t border-zinc-100 dark:border-zinc-900">
                        <PeriodHistoryChart data={data} />
                    </section>

                    {/* Section 3: Basic Insights */}
                    <section className="space-y-4 pt-4 border-t border-zinc-100 dark:border-zinc-900">
                        <BasicInsights data={data} />
                    </section>

                    {/* Section 4: Premium Predictions (Conditionally shown) */}
                    {premiumEnabled && (
                        <PremiumUnlockCard
                            title={CHARTS_VIEW_LABELS.premium.title}
                            description={CHARTS_VIEW_LABELS.premium.description}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}
