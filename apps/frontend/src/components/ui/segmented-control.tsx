import * as React from 'react';
import { cn } from '../../lib/utils';

interface SegmentedControlProps<T extends string> {
    label: string;
    options: { value: T; label: string }[];
    value: T;
    onChange: (v: T) => void;
    activeBgClass: string;
    activeTextClass: string;
    disabled?: boolean;
    onHelp?: () => void;
}

import { useLongPress } from '../../hooks/useLongPress';

export function SegmentedControl<T extends string>({
    label,
    options,
    value,
    onChange,
    activeBgClass,
    activeTextClass,
    disabled = false,
    onHelp
}: SegmentedControlProps<T>) {
    const longPressProps = useLongPress(() => onHelp?.(), 600);

    return (
        <div
            className="px-4 py-3 sm:py-3.5 border-b border-border/30 last:border-0 flex flex-col gap-2 bg-card active:bg-zinc-50 dark:active:bg-zinc-900/50 transition-all select-none"
            {...longPressProps}
            onContextMenu={(e) => {
                if (onHelp) {
                    e.preventDefault();
                    onHelp();
                }
            }}
        >
            <div className="flex items-center justify-between pl-0.5">
                <span className="text-[calc(10px*var(--font-scale))] font-bold text-zinc-400 uppercase tracking-widest">{label}</span>
            </div>
            <div className="flex bg-zinc-100 dark:bg-zinc-800/50 p-1 rounded-xl" onPointerDown={(e) => e.stopPropagation()}>
                {options.map(opt => {
                    const isActive = value === opt.value;
                    return (
                        <button
                            key={opt.value}
                            disabled={disabled}
                            onClick={() => onChange(opt.value)}
                            className={cn(
                                "flex-1 py-1.5 sm:py-2 text-[calc(13px*var(--font-scale))] font-bold rounded-lg transition-all duration-200 ease-out active:scale-[0.96] disabled:opacity-50 disabled:active:scale-100",
                                isActive
                                    ? cn("shadow-sm bg-white dark:bg-zinc-700 transform", activeTextClass)
                                    : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
                            )}
                        >
                            {opt.label}
                        </button>
                    )
                })}
            </div>
        </div>
    );
}
