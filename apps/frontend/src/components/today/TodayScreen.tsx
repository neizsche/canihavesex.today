import * as React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Heart, Activity, CheckCircle2, ChevronRight, TrendingUp, Lock } from 'lucide-react';

import { fetchToday } from '../../lib/api';
import { cn } from '../../lib/utils';
import { usePremiumFeatures } from '../../lib/featureFlags';
import { Header } from '../common/Header';
import { RichCard } from '../common/ui/rich-card';
import { InsightPage } from './insights/InsightPage';
import type { InsightType } from '../../lib/mock-data'; // Keeping this for type definition if needed, but should probably be moved
import { AppModeSwitcher, type AppMode } from '../common/ui/app-mode-switcher';
import { PremiumUnlockCard } from '../common/ui/PremiumUnlockCard';
import { useNavigation } from '../../hooks/useNavigation';

type FertilityStatus = 'fertile' | 'unsure' | 'not_fertile';

const STATUS_CONFIG: Record<FertilityStatus, { title: string; subtitle: string; colorClass: string; bgClass?: string }> = {
    fertile: {
        title: "Highly Fertile",
        subtitle: "High chance of pregnancy today.",
        colorClass: "text-rose-500",
        bgClass: "bg-rose-500/10"
    },
    unsure: {
        title: "Not Sure",
        subtitle: "Assume fertile to be safe.",
        colorClass: "text-amber-500",
        bgClass: "bg-amber-500/10"
    },
    not_fertile: {
        title: "Not Fertile",
        subtitle: "Low chance of pregnancy today.",
        colorClass: "text-emerald-500",
        bgClass: "bg-emerald-500/10"
    }
};

export function TodayScreen() {
    const { premiumEnabled } = usePremiumFeatures();
    const { navigate } = useNavigation();
    const queryClient = useQueryClient();
    const cachedToday = queryClient.getQueryData<any>(['today']);

    const todayQuery = useQuery({
        queryKey: ['today'],
        queryFn: fetchToday,
        placeholderData: cachedToday,
        staleTime: 5 * 60 * 1000, // 5 minutes
        gcTime: 15 * 60 * 1000,   // 15 minutes
    });

    const [activeInsight, setActiveInsight] = React.useState<InsightType | null>(null);
    const [activeCard, setActiveCard] = React.useState<{ bgImage?: string; shadowColor?: string } | null>(null);
    const [appMode, setAppMode] = React.useState<AppMode>('tracking');
    const [showPremiumUpsell, setShowPremiumUpsell] = React.useState(false);
    const premiumSectionRef = React.useRef<HTMLDivElement>(null);

    // Hide premium upsell on component mount (screen reload)
    React.useEffect(() => {
        setShowPremiumUpsell(false);
    }, []);

    // 🧠 Dynamic Insights Engine - Powered by V5 API
    const apiData = todayQuery.data;

    // Fallback/Loading state handled by query.isLoading checks above, but if data is missing:
    const safeInsights = apiData?.insights || {};
    const dailyLogDone = apiData?.dailyLogDone ?? false;
    const isInsufficient = !apiData || apiData?.status === 'unknown' || !dailyLogDone;

    const insights = [
        // 1. Today in Cycle
        {
            id: 'today' as InsightType,
            ...safeInsights['today']?.card,
            // Add lastUpdated for the Insight Screen details
            lastUpdated: apiData?.date ? new Date(apiData.date).toLocaleDateString(undefined, {
                weekday: 'short',
                month: 'short',
                day: 'numeric'
            }) : undefined,
            // Map API/Engine specific fields to UI props if needed
            icon: Activity,
            bgImage: '/images/cards/cycle.png',
            className: "snap-center",
            shadowColor: "rgba(14, 165, 233, 0.45)" // Sky Blue glow
        },
        // 2. Cycle Stats
        {
            id: 'cycle-stats' as InsightType,
            ...safeInsights['cycle-stats']?.card,
            icon: TrendingUp,
            bgImage: '/images/cards/stats.png',
            className: "snap-center",
            shadowColor: "rgba(139, 92, 246, 0.45)" // Violet glow
        },
        // 3. Nutrition (Locked)
        {
            id: 'nutrition' as InsightType,
            ...safeInsights['nutrition']?.card,
            icon: CheckCircle2,
            bgImage: '/images/cards/fertility.png',
            className: "snap-center",
            shadowColor: "rgba(99, 102, 241, 0.45)" // Indigo glow
        }
    ].filter(card => {
        // If premium is disabled, hide locked cards (which are premium features)
        if (!premiumEnabled && card.isLocked) return false;
        return true;
    });

    // Handle premium mode click - show upsell and scroll
    const handlePremiumClick = (mode: AppMode) => {
        setShowPremiumUpsell(true);
        // Smooth scroll to premium section after a short delay
        setTimeout(() => {
            premiumSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
    };

    return (
        <div
            className="h-full bg-[#F2F2F7] dark:bg-black font-sans flex flex-col"
            style={{ '--scale-factor': 1 } as React.CSSProperties}
        >
            <Header />

            <div className={cn(
                "flex-1 flex flex-col w-full min-h-0 items-center overflow-y-auto",
                premiumEnabled
                    ? "justify-start pt-6 sm:pt-8 sm:pb-8 space-y-12 sm:space-y-16"
                    : "justify-center py-4 space-y-6 sm:space-y-8" // Centered and tighter
            )}>

                {/* Horizontal Carousel - Centered */}
                <div className="w-full flex justify-center shrink-0">
                    <div className={cn(
                        "flex overflow-x-auto gap-5 sm:gap-6 px-4 sm:px-6 pb-8 no-scrollbar snap-x snap-mandatory transition-all duration-500 shrink-0 w-fit max-w-full",
                        isInsufficient && "overflow-x-hidden touch-none"
                    )}>
                        {insights.map((insight, idx) => {
                            // Check if this specific card should be locked (either global insufficiency or card-specific lock)
                            // If global 'isInsufficient' is true, it means we need to log today's data -> Label: "Log to Unlock"
                            // If specific card is locked (e.g. Premium feature) -> Label: "Premium" (from data)

                            const isGlobalLock = !dailyLogDone && insight.id !== 'today'; // Today card always unlocked if no log
                            const isCardLocked = isGlobalLock || (insight as any).isLocked;

                            let activeLockLabel = (insight as any).lockLabel;
                            if (isGlobalLock) {
                                activeLockLabel = "Log to view insights";
                            }

                            // Inject full insight data for the modal/sheet when clicked
                            const fullData = safeInsights[insight.id as string];

                            return (
                                <RichCard
                                    key={idx}
                                    {...insight}
                                    // Pass mapped props explicitly if not in spread
                                    date={apiData?.date} // Use API date
                                    lockLabel={activeLockLabel}
                                    locked={isCardLocked}
                                    showLockIcon={true}
                                    onClick={() => {
                                        if (!isCardLocked) {
                                            setActiveInsight(insight.id as InsightType);
                                            // Pass the FULL API data to the state so InsightPage can read it
                                            // We might need to refactor InsightPage or pass it here?
                                            // Actually InsightPage likely fetches or finds data by ID. 
                                            // Let's pass the data directly or ensure InsightPage uses the same source.
                                            // For now, RichCard click sets ID. We need to ensure InsightPage reads from 'safeInsights'.
                                            setActiveCard({ bgImage: insight.bgImage, shadowColor: insight.shadowColor });
                                        }
                                    }}
                                />
                            );
                        })}
                    </div>
                </div>

                {/* Hero Branding Section - Status Display */}
                <div className="flex flex-col items-center justify-center px-6 shrink-0 w-full">
                    {(() => {
                        const activeStatus: FertilityStatus = (apiData?.status as FertilityStatus) || 'not_fertile';
                        const status = STATUS_CONFIG[activeStatus] || STATUS_CONFIG['not_fertile'];

                        if (!dailyLogDone) {
                            return (
                                <div className="flex flex-col items-center justify-center px-6 shrink-0">
                                    <div className="text-center space-y-6 sm:space-y-8 max-w-sm">
                                        <div className="space-y-1.5 sm:space-y-3">
                                            <h1 className="font-bold leading-[1.1] tracking-tighter text-foreground"
                                                style={{ fontSize: 'calc(32px * var(--font-scale))' }}>
                                                Get the daily status <br />
                                                <span className="text-zinc-400 dark:text-zinc-600">with ease.</span>
                                            </h1>
                                        </div>

                                        <button
                                            onClick={() => navigate('/log')}
                                            className="group relative flex items-center justify-center gap-3 px-8 h-12 sm:h-16 rounded-full transition-all duration-300 active:scale-[0.98] shadow-2xl mx-auto bg-[#007aff] text-white shadow-blue-500/30"
                                        >
                                            <div className="w-8 h-8 rounded-full flex items-center justify-center transition-colors bg-white/20">
                                                <Heart className="icon-sm text-white" fill="currentColor" />
                                            </div>
                                            <span className="text-[17px] sm:text-[19px] font-bold tracking-tight">
                                                Log Today
                                            </span>
                                            <ChevronRight className="icon-md opacity-40 group-hover:translate-x-1 transition-transform" />
                                        </button>
                                    </div>
                                </div>
                            );
                        }

                        return (
                            <div className="text-center space-y-6 sm:space-y-8 max-w-sm w-full">
                                <div className="space-y-2 sm:space-y-3 flex flex-col items-center">
                                    <h1 className={cn(
                                        "font-bold leading-[1] tracking-tighter",
                                        status.colorClass
                                    )}
                                        style={{ fontSize: 'calc(42px * var(--font-scale))' }}>
                                        {status.title}
                                    </h1>
                                    <p className="text-[17px] sm:text-[19px] text-zinc-500 dark:text-zinc-400 font-medium leading-relaxed max-w-[280px] mx-auto">
                                        {status.subtitle}
                                    </p>
                                </div>

                                <button
                                    onClick={() => navigate('/chart')}
                                    className="group relative flex items-center justify-center gap-3 px-8 h-12 sm:h-16 rounded-full transition-all duration-300 active:scale-[0.98] shadow-2xl mx-auto bg-white text-black shadow-white/10"
                                >
                                    <div className="w-8 h-8 rounded-full flex items-center justify-center transition-colors bg-zinc-100">
                                        <TrendingUp className="icon-sm text-[#007aff]" />
                                    </div>
                                    <span className="text-[17px] sm:text-[19px] font-bold tracking-tight">
                                        View Charts
                                    </span>
                                    <ChevronRight className="icon-md opacity-40 group-hover:translate-x-1 transition-transform" />
                                </button>
                            </div>
                        );
                    })()}
                </div>

                {/* App Mode Switcher - Conditionally shown if premium enabled */}
                {premiumEnabled && (
                    <div className="w-full flex justify-center px-4 pt-8 pb-8 shrink-0">
                        <AppModeSwitcher
                            value={appMode}
                            onChange={setAppMode}
                            variant="pill"
                            onPremiumClick={() => handlePremiumClick('tracking')}
                            showHint={true}
                        />
                    </div>
                )}

                {/* Premium Upsell - Conditionally shown if premium enabled */}
                {premiumEnabled && (
                    <div
                        className={cn(
                            "w-full px-4 transition-all duration-500 ease-out overflow-hidden shrink-0",
                            showPremiumUpsell
                                ? "max-h-96 opacity-100 pb-6"
                                : "max-h-0 opacity-0 pb-0"
                        )}
                    >
                        <div ref={premiumSectionRef}>
                            <PremiumUnlockCard
                                title="Premium Feature"
                                description="Upgrade to unlock advanced cycle modes and personalized insights"
                                className="max-w-md mx-auto"
                            />
                        </div>
                    </div>
                )}

            </div>

            {/* Insight Page */}
            <InsightPage
                isOpen={!!activeInsight}
                onClose={() => {
                    setActiveInsight(null);
                    setActiveCard(null);
                }}
                // Find the specific card data from our processed 'insights' array which includes the overrides
                data={(() => {
                    const cardData = insights.find(i => i.id === activeInsight);
                    const originalData = safeInsights ? safeInsights[activeInsight as string] : undefined;
                    if (!cardData || !originalData) return originalData;

                    // Merge original full data with card overrides (like description/title)
                    return {
                        ...originalData,
                        card: {
                            ...originalData.card,
                            description: cardData.description,
                            title: cardData.title,
                            subtitle: cardData.subtitle,
                            lastUpdated: (cardData as any).lastUpdated
                        }
                    };
                })()}
                insightType={activeInsight}
                bgImage={activeCard?.bgImage}
                shadowColor={activeCard?.shadowColor}
            />
        </div>
    );
}
