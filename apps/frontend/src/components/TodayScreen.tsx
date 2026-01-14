import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Heart, Activity, CheckCircle2, ChevronRight, TrendingUp, Sparkles, AlertTriangle, Zap, Brain } from 'lucide-react';

import { apiJson, type Risk } from '../lib/api';
import { cn } from '../lib/utils';
import { Header } from './Header';
import { RichCard } from './ui/rich-card';

type TodayData = {
    date: string;
    risk: Risk;
    explanation: string;
    disclaimer?: string;
    analytics?: {
        confidence: number;
        todayCycleDay: number;
        confirmed: boolean;
        warnings: string[];
        signals: Array<{ source: string; explain: string }>;
        coverage: { critical_gap: boolean };
    } | null;
};

// Custom backgrounds for each card
const BG_RISK = "/today/bg_main.png";
const BG_PHASE = "/today/bg_phase.png";
const BG_TREND = "/today/bg_analysis.png";
const BG_SCIENCE = "/today/bg_science.png";

function riskTheme(risk: Risk) {
    if (risk === 'HIGH') return {
        title: "High Risk",
        badge: "Fertility peak",
        icon: AlertTriangle
    };
    if (risk === 'MEDIUM') return {
        title: "Medium Risk",
        badge: "Caution",
        icon: Activity
    };
    if (risk === 'LOW') return {
        title: "Low Risk",
        badge: "Safe state",
        icon: CheckCircle2
    };
    return {
        title: "Logging Required",
        badge: "Needs data",
        icon: Heart
    };
}

export function TodayScreen() {
    const todayQuery = useQuery({
        queryKey: ['today'],
        queryFn: () => apiJson<TodayData>('/api/today'),
    });

    const loading = todayQuery.isLoading;
    const data: TodayData = todayQuery.data ?? {
        date: new Date().toISOString().slice(0, 10),
        risk: 'INSUFFICIENT_DATA',
        explanation: '',
    };

    // 🥚 Science Snacks (Expert Tips) - Randomized on mount
    const [expertTip] = React.useState(() => {
        const tips = [
            { desc: "Cervical mucus is 90% water. Staying hydrated is essential for accurate observations.", badge: "Hydration Tip" },
            { desc: "The Luteal Phase is usually a fixed length (12-16 days). Tracking its length helps predict your period.", badge: "Cycle Fact" },
            { desc: "BBT should be taken immediately after waking, before even sitting up in bed.", badge: "Accuracy Tip" },
            { desc: "Stress can delay ovulation by shifting hormone production. Consistency is key.", badge: "Health Insight" }
        ];
        return tips[Math.floor(Math.random() * tips.length)];
    });

    const risk = data.risk ?? 'INSUFFICIENT_DATA';
    const theme = riskTheme(risk);
    const analytics = data.analytics;
    const isInsufficient = risk === 'INSUFFICIENT_DATA';

    // 🧠 Dynamic Insights Engine
    const insights = [
        // 1. Primary Status Card
        {
            title: loading ? "Loading..." : theme.title,
            description: isInsufficient ? "Your daily fertility status is just a log away." : data.explanation,
            badge: theme.badge,
            icon: theme.icon,
            bgImage: BG_RISK,
            className: "snap-center"
        },
        {
            title: isInsufficient ? "Cycle Phase" : (analytics?.confirmed ? "Luteal Phase" : "Follicular Phase"),
            description: isInsufficient
                ? "Insights into your current cycle phase."
                : (analytics?.confirmed
                    ? "Progesterone dominant. Temperature elevated."
                    : "Estrogen rising. Follicle developing."),
            badge: "Phase",
            icon: Brain,
            bgImage: BG_PHASE,
            className: "snap-center",
            sublabel: isInsufficient ? "Unlock phase analysis" : "Next cycle expected in ~12 days",
            blurred: isInsufficient
        },
        {
            title: isInsufficient ? "Analysis" : `${Math.round((analytics?.confidence ?? 0) * 100)}% Confidence`,
            description: isInsufficient
                ? "Analysis appears here after logging."
                : (analytics?.coverage.critical_gap
                    ? "Missing logs detected. Consistency improves accuracy."
                    : "Strong signals detected. High accuracy assessment."),
            badge: "Trend",
            icon: Zap,
            bgImage: BG_TREND,
            className: "snap-center",
            blurred: isInsufficient,
            children: !isInsufficient && analytics && (
                <div className="flex flex-col gap-2 mt-2">
                    {analytics.signals.slice(0, 2).map((s, i) => (
                        <div key={i} className="flex items-center gap-2 text-[12px] opacity-80">
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                            <span>{s.explain}</span>
                        </div>
                    ))}
                </div>
            )
        },
        // 4. Science Snack (Expert Tip)
        {
            title: "Expert Tip",
            description: expertTip.desc,
            badge: expertTip.badge,
            icon: Sparkles,
            bgImage: BG_SCIENCE,
            className: "snap-center"
        }
    ];

    return (
        <div className="h-full bg-[#F2F2F7] dark:bg-black font-sans flex flex-col">
            <Header />

            <div className="flex-1 flex flex-col w-full min-h-0 items-center justify-center py-6 sm:py-8 space-y-8 sm:space-y-12">

                {/* Horizontal Carousel - Centered */}
                <div className="w-full flex justify-center shrink-0">
                    <div className={cn(
                        "flex overflow-x-auto gap-3 sm:gap-4 px-4 sm:px-6 no-scrollbar snap-x snap-mandatory transition-all duration-500 shrink-0 w-fit max-w-full",
                        isInsufficient && "overflow-x-hidden touch-none"
                    )}>
                        {insights.map((insight, idx) => (
                            <RichCard
                                key={idx}
                                {...insight}
                                locked={isInsufficient}
                                showLockIcon={idx === 0}
                            />
                        ))}
                    </div>
                </div>

                {/* Hero Branding Section - Vertically Centered */}
                <div className="flex flex-col items-center justify-center px-6 shrink-0">
                    <div className="text-center space-y-6 sm:space-y-8 max-w-sm">
                        <div className="space-y-1.5 sm:space-y-3">
                            <h1 className="font-bold leading-[1.1] tracking-tighter text-foreground"
                                style={{ fontSize: 'calc(32px * var(--font-scale))' }}>
                                Get the daily status <br />
                                <span className="text-zinc-400 dark:text-zinc-600">with ease.</span>
                            </h1>
                            <p className="text-[13px] sm:text-[17px] text-zinc-500 dark:text-zinc-400 leading-relaxed max-w-[280px] mx-auto hidden sm:block">
                                Your personalized fertility breakdown, based on your body's signs.
                            </p>
                        </div>

                        <a
                            href={isInsufficient ? "#/log" : "#/chart"}
                            className={cn(
                                "group relative flex items-center justify-center gap-3 px-8 h-12 sm:h-16 rounded-full transition-all duration-300 active:scale-[0.98] shadow-2xl mx-auto",
                                isInsufficient
                                    ? "bg-[#007aff] text-white shadow-blue-500/30"
                                    : "bg-white text-black shadow-white/10"
                            )}
                        >
                            <div className={cn(
                                "w-8 h-8 rounded-full flex items-center justify-center transition-colors",
                                isInsufficient ? "bg-white/20" : "bg-zinc-100"
                            )}>
                                {isInsufficient ? (
                                    <Heart className="icon-sm text-white" fill="currentColor" />
                                ) : (
                                    <TrendingUp className="icon-sm text-[#007aff]" />
                                )}
                            </div>
                            <span className="text-[17px] sm:text-[19px] font-bold tracking-tight">
                                {isInsufficient ? "Log Today" : "View Charts"}
                            </span>
                            <ChevronRight className="icon-md opacity-40 group-hover:translate-x-1 transition-transform" />
                        </a>
                    </div>
                </div>

                {/* Footer Disclaimer */}
                {data.disclaimer && (
                    <div className="px-10 pb-4 opacity-30 shrink-0">
                        <p className="text-[11px] text-center leading-relaxed font-medium">
                            {data.disclaimer}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
