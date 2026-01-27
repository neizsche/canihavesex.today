import * as React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './button';
import { cn } from '../../../lib/utils';

interface DateNavigatorProps {
    label: string;
    sublabel?: string;
    onPrev: () => void;
    onNext: () => void;
    prevDisabled?: boolean;
    nextDisabled?: boolean;
}

export function DateNavigator({
    label,
    sublabel,
    onPrev,
    onNext,
    prevDisabled = false,
    nextDisabled = false
}: DateNavigatorProps) {
    return (
        <div className="px-4 py-3 mb-4">
            <div className="flex items-center justify-between">
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-full bg-card shadow-sm active:scale-95 transition-all"
                    onClick={onPrev}
                    disabled={prevDisabled}
                >
                    <ChevronLeft className="icon-md text-zinc-600 dark:text-zinc-400" />
                </Button>

                <div className="flex flex-col items-center">
                    <div className="text-[20px] font-bold tracking-tight text-zinc-900 dark:text-white transition-colors">
                        {label}
                    </div>
                </div>

                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-full bg-card shadow-sm active:scale-95 transition-all"
                    onClick={onNext}
                    disabled={nextDisabled}
                >
                    <ChevronRight className={cn("icon-md text-zinc-600 dark:text-zinc-400", nextDisabled && "opacity-30")} />
                </Button>
            </div>
        </div>
    );
}
