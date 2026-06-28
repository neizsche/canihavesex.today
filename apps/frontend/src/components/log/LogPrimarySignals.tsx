import {
  Activity,
  ChevronRight,
  Droplets,
  GraduationCap,
  Plus,
  TestTube,
  Thermometer,
  X,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { InsetGroup } from '@/components/common/ui/inset-group';
import { FieldHeader } from './LogControls';
import { LOG_SCREEN_LABELS } from './LogScreen.config';
import { clampBbtInput, type LogFormState } from './logState';
import { type TemperatureUnit, type bbtFieldConfig } from './temperatureUnits';

const MUCUS_OPTIONS = [
  { id: 'dry', label: LOG_SCREEN_LABELS.options.mucus[0] },
  { id: 'sticky', label: LOG_SCREEN_LABELS.options.mucus[1] },
  { id: 'creamy', label: LOG_SCREEN_LABELS.options.mucus[2] },
  { id: 'eggwhite', label: LOG_SCREEN_LABELS.options.mucus[3] },
];

const FLOW_OPTIONS = [
  { id: 'light', label: LOG_SCREEN_LABELS.options.flow.light },
  { id: 'medium', label: LOG_SCREEN_LABELS.options.flow.medium },
  { id: 'heavy', label: LOG_SCREEN_LABELS.options.flow.heavy },
];

function AddButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1 text-[15px] font-medium text-[#007AFF] dark:text-[#0A84FF] transition-transform active:scale-95"
    >
      <Plus className="icon-xs" strokeWidth={2.5} />
      {LOG_SCREEN_LABELS.buttons.add}
    </button>
  );
}

type BbtFieldConfig = ReturnType<typeof bbtFieldConfig>;

export function LogPrimarySignals({
  form,
  patch,
  mucusDisabled,
  mucusGuideOpen,
  onToggleMucusGuide,
  tempOpen,
  setTempOpen,
  lhOpen,
  setLhOpen,
  bbtField,
  tempUnit,
}: {
  form: LogFormState;
  patch: (patch: Partial<LogFormState>) => void;
  mucusDisabled: boolean;
  mucusGuideOpen: boolean;
  onToggleMucusGuide: () => void;
  tempOpen: boolean;
  setTempOpen: (open: boolean) => void;
  lhOpen: boolean;
  setLhOpen: (open: boolean) => void;
  bbtField: BbtFieldConfig;
  tempUnit: TemperatureUnit;
}) {
  return (
    <InsetGroup containerClassName="mb-0">
      <div className="flex flex-col">
        <div className="px-4 py-3.5 flex items-center justify-between min-h-[52px]">
          <FieldHeader
            icon={Droplets}
            iconWrapClass="rounded-full bg-rose-500 shadow-sm"
            label={LOG_SCREEN_LABELS.fields.period}
          />

          <button
            onClick={() => {
              const next = !form.bleeding;
              patch({ bleeding: next, spotting: next, flow: null });
            }}
            className={cn(
              'w-[51px] h-[31px] rounded-full relative transition-colors duration-200 ease-in-out cursor-pointer',
              form.bleeding ? 'bg-rose-500' : 'bg-zinc-200 dark:bg-zinc-700'
            )}
          >
            <span
              className={cn(
                'absolute top-[2px] left-[2px] w-[27px] h-[27px] bg-white rounded-full shadow-sm transition-transform duration-200 ease-[cubic-bezier(0.25,0.1,0.25,1)]',
                form.bleeding ? 'translate-x-[20px]' : 'translate-x-0'
              )}
            />
          </button>
        </div>

        <div
          className={cn(
            'overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]',
            form.bleeding ? 'max-h-52 opacity-100' : 'max-h-0 opacity-0'
          )}
        >
          <div className="px-4 pb-4 pt-0 space-y-4">
            <div className="h-px bg-zinc-100 dark:bg-zinc-800 mx-0" />
            <div className="flex bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl">
              <button
                onClick={() => patch({ spotting: true, flow: null })}
                className={cn(
                  'flex-1 py-1.5 rounded-[9px] text-[13px] font-semibold transition-all shadow-sm',
                  form.spotting
                    ? 'bg-rose-500 text-white shadow-md ring-1 ring-rose-600/20'
                    : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300 shadow-none bg-transparent'
                )}
              >
                Spotting
              </button>
              {FLOW_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => patch({ flow: opt.id, spotting: false, mucus: null })}
                  className={cn(
                    'flex-1 py-1.5 rounded-[9px] text-[13px] font-semibold transition-all shadow-sm',
                    !form.spotting && form.flow === opt.id
                      ? 'bg-rose-500 text-white shadow-md ring-1 ring-rose-600/20'
                      : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300 shadow-none bg-transparent'
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="h-px bg-zinc-100 dark:bg-zinc-800 mx-4" />

      <div className="flex flex-col py-3.5 px-4 gap-3">
        <div
          className={cn(
            'flex flex-col gap-3 transition-opacity duration-300',
            mucusDisabled && 'pointer-events-none opacity-40'
          )}
          aria-disabled={mucusDisabled}
        >
          <FieldHeader
            icon={Activity}
            iconWrapClass="rounded-sm bg-blue-500 shadow-sm"
            label={LOG_SCREEN_LABELS.fields.cervicalMucus}
          />
          <div className="grid grid-cols-2 gap-2.5">
            {MUCUS_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                tabIndex={mucusDisabled ? -1 : undefined}
                onClick={() => patch({ mucus: form.mucus === opt.id ? null : opt.id })}
                className={cn(
                  'py-2.5 px-3 rounded-xl text-[15px] font-medium text-center transition-all border shadow-sm',
                  form.mucus === opt.id
                    ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 ring-1 ring-blue-500/20'
                    : 'bg-white dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        <p className="text-[12px] text-muted-foreground leading-snug">
          {mucusDisabled
            ? LOG_SCREEN_LABELS.hints.cervicalMucusDisabled
            : LOG_SCREEN_LABELS.hints.cervicalMucus}
        </p>

        {!mucusDisabled && (
          <div className="flex flex-col mt-0.5">
            <button
              onClick={onToggleMucusGuide}
              className="flex items-center gap-1 text-[13px] font-medium text-[#007AFF] dark:text-[#0A84FF] self-start transition-opacity active:opacity-70"
            >
              {LOG_SCREEN_LABELS.cervicalMucusGuide.title}
              <ChevronRight
                className={cn(
                  'h-3.5 w-3.5 transition-transform duration-200',
                  mucusGuideOpen && 'rotate-90'
                )}
                strokeWidth={2.5}
              />
            </button>

            <div
              className={cn(
                'overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]',
                mucusGuideOpen ? 'max-h-[1200px] opacity-100 mt-3' : 'max-h-0 opacity-0 mt-0'
              )}
            >
              <div className="flex flex-col gap-3.5 text-[13px] text-muted-foreground leading-snug pb-2">
                <p>{LOG_SCREEN_LABELS.cervicalMucusGuide.intro}</p>

                <div className="flex flex-col gap-3">
                  {LOG_SCREEN_LABELS.cervicalMucusGuide.types.map((type) => (
                    <div key={type.name} className="flex flex-col gap-0.5">
                      <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                        {type.name}
                      </span>
                      <span>{type.description}</span>
                    </div>
                  ))}
                </div>

                <div className="flex flex-col gap-3 pt-1">
                  <p>{LOG_SCREEN_LABELS.cervicalMucusGuide.lookAlikesIntro}</p>
                  {LOG_SCREEN_LABELS.cervicalMucusGuide.lookAlikes.map((type) => (
                    <div key={type.name} className="flex flex-col gap-0.5">
                      <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                        {type.name}
                      </span>
                      <span>{type.description}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="h-px bg-zinc-100 dark:bg-zinc-800 mx-4" />

      <div className="px-4 py-3.5 flex flex-col gap-1.5">
        <div className="flex items-center justify-between min-h-[28px]">
          <FieldHeader
            icon={Thermometer}
            iconWrapClass="rounded-sm bg-orange-500 shadow-sm"
            label={LOG_SCREEN_LABELS.fields.basalTemp}
          />
          {tempOpen || form.bbt ? (
            <div className="flex items-center gap-2">
              <input
                type="number"
                inputMode="decimal"
                min={bbtField.min}
                max={bbtField.max}
                step={bbtField.step}
                placeholder={bbtField.placeholder}
                autoFocus={tempOpen && !form.bbt}
                value={form.bbt}
                onChange={(e) => patch({ bbt: e.target.value })}
                onBlur={(e) => {
                  const clamped = clampBbtInput(e.target.value, tempUnit);
                  if (clamped !== form.bbt) patch({ bbt: clamped });
                }}
                className="w-20 text-right text-[17px] font-normal bg-transparent border-none focus:ring-0 p-0 text-zinc-900 dark:text-white placeholder:text-zinc-300 focus:text-blue-500"
              />
              <span className="text-muted-foreground text-[17px]">{bbtField.label}</span>
              <button
                onClick={() => {
                  patch({ bbt: '' });
                  setTempOpen(false);
                }}
                className="p-1.5 -mr-1.5 ml-1 rounded-full text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all active:scale-95"
                aria-label="Clear temperature"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <AddButton onClick={() => setTempOpen(true)} />
          )}
        </div>
        {(tempOpen || form.bbt) && (
          <p className="text-[12px] text-muted-foreground leading-snug">
            {LOG_SCREEN_LABELS.hints.temperature}
          </p>
        )}
      </div>

      <div className="h-px bg-zinc-100 dark:bg-zinc-800 mx-4" />

      <div className="px-4 py-3.5 flex flex-col gap-3">
        <div className="flex items-center justify-between min-h-[28px]">
          <FieldHeader
            icon={TestTube}
            iconWrapClass="rounded-sm bg-indigo-500 shadow-sm"
            label={LOG_SCREEN_LABELS.fields.lhTest}
          />
          {!(lhOpen || form.lhTest) ? (
            <AddButton onClick={() => setLhOpen(true)} />
          ) : (
            <button
              onClick={() => {
                patch({ lhTest: null });
                setLhOpen(false);
              }}
              className="p-1.5 -mr-1.5 rounded-full text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all active:scale-95"
              aria-label="Clear LH test"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        {(lhOpen || form.lhTest) && (
          <>
            <div className="flex bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl">
              <button
                onClick={() => patch({ lhTest: form.lhTest === 'negative' ? null : 'negative' })}
                className={cn(
                  'flex-1 py-1.5 rounded-[9px] text-[13px] font-semibold transition-all transition-shadow',
                  form.lhTest === 'negative'
                    ? 'bg-white dark:bg-zinc-600 text-zinc-900 dark:text-white shadow-sm ring-1 ring-black/5'
                    : 'text-zinc-500 dark:text-zinc-400'
                )}
              >
                {LOG_SCREEN_LABELS.options.lhTest.negative}
              </button>
              <button
                onClick={() => patch({ lhTest: form.lhTest === 'positive' ? null : 'positive' })}
                className={cn(
                  'flex-1 py-1.5 rounded-[9px] text-[13px] font-semibold transition-all transition-shadow',
                  form.lhTest === 'positive'
                    ? 'bg-white dark:bg-zinc-600 text-rose-500 dark:text-rose-300 shadow-sm ring-1 ring-black/5'
                    : 'text-zinc-500 dark:text-zinc-400'
                )}
              >
                {LOG_SCREEN_LABELS.options.lhTest.positive}
              </button>
            </div>
            <p className="text-[12px] text-muted-foreground leading-snug">
              {LOG_SCREEN_LABELS.hints.lhTest}
            </p>
          </>
        )}
      </div>
    </InsetGroup>
  );
}

export function LogCoachButton({ onClick }: { onClick: () => void }) {
  return (
    <div className="mt-3 flex justify-center">
      <button
        onClick={onClick}
        className="group inline-flex items-center gap-2 rounded-full border border-border/40 bg-card/70 py-1.5 pl-2 pr-3 shadow-sm backdrop-blur-xl transition-all hover:bg-card hover:shadow active:scale-95"
      >
        <span className="flex h-[22px] w-[22px] items-center justify-center rounded-full bg-blue-500/10 dark:bg-blue-400/10">
          <GraduationCap
            className="h-[13px] w-[13px] text-blue-600 dark:text-blue-400"
            strokeWidth={2.5}
          />
        </span>
        <span className="text-[13px] font-medium tracking-tight text-zinc-700 dark:text-zinc-200">
          {LOG_SCREEN_LABELS.coach.title}
        </span>
        <ChevronRight className="h-3.5 w-3.5 text-zinc-300 transition-transform duration-200 group-hover:translate-x-0.5 dark:text-zinc-600" />
      </button>
    </div>
  );
}
