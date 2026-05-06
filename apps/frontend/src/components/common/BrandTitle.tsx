import * as React from 'react';
import { BRAND } from '../../lib/siteConfig';
import { cn } from '../../lib/utils';

interface BrandTitleProps {
    className?: string; // Allow overriding text size/color
    showLogo?: boolean; // Optional: if we want to include the icon
}

export function BrandTitle({ className, showLogo = false }: BrandTitleProps) {
    return (
        <div className={cn("flex items-center gap-1.5 select-none text-[22px] text-zinc-900 dark:text-zinc-100", className)}>
            <span className="tracking-tight font-bold">
                {BRAND.PREFIX}
                <span className="text-rose-500 font-extrabold italic mx-[1px]">{BRAND.HIGHLIGHT}</span>
                {BRAND.SUFFIX}
            </span>
        </div>
    );
}
