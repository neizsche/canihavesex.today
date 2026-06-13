import * as React from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  Thermometer, Droplets, Activity, ChevronRight, CheckCircle2, Lock, TestTube, AlertTriangle, FileText, Sparkles, X
} from 'lucide-react';

import { currentReturnTo, UnauthorizedError } from '@/lib/api';
import { cn } from '@/lib/utils';
import { usePremiumFeatures, usePremiumStatus } from '@/lib/featureFlags';
import { Button } from '@/components/common/ui/button';
import { Header } from '@/components/common/Header';
import { DateNavigator } from '@/components/common/ui/date-navigator';
import { PremiumUnlockCard } from '@/components/common/ui/PremiumUnlockCard';
import { InsetGroup } from '@/components/common/ui/inset-group';
import { LOG_SCREEN_LABELS } from './LogScreen.config';
import { useLog, useSaveLog } from '@/hooks/queries/useLogs';

// --- Constants from V2 ---
const MUCUS_OPTIONS = [
  { id: 'dry', label: LOG_SCREEN_LABELS.options.mucus[0] },
  { id: 'sticky', label: LOG_SCREEN_LABELS.options.mucus[1] },
  { id: 'creamy', label: LOG_SCREEN_LABELS.options.mucus[2] },
  { id: 'eggwhite', label: LOG_SCREEN_LABELS.options.mucus[3] }
];

const FLOW_OPTIONS = [
  { id: 'light', label: LOG_SCREEN_LABELS.options.flow.light },
  { id: 'medium', label: LOG_SCREEN_LABELS.options.flow.medium },
  { id: 'heavy', label: LOG_SCREEN_LABELS.options.flow.heavy }
];

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function LogScreen() {
  const { premiumEnabled } = usePremiumFeatures();
  const { isPremium } = usePremiumStatus();
  const queryClient = useQueryClient();
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

  /* State from V2 */
  const [bleeding, setBleeding] = React.useState<boolean>(false);
  const [flow, setFlow] = React.useState<string | null>(null);
  const [spotting, setSpotting] = React.useState<boolean>(false);

  const [bbt, setBbt] = React.useState<string>('');
  const [mucus, setMucus] = React.useState<string | null>(null);
  const [lhTest, setLhTest] = React.useState<string | null>(null);
  const [disturbances, setDisturbances] = React.useState<string[]>([]);
  const [notes, setNotes] = React.useState<string>('');

  // Prefill State
  const [isPrefilled, setIsPrefilled] = React.useState(false);

  // Collapsible sections
  const [showSymptoms, setShowSymptoms] = React.useState(false);
  const [showNotes, setShowNotes] = React.useState(false);

  // UI States
  const [success, setSuccess] = React.useState(false);
  const [showPremiumUpsell, setShowPremiumUpsell] = React.useState(false);
  const premiumSectionRef = React.useRef<HTMLDivElement>(null);

  // Track saved state for dirty checking
  const [savedState, setSavedState] = React.useState<{
    bleeding: boolean;
    flow: string | null;
    spotting: boolean;
    bbt: string;
    mucus: string | null;
    lhTest: string | null;
    disturbances: string[];
    notes: string;
  }>({
    bleeding: false,
    flow: null,
    spotting: false,
    bbt: '',
    mucus: null,
    lhTest: null,
    disturbances: [],
    notes: ''
  });

  /* Combined Query: Fetches Log + Suggestion + MinDate */
  const query = useLog(date);
  const saveMutation = useSaveLog();

  const isHistorical = date < todayIso();
  const hasData = query.data?.found;
  const isLockedPast = isHistorical && !isPremium;
  const isLockedEmpty = isLockedPast && !hasData;

  const scrollToPremium = () => {
    premiumSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  // Populate state on load
  React.useEffect(() => {
    // Safety check: Don't allow future dates
    if (date > todayIso()) {
      setDate(todayIso());
      window.location.hash = `#/log?date=${todayIso()}`;
      return;
    }

    setIsPrefilled(false);

    if (query.data?.found && query.data.payload) {
      const p = query.data.payload;
      let newBleeding = false;
      let newFlow: string | null = null;
      let newSpotting = false;
      let newBbt = '';
      let newMucus: string | null = null;
      let newLhTest: string | null = null;
      let newDisturbances: string[] = [];
      let newNotes = '';

      if (p.bleeding && p.bleeding !== 'none') {
        newBleeding = true;
        newFlow = p.bleeding === 'spotting' ? null : p.bleeding;
        newSpotting = p.bleeding === 'spotting';
      }

      if (p.temperature) newBbt = String(p.temperature);
      if (p.mucusType) newMucus = p.mucusType;
      if (p.lhTest && p.lhTest !== 'notTaken') newLhTest = p.lhTest;
      if (p.disturbances) newDisturbances = p.disturbances;
      if (p.notes) newNotes = p.notes;

      setBleeding(newBleeding);
      setFlow(newFlow);
      setSpotting(newSpotting);
      setBbt(newBbt);
      setMucus(newMucus);
      setLhTest(newLhTest);
      setDisturbances(newDisturbances);
      setNotes(newNotes);
      setSavedState({ bleeding: newBleeding, flow: newFlow, spotting: newSpotting, bbt: newBbt, mucus: newMucus, lhTest: newLhTest, disturbances: newDisturbances, notes: newNotes });

    } else if (query.data && !query.data.found) {

      if (query.data.suggestion) {
        // PREFILL FROM SUGGESTION
        const s = query.data.suggestion;

        let newBleeding = false;
        let newFlow: string | null = null;
        let newSpotting = false;
        let newBbt = '';
        let newMucus: string | null = null;

        if (s.bleeding && s.bleeding !== 'none') {
          newBleeding = true;
          newFlow = s.bleeding === 'spotting' ? null : s.bleeding;
          newSpotting = s.bleeding === 'spotting';
        }
        if (s.temperature) newBbt = String(s.temperature);
        if (s.mucusType) newMucus = s.mucusType;
        // suggestions don't include notes/disturbances per requirements

        setBleeding(newBleeding);
        setFlow(newFlow);
        setSpotting(newSpotting);
        setBbt(newBbt);
        setMucus(newMucus);

        setLhTest(null);
        setDisturbances([]);
        setNotes('');

        // CRITICAL: We DO NOT update savedState. Prefilled data is "unsaved" changes.
        // But we need to reset savedState to empty to ensure diff works.
        setSavedState({ bleeding: false, flow: null, spotting: false, bbt: '', mucus: null, lhTest: null, disturbances: [], notes: '' });

        setIsPrefilled(true);

      } else {
        // Reset if no log and no suggestion
        setBleeding(false);
        setFlow(null);
        setSpotting(false);
        setBbt('');
        setMucus(null);
        setLhTest(null);
        setDisturbances([]);
        setNotes('');
        setSavedState({ bleeding: false, flow: null, spotting: false, bbt: '', mucus: null, lhTest: null, disturbances: [], notes: '' });
      }
    }
  }, [query.data, date]);

  const isDirty = React.useMemo(() => {
    return (
      bleeding !== savedState.bleeding ||
      flow !== savedState.flow ||
      spotting !== savedState.spotting ||
      bbt !== savedState.bbt ||
      mucus !== savedState.mucus ||
      lhTest !== savedState.lhTest ||
      JSON.stringify(disturbances) !== JSON.stringify(savedState.disturbances) ||
      notes !== savedState.notes
    );
  }, [bleeding, flow, spotting, bbt, mucus, lhTest, disturbances, notes, savedState]);

  async function save() {
    const payload = {
      date,
      // Derived fields
      bleeding: spotting ? 'spotting' : (bleeding ? (flow || 'medium') : 'none'),
      temperature: bbt ? parseFloat(bbt) : null,
      mucusType: mucus,
      lhTest: lhTest || 'notTaken',
      disturbances,

      // Reset others
      sex: [],
      notes: notes
    };

    saveMutation.mutate({ date, payload }, {
      onSuccess: () => {
        setSavedState({ bleeding, flow, spotting, bbt, mucus, lhTest, disturbances, notes });
        setIsPrefilled(false);
        setSuccess(true);
        setTimeout(() => {
          setSuccess(false);
          window.location.hash = '#/today';
        }, 800);
      },
      onError: (err: any) => {
        if (err instanceof UnauthorizedError || err?.status === 401) {
          location.href = `/?openAuth=true&returnTo=${encodeURIComponent(currentReturnTo())}`;
        } else {
          alert('Could not save. Please try again.');
        }
      }
    });
  }

  if (success) {
    return (
      <div className="h-full bg-background font-sans flex flex-col">
        <Header />
        <div className="flex-1 flex flex-col items-center justify-center min-h-0 space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div className="rounded-full bg-green-100 p-6 dark:bg-green-900/30">
            <CheckCircle2 className="icon-2xl text-green-600 dark:text-green-400" />
          </div>
          <h2 className="text-2xl font-semibold tracking-tight">{LOG_SCREEN_LABELS.status.logged}</h2>
        </div>
      </div>
    );
  }

  // const isFormEmpty = !bleeding && !spotting && !bbt && !mucus && !lhTest;

  const minDate = query.data?.minDate || '2020-01-01';
  const isAtMinDate = date <= minDate;

  return (
    <div className="h-full bg-[#F2F2F7] dark:bg-black font-sans flex flex-col">
      <Header />
      <div className="flex-1 w-full min-h-0 overflow-y-auto overflow-x-hidden no-scrollbar pb-20">
        <div className="w-full max-w-md mx-auto min-h-full flex flex-col pt-safe-offset-2 sm:pt-4">

          <DateNavigator
            label={(() => {
              const [y, m, day] = date.split('-').map(Number);
              const dObj = new Date(y, m - 1, day);
              const month = dObj.toLocaleDateString('en-US', { month: 'short' });
              const weekday = dObj.toLocaleDateString('en-US', { weekday: 'short' });
              return `${month} ${day}, ${weekday}`;
            })()}
            sublabel={date === todayIso() ? LOG_SCREEN_LABELS.status.today : LOG_SCREEN_LABELS.status.editEntry}
            onPrev={() => {
              if (!isAtMinDate) setDate(addDays(date, -1));
            }}
            onNext={() => setDate(addDays(date, 1))}
            prevDisabled={saveMutation.isPending || isAtMinDate}
            nextDisabled={saveMutation.isPending || date === todayIso()}
          />

          {isPrefilled && !isLockedPast && (
            <div className="mx-4 mt-3 mb-1 bg-zinc-100/80 dark:bg-zinc-800/50 border border-zinc-200/50 dark:border-zinc-700/50 rounded-2xl p-3.5 flex items-center gap-3.5 backdrop-blur-xl animate-in fade-in slide-in-from-top-2 duration-500 shadow-sm transition-all group">
              <div className="w-10 h-10 rounded-full bg-blue-500/10 dark:bg-blue-400/10 flex items-center justify-center shrink-0">
                <Sparkles className="icon-sm text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex flex-col gap-0.5 flex-1 p-0.5">
                <span className="text-[14px] font-semibold text-zinc-900 dark:text-zinc-100">Prefilled from yesterday</span>
                <span className="text-[12px] text-zinc-500 dark:text-zinc-400 leading-snug">
                  Magic filling saves you time. Review or clear to start fresh.
                </span>
              </div>
              <button
                onClick={() => {
                  setBleeding(false);
                  setFlow(null);
                  setSpotting(false);
                  setBbt('');
                  setMucus(null);
                  setLhTest(null);
                  setDisturbances([]);
                  setNotes('');
                  setIsPrefilled(false);
                }}
                className="p-2 rounded-full hover:bg-zinc-200/50 dark:hover:bg-zinc-700/50 text-zinc-400 dark:text-zinc-500 hover:text-red-500 dark:hover:text-red-400 transition-all active:scale-90"
                aria-label="Clear prefilled data"
              >
                <X className="icon-xs" />
              </button>
            </div>
          )}


          {!isLockedEmpty ? (
            <div
              className="relative cursor-default"
              onClick={isLockedPast ? scrollToPremium : undefined}
            >
              <div className={cn("mt-4 flex flex-col gap-3", isLockedPast && "opacity-60 pointer-events-none select-none grayscale-[0.2]")}>

                {/* CYCLE TRACKING */}
                <InsetGroup containerClassName="mb-0">

                  {/* Period Row */}
                  <div className="flex flex-col">
                    <div className="px-4 py-3 flex items-center justify-between min-h-[52px]">
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-full bg-rose-500 flex items-center justify-center shadow-sm">
                          <Droplets className="icon-sm text-white" />
                        </div>
                        <span className="text-[17px] text-zinc-900 dark:text-white font-medium">{LOG_SCREEN_LABELS.fields.period}</span>
                      </div>

                      {/* iOS Style Switch */}
                      <button
                        onClick={() => {
                          const newState = !bleeding;
                          setBleeding(newState);
                          if (newState) {
                            // Default to Spotting when turning on
                            setSpotting(true);
                            setFlow(null);
                          } else {
                            // Reset when turning off
                            setSpotting(false);
                            setFlow(null);
                          }
                        }}
                        className={cn(
                          "w-[51px] h-[31px] rounded-full relative transition-colors duration-200 ease-in-out cursor-pointer",
                          bleeding ? "bg-rose-500" : "bg-zinc-200 dark:bg-zinc-700"
                        )}
                      >
                        <span className={cn(
                          "absolute top-[2px] left-[2px] w-[27px] h-[27px] bg-white rounded-full shadow-sm transition-transform duration-200 ease-[cubic-bezier(0.25,0.1,0.25,1)]",
                          bleeding ? "translate-x-[20px]" : "translate-x-0"
                        )} />
                      </button>
                    </div>

                    {/* Expanded Flow Options */}
                    <div className={cn(
                      "overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]",
                      bleeding ? "max-h-52 opacity-100" : "max-h-0 opacity-0"
                    )}>
                      <div className="px-4 pb-4 pt-0 space-y-4">
                        <div className="h-px bg-zinc-100 dark:bg-zinc-800 mx-0" />

                        {/* Unified Flow + Spotting Control */}
                        <div className="flex bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl">
                          {/* Spotting Option */}
                          <button
                            onClick={() => { setSpotting(true); setFlow(null); }}
                            className={cn(
                              "flex-1 py-1.5 rounded-[9px] text-[13px] font-semibold transition-all shadow-sm",
                              spotting
                                ? "bg-rose-500 text-white shadow-md ring-1 ring-rose-600/20"
                                : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300 shadow-none bg-transparent"
                            )}
                          >
                            Spotting
                          </button>

                          {/* Flow Options */}
                          {FLOW_OPTIONS.map((opt) => (
                            <button
                              key={opt.id}
                              onClick={() => { setFlow(opt.id); setSpotting(false); }}
                              className={cn(
                                "flex-1 py-1.5 rounded-[9px] text-[13px] font-semibold transition-all shadow-sm",
                                !spotting && flow === opt.id
                                  ? "bg-rose-500 text-white shadow-md ring-1 ring-rose-600/20"
                                  : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300 shadow-none bg-transparent"
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

                  {/* Basal Body Temperature */}
                  <div className="px-4 py-3 flex items-center justify-between min-h-[52px]">
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-sm bg-orange-500 flex items-center justify-center shadow-sm">
                        <Thermometer className="icon-sm text-white" />
                      </div>
                      <span className="text-[17px] text-zinc-900 dark:text-white font-medium">{LOG_SCREEN_LABELS.fields.basalTemp}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        inputMode="decimal"
                        placeholder="--"
                        value={bbt}
                        onChange={(e) => setBbt(e.target.value)}
                        className="w-20 text-right text-[17px] font-normal bg-transparent border-none focus:ring-0 p-0 text-zinc-900 dark:text-white placeholder:text-zinc-300 focus:text-blue-500"
                      />
                      <span className="text-zinc-400 text-[17px]">{LOG_SCREEN_LABELS.units.temperature}</span>
                    </div>
                  </div>

                  <div className="h-px bg-zinc-100 dark:bg-zinc-800 mx-4" />

                  {/* Cervical Mucus - Navigation Style */}
                  <div className="flex flex-col py-3 px-4 gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-sm bg-blue-500 flex items-center justify-center shadow-sm">
                        <Activity className="icon-sm text-white" />
                      </div>
                      <span className="text-[17px] text-zinc-900 dark:text-white font-medium">{LOG_SCREEN_LABELS.fields.cervicalMucus}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2.5">
                      {MUCUS_OPTIONS.map((opt) => (
                        <button
                          key={opt.id}
                          onClick={() => setMucus(curr => curr === opt.id ? null : opt.id)}
                          className={cn(
                            "py-2.5 px-3 rounded-xl text-[15px] font-medium text-center transition-all border shadow-sm",
                            mucus === opt.id
                              ? "bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 ring-1 ring-blue-500/20"
                              : "bg-white dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                          )}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="h-px bg-zinc-100 dark:bg-zinc-800 mx-4" />

                  {/* LH Test */}
                  <div className="py-3 px-4 flex flex-col gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-sm bg-indigo-500 flex items-center justify-center shadow-sm">
                        <TestTube className="icon-sm text-white" />
                      </div>
                      <span className="text-[17px] text-zinc-900 dark:text-white font-medium">{LOG_SCREEN_LABELS.fields.lhTest}</span>
                    </div>

                    <div className="flex bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl">
                      <button
                        onClick={() => setLhTest(curr => curr === 'negative' ? null : 'negative')}
                        className={cn(
                          "flex-1 py-1.5 rounded-[9px] text-[13px] font-semibold transition-all transition-shadow",
                          lhTest === 'negative'
                            ? "bg-white dark:bg-zinc-600 text-zinc-900 dark:text-white shadow-sm ring-1 ring-black/5"
                            : "text-zinc-500 dark:text-zinc-400"
                        )}
                      >
                        {LOG_SCREEN_LABELS.options.lhTest.negative}
                      </button>
                      <button
                        onClick={() => setLhTest(curr => curr === 'positive' ? null : 'positive')}
                        className={cn(
                          "flex-1 py-1.5 rounded-[9px] text-[13px] font-semibold transition-all transition-shadow",
                          lhTest === 'positive'
                            ? "bg-white dark:bg-zinc-600 text-rose-500 dark:text-rose-300 shadow-sm ring-1 ring-black/5"
                            : "text-zinc-500 dark:text-zinc-400"
                        )}
                      >
                        {LOG_SCREEN_LABELS.options.lhTest.positive}
                      </button>
                    </div>
                  </div>

                  <div className="h-px bg-zinc-100 dark:bg-zinc-800 mx-4" />

                  {/* Disturbances (Safety) */}
                  <div className="py-3 px-4 flex flex-col gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-sm bg-red-500 flex items-center justify-center shadow-sm">
                        <AlertTriangle className="icon-sm text-white" />
                      </div>
                      <span className="text-[17px] text-zinc-900 dark:text-white font-medium">{LOG_SCREEN_LABELS.symptoms.disturbances.title}</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {LOG_SCREEN_LABELS.symptoms.disturbances.options.map(opt => (
                        <button
                          key={opt.id}
                          onClick={() => setDisturbances(curr => curr.includes(opt.id) ? curr.filter(x => x !== opt.id) : [...curr, opt.id])}
                          className={cn(
                            "py-1.5 px-3 rounded-full text-[13px] font-medium border transition-all shadow-sm",
                            disturbances.includes(opt.id)
                              ? "bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300"
                              : "bg-white dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                          )}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                </InsetGroup>

                {/* SYMPTOMS & PREMIUM */}
                {premiumEnabled && (
                  <InsetGroup containerClassName="mb-0">
                    <button
                      onClick={() => {
                        setShowSymptoms(!showSymptoms);
                        if (!showSymptoms) {
                          setShowPremiumUpsell(true);
                          setTimeout(() => {
                            premiumSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                          }, 100);
                        }
                      }}
                      className="w-full px-4 py-3 flex items-center justify-between hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-sm bg-purple-500 flex items-center justify-center shadow-sm">
                          <Activity className="icon-sm text-white" />
                        </div>
                        <span className="text-[17px] text-zinc-900 dark:text-white font-medium">
                          {LOG_SCREEN_LABELS.fields.trackSymptoms}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Lock className="icon-xs text-zinc-400" />
                        <ChevronRight className={cn("icon-sm text-zinc-300 transition-transform duration-300", showSymptoms && "rotate-90")} />
                      </div>
                    </button>

                    {/* Collapsible Placeholder Content for Symptoms */}
                    <div className={cn(
                      "overflow-hidden transition-all duration-300 ease-out",
                      showSymptoms ? "max-h-[500px] opacity-100 border-t border-zinc-100 dark:border-zinc-800" : "max-h-0 opacity-0"
                    )}>
                      <PremiumUnlockCard
                        title={LOG_SCREEN_LABELS.premium.title}
                        description={LOG_SCREEN_LABELS.premium.description}
                      />
                    </div>
                  </InsetGroup>
                )}

                {/* NOTES - Collapsible */}
                <InsetGroup containerClassName="mb-0">
                  <button
                    onClick={() => setShowNotes(!showNotes)}
                    className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-7 h-7 rounded-sm bg-yellow-500/10 flex items-center justify-center shrink-0">
                        <FileText className="icon-sm text-yellow-500" />
                      </div>
                      <div className="flex flex-col items-start min-w-0 overflow-hidden">
                        <span className="text-[17px] text-zinc-900 dark:text-white font-normal">
                          {LOG_SCREEN_LABELS.sections?.notes || 'Daily Notes'}
                        </span>
                        {!showNotes && notes && (
                          <span className="text-[13px] text-zinc-500 dark:text-zinc-400 truncate w-full text-left">
                            {notes}
                          </span>
                        )}
                      </div>
                    </div>
                    <ChevronRight className={cn("icon-sm text-zinc-300 transition-transform duration-300 shrink-0", showNotes && "rotate-90")} />
                  </button>

                  {/* Collapsible Notes Content */}
                  <div className={cn(
                    "overflow-hidden transition-all duration-300 ease-out",
                    showNotes ? "max-h-[300px] opacity-100 border-t border-zinc-100 dark:border-zinc-800" : "max-h-0 opacity-0"
                  )}>
                    <div className="px-4 py-2.5 bg-zinc-50/50 dark:bg-zinc-900/30">
                      <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        maxLength={100}
                        placeholder="Add a note..."
                        className="w-full min-h-[80px] text-[15px] font-normal bg-transparent border-none focus:ring-0 focus:outline-none p-0 text-zinc-900 dark:text-white placeholder:text-zinc-300 resize-none"
                      />
                      <div className="flex justify-end pt-1">
                        <span className={cn(
                          "text-[11px] font-medium tracking-tight",
                          notes.length >= 100 ? "text-red-500" : "text-zinc-400"
                        )}>
                          {notes.length}/100
                        </span>
                      </div>
                    </div>
                  </div>
                </InsetGroup>

                {/* Action Buttons */}
                <div className="px-4 pb-8 space-y-3">
                  <Button
                    onClick={save}
                    disabled={saveMutation.isPending || !isDirty || (!hasData && !(bleeding || spotting || bbt || mucus || lhTest || disturbances.length > 0 || notes))}
                    className="w-full h-12 text-[17px] font-semibold bg-[#007AFF] hover:bg-[#0066D6] text-white rounded-xl shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
                  >
                    {saveMutation.isPending ? LOG_SCREEN_LABELS.buttons.saving : LOG_SCREEN_LABELS.buttons.save}
                  </Button>

                  {/* Clear Form Button - Always visible if there is data to clear */}
                  {(bleeding || spotting || bbt || mucus || lhTest || disturbances.length > 0 || notes) && (
                    <button
                      onClick={() => {
                        setBleeding(false);
                        setFlow(null);
                        setSpotting(false);
                        setBbt('');
                        setMucus(null);
                        setLhTest(null);
                        setDisturbances([]);
                        setNotes('');
                      }}
                      disabled={saveMutation.isPending}
                      className="w-full py-2.5 text-[15px] font-medium text-red-500 hover:text-red-600 dark:text-red-500 dark:hover:text-red-400 transition-colors disabled:opacity-50"
                    >
                      Clear All
                    </button>
                  )}

                  {isLockedPast && (
                    <div
                      ref={premiumSectionRef}
                      className="animate-in fade-in slide-in-from-bottom-2 pt-2"
                    >
                      <PremiumUnlockCard
                        title="Unlock History"
                        description="Editing past logs is a premium feature. Upgrade to unlock full history editing."
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div
              className="flex flex-col pt-10 cursor-pointer"
              onClick={scrollToPremium}
            >
              <div className="flex flex-col items-center justify-center py-20 px-6 text-center animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="w-20 h-20 bg-zinc-100 dark:bg-zinc-800/50 rounded-full flex items-center justify-center mb-6 shadow-sm">
                  <FileText className="w-10 h-10 text-zinc-400 dark:text-zinc-500" strokeWidth={1.5} />
                </div>
                <h3 className="text-2xl font-bold text-zinc-900 dark:text-white mb-3">No Data Found</h3>
                <p className="text-[16px] text-zinc-500 dark:text-zinc-400 max-w-[300px] leading-relaxed">
                  You haven't recorded any fertility data for this day.
                </p>
              </div>

              <div
                ref={premiumSectionRef}
                className="px-4 pb-12 animate-in fade-in slide-in-from-bottom-2 duration-500 delay-200"
              >
                <PremiumUnlockCard
                  title="Unlock History"
                  description="Editing past logs is a premium feature. Upgrade to unlock full history editing."
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
