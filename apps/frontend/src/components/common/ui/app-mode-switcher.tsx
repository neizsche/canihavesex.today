import * as React from 'react';
import { Activity, Shield, Heart, Lock } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { usePremiumFeatures } from '../../../lib/featureFlags';
import { APP_MODE_SWITCHER_LABELS } from './app-mode-switcher.config';

export type AppMode = 'tracking' | 'contraception' | 'conception';

interface AppModeSwitcherProps {
    value: AppMode;
    onChange: (mode: AppMode) => void;
    variant?: 'pill' | 'slide';
    className?: string;
    onPremiumClick?: (modeId: AppMode) => void; // Custom premium click handler
    showHint?: boolean;
}

export function AppModeSwitcher({
    value,
    onChange,
    variant = 'pill',
    className,
    onPremiumClick,
    showHint = false
}: AppModeSwitcherProps) {
    const { premiumEnabled } = usePremiumFeatures();

    const allModes = [
        { id: 'tracking' as const, label: APP_MODE_SWITCHER_LABELS.modes.tracking, icon: Activity, premium: false },
        { id: 'contraception' as const, label: APP_MODE_SWITCHER_LABELS.modes.contraception, icon: Shield, premium: true },
        { id: 'conception' as const, label: APP_MODE_SWITCHER_LABELS.modes.conception, icon: Heart, premium: true }
    ];

    // Filter modes based on premium flag
    const modes = premiumEnabled
        ? allModes
        : allModes.filter(mode => !mode.premium);

    const handleClick = (mode: typeof modes[0]) => {
        if (mode.premium) {
            if (onPremiumClick) {
                onPremiumClick(mode.id);
            } else {
                alert(`${mode.label} mode unlocks with Premium`);
            }
        } else {
            onChange(mode.id);
        }
    };

    const content = (
        variant === 'slide' ? (
            <div className={cn("relative h-[44px] bg-zinc-50 dark:bg-zinc-900/30 rounded-xl p-1 flex gap-1", className)}>
                {modes.map((mode) => {
                    const Icon = mode.icon;
                    const isActive = value === mode.id;

                    return (
                        <button
                            key={mode.id}
                            onClick={() => handleClick(mode)}
                            className={cn(
                                "relative flex-1 h-full rounded-lg flex items-center justify-center gap-2 text-[15px] font-medium transition-all duration-150",
                                isActive
                                    ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-sm"
                                    : "text-zinc-600 dark:text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300"
                            )}
                        >
                            <Icon className={cn(
                                "w-4 h-4 transition-opacity",
                                isActive ? "opacity-100" : "opacity-40"
                            )} />
                            <span className="hidden sm:inline">{mode.label}</span>
                            {mode.premium && (
                                <Lock className="w-2.5 h-2.5 opacity-40 absolute top-1.5 right-1.5" />
                            )}
                        </button>
                    );
                })}
            </div>
        ) : (
            <div className={cn(
                "inline-flex p-1 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl rounded-full shadow-lg border border-black/5 dark:border-white/10",
                className
            )}>
                {modes.map((mode) => (
                    <button
                        key={mode.id}
                        onClick={() => handleClick(mode)}
                        className={cn(
                            "relative px-5 py-2.5 rounded-full text-[13px] font-medium transition-all duration-200",
                            value === mode.id
                                ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-md"
                                : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
                        )}
                    >
                        <span className="flex items-center gap-1.5">
                            {mode.label}
                            {mode.premium && (
                                <Lock className="w-2.5 h-2.5 opacity-50" />
                            )}
                        </span>
                    </button>
                ))}
            </div>
        )
    );

    if (showHint) {
        return (
            <div className="flex flex-col items-center gap-3 w-full">
                <p className="text-[13px] text-zinc-400 font-medium text-center">
                    Switch to <span className="text-zinc-600 dark:text-zinc-300">Prevent</span> or <span className="text-zinc-600 dark:text-zinc-300">Conceive</span> mode for tailored insights
                </p>
                {content}
            </div>
        );
    }

    return content;
}
