import * as React from 'react';
import { ChevronLeft } from 'lucide-react';

import { BRAND } from '../lib/siteConfig';

interface HeaderProps {
    onBack?: () => void;
    title?: string;
}

export function Header({ onBack, title }: HeaderProps) {
    return (
        <header className="flex-shrink-0 bg-background/80 backdrop-blur-xl border-b border-black/5 dark:border-white/10 sticky top-0 z-50">
            <div className="max-w-md mx-auto px-4 h-14 flex items-center justify-between relative">
                {/* Left */}
                <div className="flex items-center gap-2">
                    {onBack ? (
                        <button
                            onClick={onBack}
                            className="flex items-center gap-1 text-[#007aff] active:opacity-50 transition-opacity -ml-2 px-2 py-1"
                        >
                            <ChevronLeft className="w-6 h-6" strokeWidth={2.5} />
                            <span className="text-[17px] font-medium leading-none pb-[1px]">Back</span>
                        </button>
                    ) : (
                        <div className="flex items-center gap-2">
                            <div className="text-[15px] tracking-tight text-zinc-900 dark:text-zinc-100 font-bold whitespace-nowrap">
                                {BRAND.PREFIX}<span className="text-rose-500 font-extrabold italic">{BRAND.HIGHLIGHT}</span>{BRAND.SUFFIX}
                            </div>
                        </div>
                    )}
                </div>

                {/* Center Title for Sub-screens */}
                {title && (
                    <div className="absolute left-1/2 -translate-x-1/2 text-[17px] font-semibold text-zinc-900 dark:text-zinc-100">
                        {title}
                    </div>
                )}
            </div>
        </header>
    );
}
