import * as React from 'react';
import { ChevronLeft } from 'lucide-react';

import { BrandTitle } from './BrandTitle';
import { useDiscreetMode } from '@/hooks/queries/useDiscreetMode';

interface HeaderProps {
  onBack?: () => void;
  title?: string;
}

export function Header({ onBack, title }: HeaderProps) {
  const { showBranding } = useDiscreetMode();

  // Discreet mode: hide the entire header unless a title or back button is needed
  if (!showBranding && !onBack && !title) {
    return null;
  }

  return (
    <header className="flex-shrink-0 bg-background/80 backdrop-blur-xl sticky top-0 z-50 transition-all duration-200">
      <div className="max-w-md mx-auto px-4 pt-8 pb-4 flex items-center justify-center relative">
        {/* Left: Navigation */}
        {onBack && (
          <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center">
            <button
              onClick={onBack}
              className="flex items-center justify-center w-8 h-8 rounded-full text-zinc-900 dark:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors active:scale-95"
            >
              <ChevronLeft className="w-6 h-6" strokeWidth={2.5} />
            </button>
          </div>
        )}

        {/* Center: Title or Branding */}
        <div className="flex items-center justify-center">
          {title ? (
            <span className="text-[19px] font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
              {title}
            </span>
          ) : showBranding ? (
            <BrandTitle />
          ) : null}
        </div>

        {/* Right: Placeholder for symmetry */}
        <div className="min-w-[40px] absolute right-4" />
      </div>
    </header>
  );
}
