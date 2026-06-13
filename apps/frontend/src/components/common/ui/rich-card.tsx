import * as React from 'react';
import { cn } from '../../../lib/utils';
import { LucideIcon, Lock } from 'lucide-react';

interface RichCardProps {
    title: string;
    description?: string;
    sublabel?: string;
    bgImage?: string;
    badge?: string;
    shadowColor?: string;
    className?: string;
    children?: React.ReactNode;
    locked?: boolean;
    showLockIcon?: boolean;
    lockLabel?: string;
    date?: string;
    onClick?: () => void;
}

export const RichCard = React.memo(({
    title,
    description,
    sublabel,
    bgImage,
    shadowColor = "rgba(0,0,0,0.1)",
    className,
    locked,
    showLockIcon = true,
    lockLabel = "PREMIUM",
    onClick
}: RichCardProps) => {
    return (
        <div
            onClick={locked ? undefined : onClick}
            className={cn(
                "relative shrink-0 w-[280px] sm:w-[320px] aspect-[4/5] rounded-[32px] overflow-hidden group transition-all duration-500 ease-spring select-none",
                onClick && !locked ? "cursor-pointer" : "cursor-default",
                className
            )}
            style={{
                boxShadow: `0 0 20px -2px ${shadowColor}`
            }}
        >
            {/* Background Image Layer */}
            {bgImage && (
                <div
                    className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
                    style={{ backgroundImage: `url(${bgImage})` }}
                />
            )}

            {/* Gradient Overlays for Readability */}
            <div className={`absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/80 opacity-90`} />

            {/* Top Label */}
            <div className="absolute top-0 left-0 p-6 z-10">
                <h3 className="text-[13px] font-bold tracking-[0.15em] text-white/90 uppercase drop-shadow-md">
                    {title}
                </h3>
            </div>

            {/* Bottom Content Section */}
            <div className="absolute bottom-0 left-0 right-0 p-6 z-10">
                {/* Main Hero Text */}
                {description && (
                    <div className="text-[30px] sm:text-[34px] font-extrabold text-white leading-[1.1] mb-2 tracking-tight drop-shadow-lg">
                        {description}
                    </div>
                )}

                {/* Sublabel */}
                {sublabel && (
                    <p className="text-[16px] font-medium text-white/80 drop-shadow-md leading-snug">
                        {sublabel}
                    </p>
                )}
            </div>

            {/* Locked Overlay - PremiumUnlockCard Style */}
            {locked && showLockIcon && (
                <div className="absolute inset-0 z-20 backdrop-blur-sm bg-white/60 dark:bg-black/60 flex flex-col items-center justify-center text-center p-6">
                    {/* Large Lock Icon */}
                    <div className="w-14 h-14 bg-black dark:bg-white rounded-full flex items-center justify-center shadow-2xl mb-4">
                        <Lock className="w-7 h-7 text-white dark:text-black" strokeWidth={2.5} />
                    </div>

                    {/* Lock Label/Title */}
                    <h3 className="text-[18px] font-bold text-zinc-900 dark:text-white mb-2">
                        {lockLabel}
                    </h3>

                    {/* Description */}
                    <p className="text-[14px] text-zinc-600 dark:text-zinc-300 mb-5 max-w-[220px] leading-snug">
                        Upgrade to see detailed insights and tracking
                    </p>

                    {/* Upgrade Button */}
                    <button className="px-6 py-2.5 bg-[#007AFF] hover:bg-[#0066D6] text-white text-[15px] font-semibold rounded-full transition-all duration-200 shadow-lg shadow-blue-500/30 active:scale-95">
                        Upgrade to Premium
                    </button>
                </div>
            )}
        </div>
    );
});
