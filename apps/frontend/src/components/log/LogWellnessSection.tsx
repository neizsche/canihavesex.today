import {
  Activity,
  ChevronRight,
  FileText,
  Heart,
  HeartPulse,
  Info,
  Moon,
  Smile,
  Zap,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { InsetGroup } from '@/components/common/ui/inset-group';
import { ChipGroup, FieldHeader, PillGroup } from './LogControls';
import { LOG_SCREEN_LABELS } from './LogScreen.config';
import { toggleInArray, type LogFormState } from './logState';
import {
  CHIP_ON_FACTORS,
  CHIP_ON_MOOD,
  CHIP_ON_SYMPTOMS,
  NOTES_ICON,
  ROW_DIVIDER,
  TILE,
} from './logStyles';

export function LogWellnessSection({
  form,
  showMore,
  toggleMore,
  filledFieldsSummary,
  patch,
}: {
  form: LogFormState;
  showMore: boolean;
  toggleMore: () => void;
  filledFieldsSummary: string | null;
  patch: (patch: Partial<LogFormState>) => void;
}) {
  return (
    <InsetGroup containerClassName="mb-0">
      <button
        onClick={toggleMore}
        className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
      >
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="text-[15px] font-medium text-zinc-700 dark:text-zinc-300">
            {LOG_SCREEN_LABELS.sections.showMore}
          </span>
          {!showMore && (
            <span
              className={cn(
                'block truncate text-[12px] leading-snug',
                filledFieldsSummary
                  ? 'font-medium text-blue-600 dark:text-blue-400'
                  : 'text-muted-foreground'
              )}
            >
              {filledFieldsSummary ?? LOG_SCREEN_LABELS.sections.showMoreHint}
            </span>
          )}
        </div>
        <ChevronRight
          className={cn(
            'icon-sm shrink-0 text-zinc-300 transition-transform duration-300',
            showMore && 'rotate-90'
          )}
        />
      </button>

      <div
        className={cn(
          'overflow-hidden transition-all duration-300 ease-out',
          showMore ? 'max-h-[1600px] opacity-100' : 'max-h-0 opacity-0'
        )}
      >
        <div className={ROW_DIVIDER} />

        <div className="py-3.5 px-4 flex flex-col gap-3">
          <FieldHeader
            icon={Activity}
            iconWrapClass={TILE.symptoms}
            label={LOG_SCREEN_LABELS.fields.symptoms}
          />
          <ChipGroup
            options={LOG_SCREEN_LABELS.bodySignals.symptoms}
            selected={form.bodySymptoms}
            onToggle={(id) => patch({ bodySymptoms: toggleInArray(form.bodySymptoms, id) })}
            activeClass={CHIP_ON_SYMPTOMS}
          />
        </div>

        <div className={ROW_DIVIDER} />

        <div className="py-3.5 px-4 flex flex-col gap-3">
          <FieldHeader
            icon={Smile}
            iconWrapClass={TILE.mood}
            label={LOG_SCREEN_LABELS.fields.mood}
          />
          <ChipGroup
            options={LOG_SCREEN_LABELS.bodySignals.mood}
            selected={form.mood}
            onToggle={(id) => patch({ mood: toggleInArray(form.mood, id) })}
            activeClass={CHIP_ON_MOOD}
          />
        </div>

        <div className={ROW_DIVIDER} />

        <div className="py-3.5 px-4 flex flex-col gap-3">
          <FieldHeader
            icon={Zap}
            iconWrapClass={TILE.energy}
            label={LOG_SCREEN_LABELS.fields.energy}
          />
          <PillGroup
            options={LOG_SCREEN_LABELS.bodySignals.energy}
            value={form.energy}
            onChange={(v) => patch({ energy: v })}
          />
        </div>

        <div className={ROW_DIVIDER} />

        <div className="py-3.5 px-4 flex flex-col gap-3">
          <FieldHeader
            icon={Moon}
            iconWrapClass={TILE.sleep}
            label={LOG_SCREEN_LABELS.fields.sleep}
          />
          <PillGroup
            options={LOG_SCREEN_LABELS.bodySignals.sleep}
            value={form.sleepQuality}
            onChange={(v) => patch({ sleepQuality: v })}
          />
        </div>

        <div className={ROW_DIVIDER} />

        <div className="py-3.5 px-4 flex flex-col gap-3">
          <FieldHeader
            icon={HeartPulse}
            iconWrapClass={TILE.libido}
            label={LOG_SCREEN_LABELS.fields.libido}
          />
          <PillGroup
            options={LOG_SCREEN_LABELS.bodySignals.libido}
            value={form.libido}
            onChange={(v) => patch({ libido: v })}
          />
        </div>

        <div className={ROW_DIVIDER} />

        <div className="py-3.5 px-4 flex flex-col gap-3">
          <FieldHeader
            icon={Heart}
            iconWrapClass={TILE.sex}
            label={LOG_SCREEN_LABELS.fields.sexActivity}
          />
          <PillGroup
            options={LOG_SCREEN_LABELS.bodySignals.sexActivity}
            value={form.sexActivity}
            onChange={(v) => patch({ sexActivity: v })}
          />
        </div>

        <div className={ROW_DIVIDER} />

        <div className="py-3.5 px-4 flex flex-col gap-3">
          <FieldHeader
            icon={Info}
            iconWrapClass={TILE.factors}
            label={LOG_SCREEN_LABELS.symptoms.disturbances.title}
          />
          <ChipGroup
            options={LOG_SCREEN_LABELS.symptoms.disturbances.options}
            selected={form.disturbances}
            onToggle={(id) => patch({ disturbances: toggleInArray(form.disturbances, id) })}
            activeClass={CHIP_ON_FACTORS}
          />
          <p className="text-[12px] text-muted-foreground leading-snug">
            {LOG_SCREEN_LABELS.hints.factors}
          </p>
        </div>

        <div className={ROW_DIVIDER} />

        <div className="py-3.5 px-4 flex flex-col gap-2">
          <FieldHeader
            icon={FileText}
            iconWrapClass={TILE.notes}
            iconClass={NOTES_ICON}
            label={LOG_SCREEN_LABELS.fields.notes}
          />
          <textarea
            value={form.notes}
            onChange={(e) => patch({ notes: e.target.value })}
            maxLength={100}
            placeholder="Add a note..."
            className="w-full min-h-[60px] text-[15px] font-normal bg-zinc-50/50 dark:bg-zinc-900/30 rounded-xl border-none focus:ring-0 focus:outline-none p-3 text-zinc-900 dark:text-white placeholder:text-zinc-300 resize-none"
          />
          <div className="flex justify-end">
            <span
              className={cn(
                'text-[11px] font-medium tracking-tight',
                form.notes.length >= 100 ? 'text-red-500' : 'text-muted-foreground'
              )}
            >
              {form.notes.length}/100
            </span>
          </div>
        </div>
      </div>
    </InsetGroup>
  );
}
