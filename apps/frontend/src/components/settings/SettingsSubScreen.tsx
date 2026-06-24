import * as React from 'react';

import { Header } from '@/components/common/Header';

interface SettingsSubScreenProps {
  title: string;
  onBack: () => void;
  children: React.ReactNode;
}

/**
 * Shared shell for a pushed Settings sub-screen (Account, Cycle, Shortcuts).
 * A back-titled header over the same scroll container and column the main
 * Settings screen uses, with the standard slide-in. Keeps every drill-down
 * visually identical.
 */
export function SettingsSubScreen({ title, onBack, children }: SettingsSubScreenProps) {
  return (
    <div className="h-full bg-background font-sans flex flex-col animate-in slide-in-from-right duration-300">
      <Header onBack={onBack} title={title} />
      <div className="flex-1 overflow-y-auto no-scrollbar min-h-0">
        <div className="pb-24 pt-6 sm:pt-8">
          <div className="max-w-md mx-auto space-y-6 sm:space-y-8">{children}</div>
        </div>
      </div>
    </div>
  );
}
