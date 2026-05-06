import * as React from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Heart, Activity, CheckCircle2, ChevronRight, TrendingUp } from 'lucide-react';

import cycleImg from '@/assets/images/cards/cycle.png';
import statsImg from '@/assets/images/cards/stats.png';
import fertilityImg from '@/assets/images/cards/fertility.png';

import { cn } from '@/lib/utils';
import { usePremiumFeatures } from '@/lib/featureFlags';
import { Header } from '@/components/common/Header';
import { RichCard } from '@/components/common/ui/rich-card';
import { InsightPage } from './insights/InsightPage';
import type { InsightType } from '@/lib/mock-data';
import { AppModeSwitcher, type AppMode } from '@/components/common/ui/app-mode-switcher';
import { PremiumUnlockCard } from '@/components/common/ui/PremiumUnlockCard';
import { useNavigation } from '@/hooks/useNavigation';
import { useInsights } from '@/hooks/queries/useInsights';

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

const INSIGHTS_CONFIG = [
    {
        id: 'today' as InsightType,
        icon: Activity,
        bgImage: cycleImg.src || cycleImg,
        className: "snap-center",
        shadowColor: "rgba(14, 165, 233, 0.45)" // Sky Blue glow
    },
    {
        id: 'cycle-stats' as InsightType,
        icon: TrendingUp,
        bgImage: statsImg.src || statsImg,
        className: "snap-center",
        shadowColor: "rgba(139, 92, 246, 0.45)" // Violet glow
    },
    {
        id: 'nutrition' as InsightType,
        icon: CheckCircle2,
        bgImage: fertilityImg.src || fertilityImg,
        className: "snap-center",
        shadowColor: "rgba(99, 102, 241, 0.45)" // Indigo glow
    }
];

export function TodayScreen() {
    const { premiumEnabled } = usePremiumFeatures();
    const { navigate } = useNavigation();
    
    const todayQuery = useInsights();

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
    const safeInsights = apiData?.insights || {};
    const dailyLogDone = apiData?.dailyLogDone ?? false;
    const isInsufficient = !apiData || apiData?.status === 'unknown' || !dailyLogDone;

    const insights = React.useMemo(() => {
        return INSIGHTS_CONFIG.map(config => {
            const apiCard = safeInsights[config.id]?.card || {};
            return {
                ...config,
                ...apiCard,
                lastUpdated: apiData?.date ? new Date(apiData.date).toLocaleDateString(undefined, {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric'
                }) : undefined,
            };
        }).filter(card => {
            if (!premiumEnabled && (card as any).isLocked) return false;
            return true;
        });
    }, [safeInsights, apiData?.date, premiumEnabled]);

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
                        {insights.map((insight) => {
                            const isGlobalLock = !dailyLogDone && insight.id !== 'today';
                            const isCardLocked = isGlobalLock || (insight as any).isLocked;

                            let activeLockLabel = (insight as any).lockLabel;
                            if (isGlobalLock) {
                                activeLockLabel = "Log to view insights";
                            }

                            return (
                                <RichCard
                                    key={insight.id}
                                    {...insight}
                                    date={apiData?.date}
                                    lockLabel={activeLockLabel}
                                    locked={isCardLocked}
                                    showLockIcon={true}
                                    onClick={() => {
                                        if (!isCardLocked) {
                                            setActiveInsight(insight.id as InsightType);
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
