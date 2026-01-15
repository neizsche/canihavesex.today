import * as React from 'react';
import { InsetGroup } from './ui/inset-group';
import { ChevronRight } from 'lucide-react';

interface OnboardingIntentProps {
    onSelect: (intent: 'avoid_pregnancy' | 'conceive' | 'understand_cycle') => void;
}

export function OnboardingIntent({ onSelect }: OnboardingIntentProps) {
    const options = [
        { value: 'avoid_pregnancy' as const, label: 'Avoid pregnancy' },
        { value: 'conceive' as const, label: 'Try to conceive' },
        { value: 'understand_cycle' as const, label: 'Understand my cycle' }
    ];

    return (
        <div className="h-full bg-background font-sans flex flex-col overflow-y-auto">
            <div className="max-w-md mx-auto w-full px-4 pt-20 pb-8">
                <h1 className="text-[34px] font-bold tracking-tight text-zinc-900 dark:text-zinc-100 leading-tight pb-6 px-4">
                    What's your goal?
                </h1>

                <InsetGroup>
                    {options.map((option, index) => (
                        <button
                            key={option.value}
                            onClick={() => onSelect(option.value)}
                            className="w-full h-12 flex items-center justify-between px-4 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all duration-200 active:bg-zinc-200 dark:active:bg-zinc-700 border-b last:border-b-0 border-zinc-200 dark:border-zinc-700/50"
                        >
                            <span className="text-[17px] text-zinc-900 dark:text-zinc-100">
                                {option.label}
                            </span>
                            <ChevronRight className="w-5 h-5 text-zinc-400" />
                        </button>
                    ))}
                </InsetGroup>
            </div>
        </div>
    );
}
