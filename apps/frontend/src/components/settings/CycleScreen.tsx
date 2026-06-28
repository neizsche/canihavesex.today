import * as React from 'react';
import { CheckCircle2 } from 'lucide-react';

import { cn } from '@/lib/utils';
import { StepperRow } from '@/components/common/ui/stepper-row';
import { useProfileSettings } from '@/hooks/queries/useProfileSettings';
import { SettingsSubScreen } from './SettingsSubScreen';

/**
 * Cycle Configuration — the cycle length / typical period / regularity inputs
 * that shape fertility predictions. Its own pushed screen rather than an inline
 * accordion so the main Settings list stays glanceable.
 */
export function CycleScreen({ onBack }: { onBack: () => void }) {
  const {
    cycleLength,
    setCycleLength,
    periodLength,
    setPeriodLength,
    regularity,
    setRegularity,
    saveProfile,
    profileSaved,
  } = useProfileSettings();

  return (
    <SettingsSubScreen title="Cycle" onBack={onBack}>
      <div className="px-4 space-y-4">
        <p className="text-[15px] leading-relaxed text-muted-foreground">
          These shape your fertility predictions. Update them whenever your cycle changes.
        </p>

        {/* Grouped stepper card */}
        <div className="rounded-2xl border border-border/40 bg-white/70 dark:bg-zinc-900/50 overflow-hidden">
          <div className="divide-y divide-zinc-200/50 dark:divide-zinc-800/50">
            <StepperRow
              label="Cycle Length"
              value={cycleLength}
              min={21}
              max={35}
              unit="days"
              onChange={(v) => {
                setCycleLength(v);
                saveProfile({ avg_cycle_length: v });
              }}
            />
            <StepperRow
              label="Typical Period"
              value={periodLength}
              min={3}
              max={7}
              unit="days"
              onChange={(v) => {
                setPeriodLength(v);
                saveProfile({ period_length: v });
              }}
            />
          </div>
        </div>

        {/* Segmented control for regularity */}
        <div className="space-y-1.5 pt-2">
          <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground pl-2">
            Cycle Regularity
          </div>
          <div className="flex items-center p-1 bg-zinc-100/80 dark:bg-zinc-800/80 rounded-xl">
            {(['regular', 'irregular', 'unsure'] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => {
                  setRegularity(option);
                  saveProfile({ cycle_regularity: option });
                }}
                className={cn(
                  'flex-1 py-2 text-[12px] font-medium capitalize rounded-lg transition-all duration-200',
                  regularity === option
                    ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm'
                    : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300'
                )}
              >
                {option}
              </button>
            ))}
          </div>
        </div>

        {/* Saved indicator */}
        {profileSaved && (
          <div className="flex items-center gap-1.5 pt-1 animate-in fade-in duration-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            <span className="text-[11px] font-medium text-emerald-500">Saved</span>
          </div>
        )}
      </div>
    </SettingsSubScreen>
  );
}
