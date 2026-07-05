import * as React from 'react';
import { CheckCircle2, Lock } from 'lucide-react';

import { currentReturnTo, UnauthorizedError } from '@/lib/api';
import { cn } from '@/lib/utils';
import { todayIso, addDays } from '@/lib/date';
import { Button } from '@/components/common/ui/button';
import { Header } from '@/components/common/Header';
import { ActionSheet } from '@/components/common/ui/action-sheet';
import { WaitlistCapture, hasJoinedWaitlist } from '@/components/common/WaitlistCapture';
import { seenWithinDay, markSeenToday } from '@/lib/dailyFlag';
import { DateNavigator } from '@/components/common/ui/date-navigator';
import { LOG_SCREEN_LABELS } from './LogScreen.config';
import { useLog, useSaveLog } from '@/hooks/queries/useLogs';
import { useBillingStatus } from '@/hooks/queries/useBillingStatus';
import { useCalendarDayStatus, type CalendarStatus } from '@/hooks/queries/useCalendar';
import { useDiscreetMode } from '@/hooks/queries/useDiscreetMode';
import { LogCoachSheet } from './LogCoachSheet';
import { LogCoachButton, LogPrimarySignals } from './LogPrimarySignals';
import { LogWellnessSection } from './LogWellnessSection';
import {
  EMPTY_LOG_STATE,
  LogFormState,
  logFormReducer,
  payloadToFormState,
  formStateToPayload,
  hasAnyInput,
  isLogDirty,
} from './logState';
import { bbtFieldConfig } from './temperatureUnits';
import { useTemperatureUnit } from '@/hooks/queries/useTemperatureUnit';

// Flag indicating if the coaching modal has been viewed.
const COACH_SEEN_KEY = 'chs-log-coach-seen';

// Caps the demo's post-save waitlist invite to once per day (see @/lib/dailyFlag).
const WAITLIST_PROMPT_KEY = 'chs_waitlist_prompted';

// Map calendar status to tailwind color classes.
const STATUS_DOT: Record<CalendarStatus, string> = {
  period: 'bg-[#ff3b30]',
  fertile: 'bg-[#af52de]',
  safe: 'bg-emerald-500',
  unsure: '',
};

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

  const [showMore, setShowMore] = React.useState(false);
  const [tempOpen, setTempOpen] = React.useState(false);
  const [lhOpen, setLhOpen] = React.useState(false);
  const [success, setSuccess] = React.useState(false);
  const [waitlistOpen, setWaitlistOpen] = React.useState(false);
  const [coachOpen, setCoachOpen] = React.useState(false);
  const [mucusGuideOpen, setMucusGuideOpen] = React.useState(false);

  // Trigger coach sheet presentation on first visit.
  React.useEffect(() => {
    try {
      if (localStorage.getItem(COACH_SEEN_KEY) !== 'true') setCoachOpen(true);
    } catch {
      /* localStorage unavailable — skip the one-time coach */
    }
  }, []);

  const closeCoach = React.useCallback(() => {
    setCoachOpen(false);
    try {
      localStorage.setItem(COACH_SEEN_KEY, 'true');
    } catch {
      /* ignore */
    }
  }, []);

  const toggleMore = React.useCallback(() => setShowMore((v) => !v), []);

  // Cached state representation of the last saved payload for change detection.
  const [savedState, setSavedState] = React.useState<LogFormState>(EMPTY_LOG_STATE);

  const query = useLog(date);
  const saveMutation = useSaveLog();
  const { data: billing } = useBillingStatus();
  const isDemo = billing?.state === 'demo';

  // Basal Body Temperature (BBT) unit configuration. Inputs are converted to Celsius for storage.
  const tempUnit = useTemperatureUnit();
  const bbtField = bbtFieldConfig(tempUnit);

  // Resolve status-based color representation for the active date.
  const calendarStatus = useCalendarDayStatus(date);
  const statusDot = calendarStatus ? STATUS_DOT[calendarStatus] : '';

  const hasData = query.data?.found;

  React.useEffect(() => {
    if (date > todayIso()) {
      setDate(todayIso());
      window.location.hash = `#/log?date=${todayIso()}`;
      return;
    }

    if (!query.data) return;

    if (query.data.found && query.data.payload) {
      const next = payloadToFormState(query.data.payload, tempUnit);
      dispatch({ type: 'reset', state: next });
      setSavedState(next);
      // Collapse optional sections by default on date change.
      setShowMore(false);
      setTempOpen(!!next.bbt);
      setLhOpen(!!next.lhTest);
    } else {
      dispatch({ type: 'reset', state: EMPTY_LOG_STATE });
      setSavedState(EMPTY_LOG_STATE);
      setShowMore(false);
      setTempOpen(false);
      setLhOpen(false);
    }
  }, [query.data, date, tempUnit]);

  const isDirty = isLogDirty(form, savedState);
  const anyInput = hasAnyInput(form);
  // Disable cervical fluid inputs during active menstruation (flow); remain active during spotting.
  const mucusDisabled = form.bleeding && !form.spotting && !!form.flow;
  // Map populated optional fields to highlight active items in the collapsed view.
  const moreFieldActive: Record<string, boolean> = {
    mood: form.mood.length > 0,
    symptoms: form.bodySymptoms.length > 0,
    energy: !!form.energy,
    sleep: !!form.sleepQuality,
    libido: !!form.libido,
    sex: !!form.sexActivity && form.sexActivity !== 'none',
    factors: form.disturbances.length > 0,
    notes: !!form.notes,
  };
  const filledFields = LOG_SCREEN_LABELS.sections.showMoreFields.filter(
    (f) => moreFieldActive[f.key]
  );
  const filledFieldsSummary =
    filledFields.length > 0 ? filledFields.map((f) => f.label).join(' · ') : null;

  function clearAll() {
    dispatch({ type: 'reset', state: EMPTY_LOG_STATE });
    setTempOpen(false);
    setLhOpen(false);

    if (hasData) {
      saveMutation.mutate(
        { date, payload: formStateToPayload(date, EMPTY_LOG_STATE, tempUnit) },
        {
          onSuccess: () => setSavedState(EMPTY_LOG_STATE),
          onError: () => alert('Could not clear entry. Please try again.'),
        }
      );
    }
  }

  function save() {
    saveMutation.mutate(
      { date, payload: formStateToPayload(date, form, tempUnit) },
      {
        onSuccess: () => {
          setSavedState(form);
          // Demo: after a save (an engaged, positive moment) invite to the
          // waitlist — at most once a day, and never once they've joined. The
          // save has already persisted; we just hold the post-save navigation
          // until they cancel or add their email. They're free to skip.
          if (
            isDemo &&
            date === todayIso() &&
            !hasJoinedWaitlist() &&
            !seenWithinDay(WAITLIST_PROMPT_KEY)
          ) {
            markSeenToday(WAITLIST_PROMPT_KEY);
            setWaitlistOpen(true);
            return;
          }
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
  // Demo mode constraint: only the current date is editable; historical dates are read-only.
  const demoPastLocked = billing?.state === 'demo' && date < todayIso();
  // Enforce retrospective logging limit (minDate).
  const isEditable = date >= minDate && !demoPastLocked;

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
            dotClass={statusDot || undefined}
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

          <LogCoachButton onClick={() => setCoachOpen(true)} />

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
                  {demoPastLocked
                    ? "Past days can't be edited in the demo. Try logging today."
                    : 'This day is too far in the past to edit.'}
                </span>
              </div>
            </div>
          )}

          <div
            className={cn(
              'relative cursor-default',
              // Disable user interactions when the entry is read-only.
              !isEditable && 'pointer-events-none select-none opacity-60'
            )}
          >
            <div className="mt-5 flex flex-col gap-5">
              <LogPrimarySignals
                form={form}
                patch={patch}
                mucusDisabled={mucusDisabled}
                mucusGuideOpen={mucusGuideOpen}
                onToggleMucusGuide={() => setMucusGuideOpen((v) => !v)}
                tempOpen={tempOpen}
                setTempOpen={setTempOpen}
                lhOpen={lhOpen}
                setLhOpen={setLhOpen}
                bbtField={bbtField}
                tempUnit={tempUnit}
              />

              <LogWellnessSection
                form={form}
                showMore={showMore}
                toggleMore={toggleMore}
                filledFieldsSummary={filledFieldsSummary}
                patch={patch}
              />

              {/* Form actions */}
              <div className="px-4 pb-8 space-y-3">
                <Button
                  onClick={save}
                  disabled={
                    saveMutation.isPending || !isEditable || !isDirty || (!hasData && !anyInput)
                  }
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

      <LogCoachSheet isOpen={coachOpen} onClose={closeCoach} />

      {/* Post-save demo invite. Skippable — closing (cancel or after joining)
          continues to Today, so the save is never blocked. */}
      <ActionSheet
        isOpen={waitlistOpen}
        onClose={() => {
          setWaitlistOpen(false);
          window.location.hash = '#/today';
        }}
        title="That's logged"
        description="Enjoying the demo? We launch soon — want an invite?"
        actions={[]}
      >
        <WaitlistCapture source="demo_log" />
      </ActionSheet>
    </div>
  );
}
