import * as React from 'react';
import {
  Thermometer,
  Droplets,
  Activity,
  ChevronRight,
  CheckCircle2,
  TestTube,
  Info,
  FileText,
  Sparkles,
  X,
  Smile,
  Zap,
  Moon,
  HeartPulse,
  Heart,
  Lock,
} from 'lucide-react';

import { currentReturnTo, UnauthorizedError } from '@/lib/api';
import { cn } from '@/lib/utils';
import { todayIso, addDays } from '@/lib/date';
import { Button } from '@/components/common/ui/button';
import { Header } from '@/components/common/Header';
import { DateNavigator } from '@/components/common/ui/date-navigator';
import { InsetGroup } from '@/components/common/ui/inset-group';
import { LOG_SCREEN_LABELS } from './LogScreen.config';
import { useLog, useSaveLog } from '@/hooks/queries/useLogs';
import { useDiscreetMode } from '@/hooks/queries/useDiscreetMode';
import { FieldHeader, PillGroup, ChipGroup } from './LogControls';
import {
  EMPTY_LOG_STATE,
  LogFormState,
  logFormReducer,
  payloadToFormState,
  suggestionToFormState,
  formStateToPayload,
  hasAdvancedData,
  hasAnyInput,
  isLogDirty,
  toggleInArray,
} from './logState';

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

const CHIP_ACTIVE_SYMPTOMS =
  'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300';
const CHIP_ACTIVE_FACTORS =
  'bg-zinc-100 dark:bg-zinc-700 border-zinc-300 dark:border-zinc-600 text-zinc-800 dark:text-zinc-200';

export function LogScreen() {
  const { showBranding } = useDiscreetMode();
  const [date, setDate] = React.useState<string>(() => {
    if (typeof window !== 'undefined') {
      const parts = window.location.hash.split('?');
      if (parts.length > 1) {
        const params = new URLSearchParams(parts[1]);
        const d = params.get('date');
        if (d && /^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
      }
    }
    return todayIso();
  });

  const [form, dispatch] = React.useReducer(logFormReducer, EMPTY_LOG_STATE);
  const patch = React.useCallback(
    (p: Partial<LogFormState>) => dispatch({ type: 'patch', patch: p }),
    []
  );

  // UI state
  const [isPrefilled, setIsPrefilled] = React.useState(false);
  const [showAdvanced, setShowAdvanced] = React.useState(false);
  const [success, setSuccess] = React.useState(false);

  // Last saved snapshot, for dirty checking.
  const [savedState, setSavedState] = React.useState<LogFormState>(EMPTY_LOG_STATE);

  const query = useLog(date);
  const saveMutation = useSaveLog();

  const hasData = query.data?.found;

  React.useEffect(() => {
    if (date > todayIso()) {
      setDate(todayIso());
      window.location.hash = `#/log?date=${todayIso()}`;
      return;
    }

    setIsPrefilled(false);
    if (!query.data) return;

    if (query.data.found && query.data.payload) {
      const next = payloadToFormState(query.data.payload);
      dispatch({ type: 'reset', state: next });
      setSavedState(next);
      setShowAdvanced(hasAdvancedData(query.data.payload));
    } else if (!query.data.found) {
      if (query.data.suggestion) {
        dispatch({ type: 'reset', state: suggestionToFormState(query.data.suggestion) });
        setSavedState(EMPTY_LOG_STATE);
        setShowAdvanced(!!query.data.suggestion.temperature);
        setIsPrefilled(true);
      } else {
        dispatch({ type: 'reset', state: EMPTY_LOG_STATE });
        setSavedState(EMPTY_LOG_STATE);
        setShowAdvanced(false);
      }
    }
  }, [query.data, date]);

  const isDirty = isLogDirty(form, savedState);
  const anyInput = hasAnyInput(form);

  function clearAll() {
    dispatch({ type: 'reset', state: EMPTY_LOG_STATE });
    setIsPrefilled(false);

    if (hasData) {
      saveMutation.mutate(
        { date, payload: formStateToPayload(date, EMPTY_LOG_STATE) },
        {
          onSuccess: () => setSavedState(EMPTY_LOG_STATE),
          onError: () => alert('Could not clear entry. Please try again.'),
        }
      );
    }
  }

  function save() {
    saveMutation.mutate(
      { date, payload: formStateToPayload(date, form) },
      {
        onSuccess: () => {
          setSavedState(form);
          setIsPrefilled(false);
          setSuccess(true);
          setTimeout(() => {
            setSuccess(false);
            window.location.hash = date === todayIso() ? '#/today' : '#/chart';
          }, 800);
        },
        onError: (err) => {
          if (err instanceof UnauthorizedError || (err as { status?: number })?.status === 401) {
            location.href = `/?openAuth=true&returnTo=${encodeURIComponent(currentReturnTo())}`;
          } else {
            alert('Could not save. Please try again.');
          }
        },
      }
    );
  }

  if (success) {
    return (
      <div className="h-full bg-background font-sans flex flex-col">
        <Header />
        <div className="flex-1 flex flex-col items-center justify-center min-h-0 space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div className="rounded-full bg-green-100 p-6 dark:bg-green-900/30">
            <CheckCircle2 className="icon-2xl text-green-600 dark:text-green-400" />
          </div>
          <h2 className="text-2xl font-semibold tracking-tight">
            {LOG_SCREEN_LABELS.status.logged}
          </h2>
        </div>
      </div>
    );
  }

  const minDate = query.data?.minDate || '2020-01-01';
  const isAtMinDate = date <= minDate;
  // Edit lock: minDate is the back-log window floor (server-enforced). Days
  // before it are read-only — older entries can be viewed but not changed.
  const isEditable = date >= minDate;

  return (
    <div className="h-full bg-background font-sans flex flex-col">
      <Header />
      <div className="flex-1 w-full min-h-0 overflow-y-auto overflow-x-hidden no-scrollbar pb-20">
        <div
          className={cn(
            'w-full max-w-md mx-auto min-h-full flex flex-col pt-safe-offset-2 sm:pt-4',
            !showBranding && 'pt-10 sm:pt-12'
          )}
        >
          <DateNavigator
            label={(() => {
              const [y, m, day] = date.split('-').map(Number);
              const dObj = new Date(y, m - 1, day);
              const month = dObj.toLocaleDateString('en-US', { month: 'short' });
              const weekday = dObj.toLocaleDateString('en-US', { weekday: 'short' });
              return `${month} ${day}, ${weekday}`;
            })()}
            sublabel={
              date === todayIso()
                ? LOG_SCREEN_LABELS.status.today
                : LOG_SCREEN_LABELS.status.editEntry
            }
            onPrev={() => {
              if (!isAtMinDate) setDate(addDays(date, -1));
            }}
            onNext={() => setDate(addDays(date, 1))}
            prevDisabled={saveMutation.isPending || isAtMinDate}
            nextDisabled={saveMutation.isPending || date === todayIso()}
          />

          {isPrefilled && (
            <div className="mx-4 mt-3 mb-1 bg-zinc-100/80 dark:bg-zinc-800/50 border border-zinc-200/50 dark:border-zinc-700/50 rounded-2xl p-3.5 flex items-center gap-3.5 backdrop-blur-xl animate-in fade-in slide-in-from-top-2 duration-500 shadow-sm transition-all group">
              <div className="w-10 h-10 rounded-full bg-blue-500/10 dark:bg-blue-400/10 flex items-center justify-center shrink-0">
                <Sparkles className="icon-sm text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex flex-col gap-0.5 flex-1 p-0.5">
                <span className="text-[14px] font-semibold text-zinc-900 dark:text-zinc-100">
                  Prefilled from yesterday
                </span>
                <span className="text-[12px] text-zinc-500 dark:text-zinc-400 leading-snug">
                  Magic filling saves you time. Review or clear to start fresh.
                </span>
              </div>
              <button
                onClick={clearAll}
                className="p-2 rounded-full hover:bg-zinc-200/50 dark:hover:bg-zinc-700/50 text-zinc-400 dark:text-zinc-500 hover:text-red-500 dark:hover:text-red-400 transition-all active:scale-90"
                aria-label="Clear prefilled data"
              >
                <X className="icon-xs" />
              </button>
            </div>
          )}

          {!isEditable && (
            <div className="mx-4 mt-3 mb-1 bg-zinc-100/80 dark:bg-zinc-800/50 border border-zinc-200/50 dark:border-zinc-700/50 rounded-2xl p-3.5 flex items-center gap-3.5 backdrop-blur-xl shadow-sm">
              <div className="w-10 h-10 rounded-full bg-zinc-500/10 dark:bg-zinc-400/10 flex items-center justify-center shrink-0">
                <Lock className="icon-sm text-zinc-500 dark:text-zinc-400" />
              </div>
              <div className="flex flex-col gap-0.5 flex-1 p-0.5">
                <span className="text-[14px] font-semibold text-zinc-900 dark:text-zinc-100">
                  Read-only entry
                </span>
                <span className="text-[12px] text-zinc-500 dark:text-zinc-400 leading-snug">
                  This day is too far in the past to edit.
                </span>
              </div>
            </div>
          )}

          <div
            className={cn(
              'relative cursor-default',
              // Read-only: make every field non-interactive (not just Save) and
              // dim it so the locked state reads clearly.
              !isEditable && 'pointer-events-none select-none opacity-60'
            )}
          >
            <div className="mt-4 flex flex-col gap-3">
              {/* ═══ ZONE 1: Daily Observations ═══ */}
              <InsetGroup
                title={LOG_SCREEN_LABELS.sections.dailyObservations}
                containerClassName="mb-0"
              >
                {/* Period Row */}
                <div className="flex flex-col">
                  <div className="px-4 py-3 flex items-center justify-between min-h-[52px]">
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
                            onClick={() => patch({ flow: opt.id, spotting: false })}
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

                {/* Cervical Fluid */}
                <div className="flex flex-col py-3 px-4 gap-3">
                  <FieldHeader
                    icon={Activity}
                    iconWrapClass="rounded-sm bg-blue-500 shadow-sm"
                    label={LOG_SCREEN_LABELS.fields.cervicalMucus}
                  />
                  <div className="grid grid-cols-2 gap-2.5">
                    {MUCUS_OPTIONS.map((opt) => (
                      <button
                        key={opt.id}
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
              </InsetGroup>

              {/* ═══ ZONE 2: Body Signals ═══ */}
              <InsetGroup title={LOG_SCREEN_LABELS.sections.bodySignals} containerClassName="mb-0">
                {/* Symptoms */}
                <div className="py-3 px-4 flex flex-col gap-3">
                  <FieldHeader
                    icon={Activity}
                    iconWrapClass="rounded-sm bg-green-500 shadow-sm"
                    label={LOG_SCREEN_LABELS.fields.symptoms}
                  />
                  <ChipGroup
                    options={LOG_SCREEN_LABELS.bodySignals.symptoms}
                    selected={form.bodySymptoms}
                    onToggle={(id) => patch({ bodySymptoms: toggleInArray(form.bodySymptoms, id) })}
                    activeClass={CHIP_ACTIVE_SYMPTOMS}
                  />
                </div>

                <div className="h-px bg-zinc-100 dark:bg-zinc-800 mx-4" />

                {/* Mood */}
                <div className="py-3 px-4 flex flex-col gap-3">
                  <FieldHeader
                    icon={Smile}
                    iconWrapClass="rounded-sm bg-amber-500 shadow-sm"
                    label={LOG_SCREEN_LABELS.fields.mood}
                  />
                  <PillGroup
                    options={LOG_SCREEN_LABELS.bodySignals.mood}
                    value={form.mood}
                    onChange={(v) => patch({ mood: v })}
                  />
                </div>

                <div className="h-px bg-zinc-100 dark:bg-zinc-800 mx-4" />

                {/* Energy */}
                <div className="py-3 px-4 flex flex-col gap-3">
                  <FieldHeader
                    icon={Zap}
                    iconWrapClass="rounded-sm bg-sky-500 shadow-sm"
                    label={LOG_SCREEN_LABELS.fields.energy}
                  />
                  <PillGroup
                    options={LOG_SCREEN_LABELS.bodySignals.energy}
                    value={form.energy}
                    onChange={(v) => patch({ energy: v })}
                  />
                </div>

                <div className="h-px bg-zinc-100 dark:bg-zinc-800 mx-4" />

                {/* Sleep */}
                <div className="py-3 px-4 flex flex-col gap-3">
                  <FieldHeader
                    icon={Moon}
                    iconWrapClass="rounded-sm bg-indigo-500 shadow-sm"
                    label={LOG_SCREEN_LABELS.fields.sleep}
                  />
                  <PillGroup
                    options={LOG_SCREEN_LABELS.bodySignals.sleep}
                    value={form.sleepQuality}
                    onChange={(v) => patch({ sleepQuality: v })}
                  />
                </div>

                <div className="h-px bg-zinc-100 dark:bg-zinc-800 mx-4" />

                {/* Libido */}
                <div className="py-3 px-4 flex flex-col gap-3">
                  <FieldHeader
                    icon={HeartPulse}
                    iconWrapClass="rounded-sm bg-pink-500 shadow-sm"
                    label={LOG_SCREEN_LABELS.fields.libido}
                  />
                  <PillGroup
                    options={LOG_SCREEN_LABELS.bodySignals.libido}
                    value={form.libido}
                    onChange={(v) => patch({ libido: v })}
                  />
                </div>

                <div className="h-px bg-zinc-100 dark:bg-zinc-800 mx-4" />

                {/* Sexual Activity */}
                <div className="py-3 px-4 flex flex-col gap-3">
                  <FieldHeader
                    icon={Heart}
                    iconWrapClass="rounded-sm bg-purple-500 shadow-sm"
                    label={LOG_SCREEN_LABELS.fields.sexActivity}
                  />
                  <PillGroup
                    options={LOG_SCREEN_LABELS.bodySignals.sexActivity}
                    value={form.sexActivity}
                    onChange={(v) => patch({ sexActivity: v })}
                  />
                </div>
              </InsetGroup>

              {/* ═══ ZONE 3: Advanced (Collapsible) ═══ */}
              <InsetGroup title={LOG_SCREEN_LABELS.sections.advanced} containerClassName="mb-0">
                <button
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="w-full px-4 py-3 flex items-center justify-between hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
                >
                  <span className="text-[15px] text-zinc-500 dark:text-zinc-400 font-medium">
                    Temperature, LH test & more
                  </span>
                  <ChevronRight
                    className={cn(
                      'icon-sm text-zinc-300 transition-transform duration-300',
                      showAdvanced && 'rotate-90'
                    )}
                  />
                </button>

                <div
                  className={cn(
                    'overflow-hidden transition-all duration-300 ease-out',
                    showAdvanced ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'
                  )}
                >
                  <div className="h-px bg-zinc-100 dark:bg-zinc-800 mx-4" />

                  {/* Basal Body Temperature */}
                  <div className="px-4 py-3 flex items-center justify-between min-h-[52px]">
                    <FieldHeader
                      icon={Thermometer}
                      iconWrapClass="rounded-sm bg-orange-500 shadow-sm"
                      label={LOG_SCREEN_LABELS.fields.basalTemp}
                    />
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        inputMode="decimal"
                        placeholder="--"
                        value={form.bbt}
                        onChange={(e) => patch({ bbt: e.target.value })}
                        className="w-20 text-right text-[17px] font-normal bg-transparent border-none focus:ring-0 p-0 text-zinc-900 dark:text-white placeholder:text-zinc-300 focus:text-blue-500"
                      />
                      <span className="text-muted-foreground text-[17px]">
                        {LOG_SCREEN_LABELS.units.temperature}
                      </span>
                    </div>
                  </div>

                  <div className="h-px bg-zinc-100 dark:bg-zinc-800 mx-4" />

                  {/* LH Test */}
                  <div className="py-3 px-4 flex flex-col gap-3">
                    <FieldHeader
                      icon={TestTube}
                      iconWrapClass="rounded-sm bg-indigo-500 shadow-sm"
                      label={LOG_SCREEN_LABELS.fields.lhTest}
                    />
                    <div className="flex bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl">
                      <button
                        onClick={() =>
                          patch({ lhTest: form.lhTest === 'negative' ? null : 'negative' })
                        }
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
                        onClick={() =>
                          patch({ lhTest: form.lhTest === 'positive' ? null : 'positive' })
                        }
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
                  </div>

                  <div className="h-px bg-zinc-100 dark:bg-zinc-800 mx-4" />

                  {/* Factors (Disturbances) */}
                  <div className="py-3 px-4 flex flex-col gap-3">
                    <FieldHeader
                      icon={Info}
                      iconWrapClass="rounded-sm bg-zinc-400 dark:bg-zinc-600 shadow-sm"
                      label={LOG_SCREEN_LABELS.symptoms.disturbances.title}
                    />
                    <ChipGroup
                      options={LOG_SCREEN_LABELS.symptoms.disturbances.options}
                      selected={form.disturbances}
                      onToggle={(id) =>
                        patch({ disturbances: toggleInArray(form.disturbances, id) })
                      }
                      activeClass={CHIP_ACTIVE_FACTORS}
                    />
                  </div>

                  <div className="h-px bg-zinc-100 dark:bg-zinc-800 mx-4" />

                  {/* Notes */}
                  <div className="py-3 px-4 flex flex-col gap-2">
                    <FieldHeader
                      icon={FileText}
                      iconWrapClass="rounded-sm bg-yellow-500/10 shrink-0"
                      iconClass="icon-sm text-yellow-500"
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

              {/* Action Buttons */}
              <div className="px-4 pb-8 space-y-3">
                <Button
                  onClick={save}
                  disabled={saveMutation.isPending || !isEditable || !isDirty || (!hasData && !anyInput)}
                  className="w-full h-12 text-[17px] font-semibold bg-[#007AFF] hover:bg-[#0066D6] text-white rounded-xl shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
                >
                  {saveMutation.isPending
                    ? LOG_SCREEN_LABELS.buttons.saving
                    : LOG_SCREEN_LABELS.buttons.save}
                </Button>

                {anyInput && isEditable && (
                  <button
                    onClick={clearAll}
                    disabled={saveMutation.isPending}
                    className="w-full py-2.5 text-[15px] font-medium text-red-500 hover:text-red-600 dark:text-red-500 dark:hover:text-red-400 transition-colors disabled:opacity-50"
                  >
                    Clear All
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
