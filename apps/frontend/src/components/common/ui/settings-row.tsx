import * as React from 'react';
import { cn } from '../../../lib/utils';
import { ChevronRight } from 'lucide-react';

interface SettingsActionRowProps {
    icon: React.ReactNode;
    iconBgColor: string;
    label: string;
    onClick: () => void;
    disabled?: boolean;
    destructive?: boolean;
    className?: string;
}

export function SettingsActionRow({
    icon,
    iconBgColor,
    label,
    onClick,
    disabled,
    destructive,
    className
}: SettingsActionRowProps) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            className={cn(
                "w-full min-h-[44px] sm:min-h-[48px] flex items-center justify-between px-4 py-3 transition-all duration-200 disabled:opacity-50",
                destructive 
                    ? "hover:bg-rose-100 dark:hover:bg-rose-950/30 active:bg-rose-200 dark:active:bg-rose-950/40" 
                    : "hover:bg-zinc-100 dark:hover:bg-zinc-800 active:bg-zinc-200 dark:active:bg-zinc-700",
                className
            )}
        >
            <div className="flex items-center gap-3 text-left">
                <div className={cn("w-7 h-7 rounded-md flex items-center justify-center shrink-0", iconBgColor)}>
                    {icon}
                </div>
                <div className="font-normal text-[15px] sm:text-[17px] text-zinc-900 dark:text-zinc-100">
                    {label}
                </div>
            </div>
            <ChevronRight className={cn("icon-sm", destructive ? "text-rose-400/50" : "text-zinc-300")} />
        </button>
    );
}

interface SettingsExpandableRowProps {
    icon: React.ReactNode;
    iconBgColor: string;
    title: string;
    description?: React.ReactNode;
    open: boolean;
    onToggle: () => void;
    children: React.ReactNode;
    className?: string;
}

export function SettingsExpandableRow({
    icon,
    iconBgColor,
    title,
    description,
    open,
    onToggle,
    children,
    className
}: SettingsExpandableRowProps) {
    return (
        <div className={cn("divide-y divide-zinc-200/50 dark:divide-zinc-800/50", className)}>
            <button
                type="button"
                onClick={onToggle}
                aria-expanded={open}
                className="w-full min-h-[44px] sm:min-h-[48px] flex items-center justify-between px-4 py-3 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all duration-200 active:bg-zinc-200 dark:active:bg-zinc-700"
            >
                <div className="flex items-center gap-3 text-left">
                    <div className={cn("w-7 h-7 rounded-md flex items-center justify-center shrink-0", iconBgColor)}>
                        {icon}
                    </div>
                    <div className={cn(description ? "space-y-0.5" : "")}>
                        <div className="font-normal text-[15px] sm:text-[17px] text-zinc-900 dark:text-zinc-100">
                            {title}
                        </div>
                        {description && (
                            <div className="text-xs text-zinc-500 dark:text-zinc-400">
                                {description}
                            </div>
                        )}
                    </div>
                </div>
                <ChevronRight
                    className={cn(
                        "icon-sm text-zinc-300 transition-transform",
                        open && "rotate-90 text-zinc-500"
                    )}
                />
            </button>

            <div
                className={cn(
                    "px-4 transition-all duration-300",
                    open ? "pt-4 pb-5 opacity-100 max-h-[1200px]" : "py-0 opacity-0 max-h-0 overflow-hidden pointer-events-none",
                    // Apply space-y-4 only to the inner content so padding doesn't get weird
                )}
            >
                <div className="space-y-4">
                    {children}
                </div>
            </div>
        </div>
    );
}

interface SettingsToggleRowProps {
    icon: React.ReactNode;
    iconBgColor: string;
    label: string;
    description?: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
    disabled?: boolean;
    className?: string;
}

export function SettingsToggleRow({
    icon,
    iconBgColor,
    label,
    description,
    checked,
    onChange,
    disabled,
    className
}: SettingsToggleRowProps) {
    return (
        <div
            className={cn(
                "w-full min-h-[44px] sm:min-h-[48px] flex items-center justify-between px-4 py-3",
                className
            )}
        >
            <div className="flex items-center gap-3 text-left flex-1 min-w-0">
                <div className={cn("w-7 h-7 rounded-md flex items-center justify-center shrink-0", iconBgColor)}>
                    {icon}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="font-normal text-[15px] sm:text-[17px] text-zinc-900 dark:text-zinc-100">
                        {label}
                    </div>
                    {description && (
                        <div className="text-[11px] sm:text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                            {description}
                        </div>
                    )}
                </div>
            </div>
            {/* iOS-style toggle switch */}
            <button
                type="button"
                role="switch"
                aria-checked={checked}
                aria-label={label}
                disabled={disabled}
                onClick={() => onChange(!checked)}
                className={cn(
                    "relative inline-flex h-[31px] w-[51px] shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#007aff] disabled:opacity-50 disabled:cursor-not-allowed",
                    checked ? "bg-[#34c759]" : "bg-zinc-200 dark:bg-zinc-600"
                )}
            >
                <span
                    className={cn(
                        "pointer-events-none inline-block h-[27px] w-[27px] rounded-full bg-white shadow-lg ring-0 transition-transform duration-200 ease-in-out",
                        checked ? "translate-x-5" : "translate-x-0"
                    )}
                />
            </button>
        </div>
    );
}
