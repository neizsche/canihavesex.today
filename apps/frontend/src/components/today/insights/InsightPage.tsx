import * as React from 'react';
import { X } from 'lucide-react';
import { InsightType, MOCK_INSIGHTS } from '../../../lib/mock-data';
import { InsightHeaderImage } from './InsightHeaderImage';
import { ConfidenceCard } from './ConfidenceCard';
import { StatsGrid } from './StatsGrid';
import { InsightContent } from './InsightContent';

interface InsightPageProps {
    isOpen: boolean;
    onClose: () => void;
    insightType: InsightType | null;
    bgImage?: string;
    shadowColor?: string;
    data?: any; // Dynamic API data
}

export function InsightPage({ isOpen, onClose, insightType, bgImage, shadowColor, data: apiData }: InsightPageProps) {
    const [mounted, setMounted] = React.useState(false);

    React.useEffect(() => {
        if (isOpen) {
            setMounted(true);
            document.body.style.overflow = 'hidden';
        } else {
            const timer = setTimeout(() => setMounted(false), 300);
            document.body.style.overflow = '';
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    if (!mounted && !isOpen) return null;
    if (!insightType) return null;

    // Use passed API data or fallback to MOCK
    const data = apiData || MOCK_INSIGHTS[insightType];

    return (
        <div
            className={`fixed inset-0 z-[100] flex items-end justify-center sm:items-center transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        >
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/40 backdrop-blur-[4px] transition-opacity duration-300"
                onClick={onClose}
            />

            {/* Sheet */}
            <div
                className={`w-full max-w-lg bg-background rounded-t-[24px] sm:rounded-[24px] overflow-hidden shadow-2xl relative transition-transform duration-500 ease-out transform ${isOpen ? 'translate-y-0 scale-100' : 'translate-y-full sm:translate-y-10 sm:scale-95'}`}
                style={{ maxHeight: '90vh' }}
            >
                {/* Scrollable Content */}
                <div className="overflow-y-auto h-full" style={{ maxHeight: '90vh' }}>

                    {/* Hero Image Component */}
                    <InsightHeaderImage
                        title={data.card.description} // passed but maybe unused in simple image component
                        subtitle={data.card.subtitle}
                        bgImage={bgImage}
                        shadowColor={shadowColor}
                        onClose={onClose}
                    />

                    {/* Content - Simplified */}
                    <div className="bg-background relative -mt-6 rounded-t-[24px] px-6 pt-8 pb-10">
                        {/* Hero Titles */}
                        <div className="text-center space-y-2 mb-8">
                            <h1 className="text-[64px] leading-[1] font-bold text-foreground tracking-tight">
                                {data.card.description}
                            </h1>
                            <p className="text-[24px] font-semibold text-teal-500 dark:text-teal-400 tracking-tight">
                                {data.card.subtitle}
                            </p>
                            {data.card.lastUpdated && (
                                <p className="text-sm font-medium text-muted-foreground pt-2">
                                    Last updated {data.card.lastUpdated}
                                </p>
                            )}
                        </div>

                        {/* Confidence Card */}
                        {data.confidence && (
                            <ConfidenceCard data={data.confidence} />
                        )}

                        {/* Stats Grid */}
                        <StatsGrid data={data} />

                        {/* Rest of Content */}
                        <InsightContent data={data} />
                    </div>
                </div>
            </div>
        </div>
    );
}
