import * as React from 'react';
import { Button } from './ui/button';
import { cn } from '../../lib/utils';
import { BRAND } from '../../lib/siteConfig';
import type { EducationScreen } from '../../lib/education-content';

interface EducationModalProps {
    isOpen: boolean;
    onClose: () => void;
    screens: EducationScreen[];
    onComplete: () => void;
}

/**
 * EducationModal - Apple Health style education flow
 * 
 * Design constraints:
 * - No illustrations, charts, or mascots
 * - System fonts only
 * - White/system background
 * - One idea per screen
 * - No progress indicators (only dots)
 * - Minimal, calm aesthetic
 */
export function EducationModal({ isOpen, onClose, screens, onComplete }: EducationModalProps) {
    const [currentIndex, setCurrentIndex] = React.useState(0);
    const [mounted, setMounted] = React.useState(false);

    // Reset to first screen when modal opens
    React.useEffect(() => {
        if (isOpen) {
            setCurrentIndex(0);
            setMounted(true);
        } else {
            const timer = setTimeout(() => setMounted(false), 300);
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    if (!mounted && !isOpen) return null;

    const currentScreen = screens[currentIndex];
    const isLastScreen = currentIndex === screens.length - 1;

    function handleContinue() {
        if (isLastScreen) {
            onComplete();
        } else {
            setCurrentIndex(prev => prev + 1);
        }
    }

    // Prevent closing during education flow (no backdrop click, no cancel)
    // User must complete or we close programmatically after completion

    return (
        <div
            className={cn(
                "fixed inset-0 z-[100] flex flex-col items-center bg-white dark:bg-black transition-opacity duration-300",
                isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
            )}
        >
            <div className="flex-shrink-0 pt-8 pb-4 flex items-center justify-center z-50">
                <div className="text-[22px] tracking-tight text-zinc-900 dark:text-zinc-100 font-bold whitespace-nowrap">
                    {BRAND.PREFIX}<span className="text-rose-500 font-extrabold italic">{BRAND.HIGHLIGHT}</span>{BRAND.SUFFIX}
                </div>
            </div>

            <div className="flex-1 w-full flex items-center justify-center">
                <div
                    className={cn(
                        "w-full max-w-md px-6 py-12 transition-all duration-300 ease-out transform",
                        isOpen ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-4 scale-95 opacity-0'
                    )}
                >
                    {/* Content container */}
                    <div className="flex flex-col items-center text-center space-y-8">

                        {/* Title */}
                        <h1 className="text-[32px] sm:text-[34px] font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 leading-tight max-w-sm">
                            {currentScreen.title}
                        </h1>

                        {/* Body text */}
                        <div className="space-y-4">
                            <p className="text-[17px] text-zinc-700 dark:text-zinc-300 leading-relaxed whitespace-pre-line max-w-sm">
                                {currentScreen.body}
                            </p>

                            {/* Helper text (smaller, muted) */}
                            {currentScreen.helperText && (
                                <p className="text-[13px] text-zinc-500 dark:text-zinc-400 leading-snug max-w-sm">
                                    {currentScreen.helperText}
                                </p>
                            )}
                        </div>

                        {/* Action button */}
                        <div className="w-full max-w-xs pt-6">
                            <Button
                                onClick={handleContinue}
                                className="w-full h-14 text-[17px] font-semibold bg-[#007aff] hover:bg-[#0051d5] text-white rounded-xl transition-colors"
                            >
                                {currentScreen.finalAction || 'Continue'}
                            </Button>
                        </div>

                        {/* Progress dots */}
                        <div className="flex items-center gap-2 pt-4">
                            {screens.map((_, index) => (
                                <div
                                    key={index}
                                    className={cn(
                                        "w-2 h-2 rounded-full transition-colors",
                                        index === currentIndex
                                            ? "bg-zinc-500 dark:bg-zinc-400"
                                            : "bg-zinc-300 dark:bg-zinc-600"
                                    )}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
