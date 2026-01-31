import * as React from 'react';
import { Lock } from 'lucide-react';
import { cn } from '../../../lib/utils';

interface PremiumUnlockCardProps {
    title: string;
    description: string;
    className?: string;
}

export function PremiumUnlockCard({ title, description, className }: PremiumUnlockCardProps) {
    return (
        <div className={cn(
            "relative overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 bg-gradient-to-br from-zinc-50 to-white dark:from-zinc-900 dark:to-zinc-900/50",
            className
        )}>
            {/* Blur Overlay */}
            <div className="absolute inset-0 backdrop-blur-sm bg-white/40 dark:bg-black/40 z-10 flex flex-col items-center justify-center text-center p-6">
                <div className="w-12 h-12 bg-black dark:bg-white rounded-full flex items-center justify-center shadow-xl mb-3">
                    <Lock className="w-6 h-6 text-white dark:text-black" />
                </div>
                <h3 className="text-[17px] font-bold text-zinc-900 dark:text-white mb-1">{title}</h3>
                <p className="text-[14px] text-zinc-600 dark:text-zinc-300 mb-4 max-w-[200px]">
                    {description}
                </p>
                <button className="px-5 py-2 bg-[#007aff] hover:bg-[#006ee6] text-white text-[14px] font-semibold rounded-full transition-colors shadow-lg shadow-blue-500/20">
                    Upgrade to Premium
                </button>
            </div>

            {/* Background Content (Teaser) */}
            <div className="opacity-50 blur-[2px] pointer-events-none select-none space-y-4">
                <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-1/3 mb-4"></div>
                <div className="h-32 bg-zinc-100 dark:bg-zinc-800/50 rounded-xl w-full"></div>
                <div className="flex gap-2">
                    <div className="h-8 bg-zinc-200 dark:bg-zinc-800 rounded-full w-20"></div>
                    <div className="h-8 bg-zinc-200 dark:bg-zinc-800 rounded-full w-20"></div>
                </div>
            </div>
        </div>
    );
}
