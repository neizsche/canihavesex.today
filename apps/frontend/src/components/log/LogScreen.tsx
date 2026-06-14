import * as React from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  Thermometer, Droplets, Activity, ChevronRight, CheckCircle2, Lock, TestTube, Info, FileText, Sparkles, X,
  Smile, Zap, Moon, HeartPulse, Heart
} from 'lucide-react';

import { currentReturnTo, UnauthorizedError } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Button } from '@/components/common/ui/button';
import { Header } from '@/components/common/Header';
import { DateNavigator } from '@/components/common/ui/date-navigator';
import { InsetGroup } from '@/components/common/ui/inset-group';
import { LOG_SCREEN_LABELS } from './LogScreen.config';
import { useLog, useSaveLog } from '@/hooks/queries/useLogs';
import { useDiscreetMode } from '@/hooks/queries/useDiscreetMode';

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

const BODY_SYMPTOM_IDS: readonly string[] = LOG_SCREEN_LABELS.bodySignals.symptoms.map(o => o.id);

function encodeSymptoms(
  bodySymptoms: string[],
  mood: string | null,
  energy: string | null,
  sleepQuality: string | null,
  libido: string | null,
  sexActivity: string | null
): string[] {
  return [
    ...bodySymptoms,
    ...(mood ? [`mood:${mood}`] : []),
    ...(energy ? [`energy:${energy}`] : []),
    ...(sleepQuality ? [`sleep:${sleepQuality}`] : []),
    ...(libido ? [`libido:${libido}`] : []),
    ...(sexActivity && sexActivity !== 'none' ? [`sex:${sexActivity}`] : []),
  ];
}

function decodeSymptoms(symptoms: string[]): {
  bodySymptoms: string[];
  mood: string | null;
  energy: string | null;
  sleepQuality: string | null;
  libido: string | null;
  sexActivity: string | null;
} {
  return {
    bodySymptoms: symptoms.filter(s => BODY_SYMPTOM_IDS.includes(s)),
    mood: symptoms.find(s => s.startsWith('mood:'))?.split(':')[1] || null,
    energy: symptoms.find(s => s.startsWith('energy:'))?.split(':')[1] || null,
    sleepQuality: symptoms.find(s => s.startsWith('sleep:'))?.split(':')[1] || null,
    libido: symptoms.find(s => s.startsWith('libido:'))?.split(':')[1] || null,
    sexActivity: symptoms.find(s => s.startsWith('sex:'))?.split(':')[1] || null,
  };
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

interface SavedState {
  bleeding: boolean;
  flow: string | null;
  spotting: boolean;
  bbt: string;
  mucus: string | null;
  lhTest: string | null;
  disturbances: string[];
  notes: string;
  bodySymptoms: string[];
  mood: string | null;
  energy: string | null;
  sleepQuality: string | null;
  libido: string | null;
  sexActivity: string | null;
}

const EMPTY_SAVED_STATE: SavedState = {
  bleeding: false,
  flow: null,
  spotting: false,
  bbt: '',
  mucus: null,
  lhTest: null,
  disturbances: [],
  notes: '',
  bodySymptoms: [],
  mood: null,
  energy: null,
  sleepQuality: null,
  libido: null,
  sexActivity: null,
};

export function LogScreen() {
  const { showBranding } = useDiscreetMode();
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

  // Core FAM state
  const [bleeding, setBleeding] = React.useState<boolean>(false);
  const [flow, setFlow] = React.useState<string | null>(null);
  const [spotting, setSpotting] = React.useState<boolean>(false);
  const [bbt, setBbt] = React.useState<string>('');
  const [mucus, setMucus] = React.useState<string | null>(null);
  const [lhTest, setLhTest] = React.useState<string | null>(null);
  const [disturbances, setDisturbances] = React.useState<string[]>([]);
  const [notes, setNotes] = React.useState<string>('');

  // Body signals state
  const [bodySymptoms, setBodySymptoms] = React.useState<string[]>([]);
  const [mood, setMood] = React.useState<string | null>(null);
  const [energy, setEnergy] = React.useState<string | null>(null);
  const [sleepQuality, setSleepQuality] = React.useState<string | null>(null);
  const [libido, setLibido] = React.useState<string | null>(null);
  const [sexActivity, setSexActivity] = React.useState<string | null>(null);

  // UI state
  const [isPrefilled, setIsPrefilled] = React.useState(false);
  const [showAdvanced, setShowAdvanced] = React.useState(false);
  const [success, setSuccess] = React.useState(false);

  // Dirty checking
  const [savedState, setSavedState] = React.useState<SavedState>({ ...EMPTY_SAVED_STATE });

  const query = useLog(date);
  const saveMutation = useSaveLog();

  const isHistorical = date < todayIso();
  const hasData = query.data?.found;

  React.useEffect(() => {
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

      const decoded = decodeSymptoms(p.symptoms || []);

      setBleeding(newBleeding);
      setFlow(newFlow);
      setSpotting(newSpotting);
      setBbt(newBbt);
      setMucus(newMucus);
      setLhTest(newLhTest);
      setDisturbances(newDisturbances);
      setNotes(newNotes);
      setBodySymptoms(decoded.bodySymptoms);
      setMood(decoded.mood);
      setEnergy(decoded.energy);
      setSleepQuality(decoded.sleepQuality);
      setLibido(decoded.libido);
      setSexActivity(decoded.sexActivity);

      const hasAdvancedData = p.temperature || (p.lhTest && p.lhTest !== 'notTaken') ||
        (p.disturbances && p.disturbances.length > 0) || p.notes;
      setShowAdvanced(!!hasAdvancedData);

      setSavedState({
        bleeding: newBleeding, flow: newFlow, spotting: newSpotting, bbt: newBbt,
        mucus: newMucus, lhTest: newLhTest, disturbances: newDisturbances, notes: newNotes,
        bodySymptoms: decoded.bodySymptoms, mood: decoded.mood, energy: decoded.energy,
        sleepQuality: decoded.sleepQuality, libido: decoded.libido, sexActivity: decoded.sexActivity,
      });

    } else if (query.data && !query.data.found) {

      if (query.data.suggestion) {
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

        setBleeding(newBleeding);
        setFlow(newFlow);
        setSpotting(newSpotting);
        setBbt(newBbt);
        setMucus(newMucus);
        setLhTest(null);
        setDisturbances([]);
        setNotes('');
        setBodySymptoms([]);
        setMood(null);
        setEnergy(null);
        setSleepQuality(null);
        setLibido(null);
        setSexActivity(null);

        if (s.temperature) setShowAdvanced(true);
        else setShowAdvanced(false);

        setSavedState({ ...EMPTY_SAVED_STATE });
        setIsPrefilled(true);

      } else {
        setBleeding(false);
        setFlow(null);
        setSpotting(false);
        setBbt('');
        setMucus(null);
        setLhTest(null);
        setDisturbances([]);
        setNotes('');
        setBodySymptoms([]);
        setMood(null);
        setEnergy(null);
        setSleepQuality(null);
        setLibido(null);
        setSexActivity(null);
        setShowAdvanced(false);
        setSavedState({ ...EMPTY_SAVED_STATE });
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
      notes !== savedState.notes ||
      JSON.stringify(bodySymptoms) !== JSON.stringify(savedState.bodySymptoms) ||
      mood !== savedState.mood ||
      energy !== savedState.energy ||
      sleepQuality !== savedState.sleepQuality ||
      libido !== savedState.libido ||
      sexActivity !== savedState.sexActivity
    );
  }, [bleeding, flow, spotting, bbt, mucus, lhTest, disturbances, notes, bodySymptoms, mood, energy, sleepQuality, libido, sexActivity, savedState]);

  const hasAnyInput = bleeding || spotting || bbt || mucus || lhTest ||
    disturbances.length > 0 || notes || bodySymptoms.length > 0 ||
    mood || energy || sleepQuality || libido || (sexActivity && sexActivity !== 'none');

  function clearAll() {
    setBleeding(false);
    setFlow(null);
    setSpotting(false);
    setBbt('');
    setMucus(null);
    setLhTest(null);
    setDisturbances([]);
    setNotes('');
    setBodySymptoms([]);
    setMood(null);
    setEnergy(null);
    setSleepQuality(null);
    setLibido(null);
    setSexActivity(null);
    setIsPrefilled(false);

    if (hasData) {
      const emptyPayload = {
        date,
        bleeding: 'none',
        temperature: null,
        mucusType: null,
        lhTest: 'notTaken',
        disturbances: [],
        symptoms: [],
        notes: ''
      };
      saveMutation.mutate({ date, payload: emptyPayload }, {
        onSuccess: () => setSavedState({ ...EMPTY_SAVED_STATE }),
        onError: () => alert('Could not clear entry. Please try again.'),
      });
    }
  }

  async function save() {
    const payload = {
      date,
      bleeding: spotting ? 'spotting' : (bleeding ? (flow || 'medium') : 'none'),
      temperature: bbt ? parseFloat(bbt) : null,
      mucusType: mucus,
      lhTest: lhTest || 'notTaken',
      disturbances,
      symptoms: encodeSymptoms(bodySymptoms, mood, energy, sleepQuality, libido, sexActivity),
      notes: notes
    };

    saveMutation.mutate({ date, payload }, {
      onSuccess: () => {
        setSavedState({
          bleeding, flow, spotting, bbt, mucus, lhTest, disturbances, notes,
          bodySymptoms, mood, energy, sleepQuality, libido, sexActivity,
        });
        setIsPrefilled(false);
        setSuccess(true);
        setTimeout(() => {
          setSuccess(false);
          if (date === todayIso()) {
            window.location.hash = '#/today';
          } else {
            window.location.hash = '#/chart';
          }
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

  const minDate = query.data?.minDate || '2020-01-01';
  const isAtMinDate = date <= minDate;

  return (
    <div className="h-full bg-[#F2F2F7] dark:bg-black font-sans flex flex-col">
      <Header />
      <div className="flex-1 w-full min-h-0 overflow-y-auto overflow-x-hidden no-scrollbar pb-20">
        <div className={cn("w-full max-w-md mx-auto min-h-full flex flex-col pt-safe-offset-2 sm:pt-4", !showBranding && "pt-10 sm:pt-12")}>

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

          {isPrefilled && (
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
                onClick={clearAll}
                className="p-2 rounded-full hover:bg-zinc-200/50 dark:hover:bg-zinc-700/50 text-zinc-400 dark:text-zinc-500 hover:text-red-500 dark:hover:text-red-400 transition-all active:scale-90"
                aria-label="Clear prefilled data"
              >
                <X className="icon-xs" />
              </button>
            </div>
          )}


          {(
            <div className="relative cursor-default">
              <div className="mt-4 flex flex-col gap-3">

                {/* ═══ ZONE 1: Daily Observations ═══ */}
                <InsetGroup title={LOG_SCREEN_LABELS.sections.dailyObservations} containerClassName="mb-0">

                  {/* Period Row */}
                  <div className="flex flex-col">
                    <div className="px-4 py-3 flex items-center justify-between min-h-[52px]">
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-full bg-rose-500 flex items-center justify-center shadow-sm">
                          <Droplets className="icon-sm text-white" />
                        </div>
                        <span className="text-[17px] text-zinc-900 dark:text-white font-medium">{LOG_SCREEN_LABELS.fields.period}</span>
                      </div>

                      <button
                        onClick={() => {
                          const newState = !bleeding;
                          setBleeding(newState);
                          if (newState) {
                            setSpotting(true);
                            setFlow(null);
                          } else {
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

                    <div className={cn(
                      "overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]",
                      bleeding ? "max-h-52 opacity-100" : "max-h-0 opacity-0"
                    )}>
                      <div className="px-4 pb-4 pt-0 space-y-4">
                        <div className="h-px bg-zinc-100 dark:bg-zinc-800 mx-0" />
                        <div className="flex bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl">
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

                  {/* Cervical Fluid */}
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

                </InsetGroup>

                {/* ═══ ZONE 2: Body Signals ═══ */}
                <InsetGroup title={LOG_SCREEN_LABELS.sections.bodySignals} containerClassName="mb-0">

                  {/* Symptoms */}
                  <div className="py-3 px-4 flex flex-col gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-sm bg-green-500 flex items-center justify-center shadow-sm">
                        <Activity className="icon-sm text-white" />
                      </div>
                      <span className="text-[17px] text-zinc-900 dark:text-white font-medium">{LOG_SCREEN_LABELS.fields.symptoms}</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {LOG_SCREEN_LABELS.bodySignals.symptoms.map(opt => (
                        <button
                          key={opt.id}
                          onClick={() => setBodySymptoms(curr => curr.includes(opt.id) ? curr.filter(x => x !== opt.id) : [...curr, opt.id])}
                          className={cn(
                            "py-1.5 px-3 rounded-full text-[13px] font-medium border transition-all shadow-sm",
                            bodySymptoms.includes(opt.id)
                              ? "bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300"
                              : "bg-white dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                          )}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="h-px bg-zinc-100 dark:bg-zinc-800 mx-4" />

                  {/* Mood */}
                  <div className="py-3 px-4 flex flex-col gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-sm bg-amber-500 flex items-center justify-center shadow-sm">
                        <Smile className="icon-sm text-white" />
                      </div>
                      <span className="text-[17px] text-zinc-900 dark:text-white font-medium">{LOG_SCREEN_LABELS.fields.mood}</span>
                    </div>
                    <div className="flex bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl">
                      {LOG_SCREEN_LABELS.bodySignals.mood.map((opt) => (
                        <button
                          key={opt.id}
                          onClick={() => setMood(curr => curr === opt.id ? null : opt.id)}
                          className={cn(
                            "flex-1 py-1.5 rounded-[9px] text-[13px] font-semibold transition-all shadow-sm",
                            mood === opt.id
                              ? "bg-white dark:bg-zinc-600 text-zinc-900 dark:text-white shadow-sm ring-1 ring-black/5"
                              : "text-zinc-500 dark:text-zinc-400 shadow-none bg-transparent"
                          )}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="h-px bg-zinc-100 dark:bg-zinc-800 mx-4" />

                  {/* Energy */}
                  <div className="py-3 px-4 flex flex-col gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-sm bg-sky-500 flex items-center justify-center shadow-sm">
                        <Zap className="icon-sm text-white" />
                      </div>
                      <span className="text-[17px] text-zinc-900 dark:text-white font-medium">{LOG_SCREEN_LABELS.fields.energy}</span>
                    </div>
                    <div className="flex bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl">
                      {LOG_SCREEN_LABELS.bodySignals.energy.map((opt) => (
                        <button
                          key={opt.id}
                          onClick={() => setEnergy(curr => curr === opt.id ? null : opt.id)}
                          className={cn(
                            "flex-1 py-1.5 rounded-[9px] text-[13px] font-semibold transition-all shadow-sm",
                            energy === opt.id
                              ? "bg-white dark:bg-zinc-600 text-zinc-900 dark:text-white shadow-sm ring-1 ring-black/5"
                              : "text-zinc-500 dark:text-zinc-400 shadow-none bg-transparent"
                          )}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="h-px bg-zinc-100 dark:bg-zinc-800 mx-4" />

                  {/* Sleep */}
                  <div className="py-3 px-4 flex flex-col gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-sm bg-indigo-500 flex items-center justify-center shadow-sm">
                        <Moon className="icon-sm text-white" />
                      </div>
                      <span className="text-[17px] text-zinc-900 dark:text-white font-medium">{LOG_SCREEN_LABELS.fields.sleep}</span>
                    </div>
                    <div className="flex bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl">
                      {LOG_SCREEN_LABELS.bodySignals.sleep.map((opt) => (
                        <button
                          key={opt.id}
                          onClick={() => setSleepQuality(curr => curr === opt.id ? null : opt.id)}
                          className={cn(
                            "flex-1 py-1.5 rounded-[9px] text-[13px] font-semibold transition-all shadow-sm",
                            sleepQuality === opt.id
                              ? "bg-white dark:bg-zinc-600 text-zinc-900 dark:text-white shadow-sm ring-1 ring-black/5"
                              : "text-zinc-500 dark:text-zinc-400 shadow-none bg-transparent"
                          )}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="h-px bg-zinc-100 dark:bg-zinc-800 mx-4" />

                  {/* Libido */}
                  <div className="py-3 px-4 flex flex-col gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-sm bg-pink-500 flex items-center justify-center shadow-sm">
                        <HeartPulse className="icon-sm text-white" />
                      </div>
                      <span className="text-[17px] text-zinc-900 dark:text-white font-medium">{LOG_SCREEN_LABELS.fields.libido}</span>
                    </div>
                    <div className="flex bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl">
                      {LOG_SCREEN_LABELS.bodySignals.libido.map((opt) => (
                        <button
                          key={opt.id}
                          onClick={() => setLibido(curr => curr === opt.id ? null : opt.id)}
                          className={cn(
                            "flex-1 py-1.5 rounded-[9px] text-[13px] font-semibold transition-all shadow-sm",
                            libido === opt.id
                              ? "bg-white dark:bg-zinc-600 text-zinc-900 dark:text-white shadow-sm ring-1 ring-black/5"
                              : "text-zinc-500 dark:text-zinc-400 shadow-none bg-transparent"
                          )}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="h-px bg-zinc-100 dark:bg-zinc-800 mx-4" />

                  {/* Sexual Activity */}
                  <div className="py-3 px-4 flex flex-col gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-sm bg-purple-500 flex items-center justify-center shadow-sm">
                        <Heart className="icon-sm text-white" />
                      </div>
                      <span className="text-[17px] text-zinc-900 dark:text-white font-medium">{LOG_SCREEN_LABELS.fields.sexActivity}</span>
                    </div>
                    <div className="flex bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl">
                      {LOG_SCREEN_LABELS.bodySignals.sexActivity.map((opt) => (
                        <button
                          key={opt.id}
                          onClick={() => setSexActivity(curr => curr === opt.id ? null : opt.id)}
                          className={cn(
                            "flex-1 py-1.5 rounded-[9px] text-[13px] font-semibold transition-all shadow-sm",
                            sexActivity === opt.id
                              ? "bg-white dark:bg-zinc-600 text-zinc-900 dark:text-white shadow-sm ring-1 ring-black/5"
                              : "text-zinc-500 dark:text-zinc-400 shadow-none bg-transparent"
                          )}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
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
                    <ChevronRight className={cn("icon-sm text-zinc-300 transition-transform duration-300", showAdvanced && "rotate-90")} />
                  </button>

                  <div className={cn(
                    "overflow-hidden transition-all duration-300 ease-out",
                    showAdvanced ? "max-h-[1000px] opacity-100" : "max-h-0 opacity-0"
                  )}>

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

                    {/* Factors (Disturbances) */}
                    <div className="py-3 px-4 flex flex-col gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-sm bg-zinc-400 dark:bg-zinc-600 flex items-center justify-center shadow-sm">
                          <Info className="icon-sm text-white" />
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
                                ? "bg-zinc-100 dark:bg-zinc-700 border-zinc-300 dark:border-zinc-600 text-zinc-800 dark:text-zinc-200"
                                : "bg-white dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                            )}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="h-px bg-zinc-100 dark:bg-zinc-800 mx-4" />

                    {/* Notes */}
                    <div className="py-3 px-4 flex flex-col gap-2">
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-sm bg-yellow-500/10 flex items-center justify-center shrink-0">
                          <FileText className="icon-sm text-yellow-500" />
                        </div>
                        <span className="text-[17px] text-zinc-900 dark:text-white font-medium">{LOG_SCREEN_LABELS.fields.notes}</span>
                      </div>
                      <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        maxLength={100}
                        placeholder="Add a note..."
                        className="w-full min-h-[60px] text-[15px] font-normal bg-zinc-50/50 dark:bg-zinc-900/30 rounded-xl border-none focus:ring-0 focus:outline-none p-3 text-zinc-900 dark:text-white placeholder:text-zinc-300 resize-none"
                      />
                      <div className="flex justify-end">
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
                    disabled={saveMutation.isPending || !isDirty || (!hasData && !hasAnyInput)}
                    className="w-full h-12 text-[17px] font-semibold bg-[#007AFF] hover:bg-[#0066D6] text-white rounded-xl shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
                  >
                    {saveMutation.isPending ? LOG_SCREEN_LABELS.buttons.saving : LOG_SCREEN_LABELS.buttons.save}
                  </Button>

                  {hasAnyInput && (
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
          )}
        </div>
      </div>
    </div>
  );
}
