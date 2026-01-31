import * as React from 'react';
import { cn } from '../../../lib/utils';
import { LucideIcon } from 'lucide-react';

interface InputRowProps {
    label: string;
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
    unit?: string;
    type?: string;
    icon?: LucideIcon;
    iconBg?: string;
    iconColor?: string;
    disabled?: boolean;
    onHelp?: () => void;
}

import { useLongPress } from '../hooks/useLongPress';

export function InputRow({
    label,
    value,
    onChange,
    placeholder,
    unit,
    type = "text",
    icon: Icon,
    iconBg = "bg-zinc-500",
    iconColor = "text-white",
    disabled = false,
    onHelp
}: InputRowProps) {
    const longPressProps = useLongPress(() => onHelp?.(), 600);

    return (
        <div
            className="flex items-center justify-between h-[var(--row-h)] px-4 border-b border-border/30 last:border-0 bg-card active:bg-zinc-50 dark:active:bg-zinc-900/50 transition-all select-none"
            {...longPressProps}
            onContextMenu={(e) => {
                if (onHelp) {
                    e.preventDefault();
                    onHelp();
                }
            }}
        >
            <div className="flex items-center gap-3">
                {Icon && (
                    <div className={cn("w-[calc(1.75rem*var(--scale-factor))] h-[calc(1.75rem*var(--scale-factor))] rounded-md flex items-center justify-center flex-shrink-0", iconBg)}>
                        <Icon className={cn("icon-sm", iconColor)} strokeWidth={2.5} />
                    </div>
                )}
                <span className="text-[calc(17px*var(--font-scale))] font-normal text-foreground">{label}</span>
            </div>
            <div className="flex items-center gap-1.5" onPointerDown={(e) => e.stopPropagation()}>
                <input
                    type={type}
                    value={value}
                    disabled={disabled}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder}
                    className="text-right bg-transparent outline-none text-foreground text-[calc(17px*var(--font-scale))] font-normal w-24 placeholder:text-muted-foreground/30 font-sans transition-colors focus:text-[#007aff] disabled:opacity-50"
                />
                {unit && <span className="text-[calc(17px*var(--font-scale))] text-zinc-400 font-normal">{unit}</span>}
            </div>
        </div>
    );
}
