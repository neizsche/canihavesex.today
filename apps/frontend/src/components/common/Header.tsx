import * as React from 'react';
import { ChevronLeft } from 'lucide-react';

import { BRAND } from '../../lib/siteConfig';
import { BrandTitle } from './BrandTitle';


import { HEADER_LABELS } from './Header.config';

interface HeaderProps {
    onBack?: () => void;
    title?: string;
}

export function Header({ onBack, title }: HeaderProps) {
    return (
        <header className="flex-shrink-0 bg-white/80 dark:bg-black/80 backdrop-blur-xl border-b border-black/5 dark:border-white/5 sticky top-0 z-50 transition-all duration-200">
            <div className="max-w-md mx-auto px-4 h-14 flex items-center justify-between relative">
                {/* Left: Navigation or Logo */}
                <div className="flex items-center min-w-[40px]">
                    {onBack ? (
                        <button
                            onClick={onBack}
                            className="flex items-center justify-center w-8 h-8 -ml-2 rounded-full text-zinc-900 dark:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors active:scale-95"
                        >
                            <ChevronLeft className="w-6 h-6" strokeWidth={2.5} />
                        </button>
                    ) : (
                        <BrandTitle className="text-xl text-zinc-900 dark:text-zinc-100" />
                    )}

                </div>

                {/* Center: Title (Absolute) */}
                {title && (
                    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                        <span className="text-[16px] font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight opacity-100 transition-opacity">
                            {title}
                        </span>
                    </div>
                )}

                {/* Right: Placeholder / Future Actions */}
                <div className="flex items-center justify-end min-w-[40px]">
                    {/* Placeholder for balance or future settings icon */}
                    <div className="w-8 h-8" />
                </div>
            </div>
        </header>
    );
}
