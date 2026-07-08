import * as React from 'react';
import { CheckCircle2 } from 'lucide-react';

import { InsetGroup } from '@/components/common/ui/inset-group';
import { StepperRow } from '@/components/common/ui/stepper-row';
import { SegmentedTabs } from '@/components/common/ui/segmented-tabs';
import { useProfileSettings, type CycleRegularity } from '@/hooks/queries/useProfileSettings';
import { SECTION_CAPTION } from '@/lib/typography';
import { SettingsSubScreen } from './SettingsSubScreen';

const REGULARITY_TABS: { value: CycleRegularity; label: string }[] = [
  { value: 'regular', label: 'Regular' },
  { value: 'irregular', label: 'Irregular' },
  { value: 'unsure', label: 'Unsure' },
];

/**
 * Cycle Configuration — the cycle length / typical period / regularity inputs
 * that shape fertility predictions. Its own pushed screen rather than an inline
 * accordion so the main Settings list stays glanceable. Uses the shared
 * InsetGroup / StepperRow / SegmentedTabs so it reads as one app.
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
      <p className="px-4 text-[15px] leading-relaxed text-muted-foreground">
        These shape your fertility predictions. Update them whenever your cycle changes.
      </p>

      <InsetGroup>
        <StepperRow
          label="Cycle length"
          value={cycleLength}
          min={21}
          max={35}
          unit="days"
          onChange={(v) => {
            setCycleLength(v);
            saveProfile({ avg_cycle_length: v });
          }}
        />
        <div className="h-px bg-zinc-200/50 dark:bg-zinc-800/50 mx-4" />
        <StepperRow
          label="Typical period"
          value={periodLength}
          min={3}
          max={7}
          unit="days"
          onChange={(v) => {
            setPeriodLength(v);
            saveProfile({ period_length: v });
          }}
        />
      </InsetGroup>

      <div className="px-4 space-y-2">
        <div className={`ml-1 ${SECTION_CAPTION}`}>
          Regularity
        </div>
        <SegmentedTabs
          tabs={REGULARITY_TABS}
          value={regularity}
          onChange={(v) => {
            setRegularity(v);
            saveProfile({ cycle_regularity: v });
          }}
        />
      </div>

      {profileSaved && (
        <div className="flex items-center gap-1.5 px-4 animate-in fade-in duration-200">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
          <span className="text-[11px] font-medium text-emerald-500">Saved</span>
        </div>
      )}
    </SettingsSubScreen>
  );
}
