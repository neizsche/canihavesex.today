import * as React from 'react';
import { cn } from '../../lib/utils';
import { LucideIcon, Lock } from 'lucide-react';

interface RichCardProps {
    title: string;
    description?: string;
    sublabel?: string;
    bgImage?: string;
    bgColor?: string;
    icon?: LucideIcon;
    badge?: string;
    badgeColor?: string;
    className?: string;
    children?: React.ReactNode;
    blurred?: boolean;
    locked?: boolean;
    showLockIcon?: boolean;
}

export function RichCard({
    title,
    description,
    sublabel,
    bgImage,
    bgColor = "bg-zinc-100 dark:bg-zinc-800",
    icon: Icon,
    badge,
    badgeColor = "bg-white/20",
    className,
    children,
    blurred,
    locked,
    showLockIcon = true
}: RichCardProps) {
    return (
        <div className={cn(
            "relative flex-shrink-0 rounded-[32px] overflow-hidden shadow-2xl transition-transform duration-500 ease-out active:scale-[0.98] select-none group",
            bgColor,
            className
        )}
            style={{
                width: 'calc(260px * var(--scale-factor))',
                height: 'calc(340px * var(--scale-factor))',
                maxHeight: 'min(calc(340px * var(--scale-factor)), 52svh)'
            }}>
            {/* Background Image */}
            {bgImage && (
                <div
                    className={cn(
                        "absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110",
                        (blurred || locked) && "blur-xl"
                    )}
                    style={{ backgroundImage: `url(${bgImage})` }}
                />
            )}

            {/* Gradient Overlay */}
            {bgImage && (
                <div className={cn(
                    "absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent",
                    locked && "from-black/90 via-black/60 to-black/40"
                )} />
            )}

            {/* Content Container */}
            <div className={cn(
                "relative h-full flex flex-col p-5 sm:p-7 z-10",
                locked && "opacity-40 blur-sm"
            )}>
                {/* Header Row */}
                <div className="flex items-start justify-between mb-auto">
                    {/* Badge */}
                    {badge && (
                        <div className={cn(
                            "px-3 py-1.5 rounded-full backdrop-blur-md border border-white/10 shadow-sm",
                            badgeColor
                        )}>
                            <span className="text-[10px] sm:text-[11px] font-bold text-white uppercase tracking-wider">
                                {badge}
                            </span>
                        </div>
                    )}

                    {/* Icon */}
                    {Icon && (
                        <div className={cn(
                            "w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center backdrop-blur-md shadow-sm transition-transform duration-300 group-hover:rotate-12",
                            bgColor.includes('zinc-100') ? "bg-black/5" : "bg-white/10"
                        )}>
                            <Icon className={cn(
                                "icon-md sm:icon-lg",
                                bgColor.includes('zinc-100') ? "text-zinc-900" : "text-white"
                            )} />
                        </div>
                    )}
                </div>

                {/* Main Content */}
                <div className="space-y-1 sm:space-y-2">
                    <h3 className={cn(
                        "text-[22px] sm:text-[28px] font-bold leading-tight tracking-tight",
                        bgColor.includes('zinc-100') ? "text-zinc-900" : "text-white"
                    )}>
                        {title}
                    </h3>
                    {description && (
                        <p className={cn(
                            "text-[13px] sm:text-[15px] font-medium leading-relaxed line-clamp-3",
                            bgColor.includes('zinc-100') ? "text-zinc-500" : "text-zinc-300"
                        )}>
                            {description}
                        </p>
                    )}
                </div>

                {/* Sublabel/Footer */}
                {sublabel && (
                    <div className={cn(
                        "mt-4 pt-4 border-t",
                        bgColor.includes('zinc-100') ? "border-zinc-200" : "border-white/10"
                    )}>
                        <p className={cn(
                            "text-[11px] sm:text-[12px] font-semibold uppercase tracking-wide opacity-80",
                            bgColor.includes('zinc-100') ? "text-zinc-400" : "text-zinc-400"
                        )}>
                            {sublabel}
                        </p>
                    </div>
                )}

                {children}
            </div>

            {/* Locked Overlay */}
            {locked && showLockIcon && (
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/10 backdrop-blur-[2px]">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-zinc-900/40 backdrop-blur-xl border border-white/10 flex items-center justify-center shadow-2xl">
                        <Lock className="w-6 h-6 sm:w-8 sm:h-8 text-white/90" strokeWidth={2.5} />
                    </div>
                    <div className="mt-4 px-4 py-2 rounded-full bg-zinc-900/40 backdrop-blur-md border border-white/5">
                        <span className="text-[13px] font-bold text-white tracking-wide uppercase">Log to Unlock</span>
                    </div>
                </div>
            )}
        </div>
    );
}
