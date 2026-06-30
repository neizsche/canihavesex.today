import * as React from 'react';
import { cn } from '@/lib/utils';

export function InsetGroup({
  title,
  children,
  className,
  containerClassName,
}: {
  title?: string;
  children: React.ReactNode;
  className?: string;
  containerClassName?: string;
}) {
  return (
    <div className={cn('space-y-1 mb-[var(--inset-gap)] mx-4', containerClassName)}>
      {title && (
        <h3 className="uppercase text-[calc(10px*var(--font-scale))] sm:text-[calc(11px*var(--font-scale))] font-bold text-muted-foreground/70 ml-4 tracking-wide">
          {title}
        </h3>
      )}
      <div
        className={cn(
          'bg-card text-card-foreground rounded-2xl overflow-hidden border border-border/30',
          className
        )}
      >
        {children}
      </div>
    </div>
  );
}
