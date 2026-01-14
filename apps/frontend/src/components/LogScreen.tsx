import * as React from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  Thermometer, Moon, Wine, Heart, AlertCircle, Droplets, Flame, Stethoscope,
  Activity, TestTube2, Cloud, CheckCircle2, Info
} from 'lucide-react';

import { apiJson, currentReturnTo, UnauthorizedError } from '../lib/api';
import { updateCacheFromMutation, type MutationResponse } from '../lib/cacheUtils';
import { cn } from '../lib/utils';
import { Button } from './ui/button';
import { InsetGroup } from './ui/inset-group';
import { SegmentedControl } from './ui/segmented-control';
import { ToggleTile } from './ui/toggle-tile';
import { InputRow } from './ui/input-row';
import { Header } from './Header';
import { DateNavigator } from './ui/date-navigator';
import { ActionSheet } from './ui/action-sheet';

type MucusType = 'dry' | 'sticky' | 'creamy' | 'watery' | 'eggwhite';
type Sensation = 'dry' | 'damp' | 'slippery';
type Bleeding = 'none' | 'spotting' | 'light' | 'heavy';
type LhTest = 'positive' | 'negative' | 'notTaken';

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function LogScreen() {
  const queryClient = useQueryClient();
  const [date, setDate] = React.useState<string>(todayIso());

  // Core Signs
  const [mucusType, setMucusType] = React.useState<MucusType>('dry');
  const [sensation, setSensation] = React.useState<Sensation>('dry');
  const [bleeding, setBleeding] = React.useState<Bleeding>('none');
  const [lhTest, setLhTest] = React.useState<LhTest>('notTaken');

  // Quantitative
  const [temperature, setTemperature] = React.useState<string>('');
  const [sleepHours, setSleepHours] = React.useState<string>('');
  const [stress, setStress] = React.useState<string>('');

  // Context flags
  const [sex, setSex] = React.useState(false);
  const [alcohol, setAlcohol] = React.useState(false);
  const [illness, setIllness] = React.useState(false);

  // Quality flags
  const [fever, setFever] = React.useState(false);
  const [lateNight, setLateNight] = React.useState(false);
  const [measuredLate, setMeasuredLate] = React.useState(false);
  const [semenExposure, setSemenExposure] = React.useState(false);
  const [infection, setInfection] = React.useState(false);

  // Notes
  const [notes, setNotes] = React.useState('');

  const [busy, setBusy] = React.useState(false);
  const [success, setSuccess] = React.useState(false);

  // Help State
  const [helpInfo, setHelpInfo] = React.useState<{ title: string; desc: string } | null>(null);

  const HELP_DATA: Record<string, { title: string; desc: string }> = {
    temperature: {
      title: "Basal Body Temperature",
      desc: "Take immediately upon waking, before sitting up."
    },
    sleep: {
      title: "Sleep Duration",
      desc: "Total hours slept. Consistent sleep improves accuracy."
    },
    stress: {
      title: "Stress Level",
      desc: "High stress can delay ovulation. Rate 0-10."
    },
    mucus: {
      title: "Cervical Mucus",
      desc: "Eggwhite quality indicates peak fertility."
    },
    sensation: {
      title: "Sensation",
      desc: "Wet or slippery sensation indicates fertility."
    },
    lh: {
      title: "LH Test Result",
      desc: "Positive result predicts ovulation within 24-48h."
    },
    bleeding: {
      title: "Bleeding/Flow",
      desc: "Heavy flow marks Day 1 of a new cycle."
    },
    illness: {
      title: "Illness/Fever",
      desc: "Fever can cause false temperature spikes."
    },
    alcohol: {
      title: "Alcohol Consumption",
      desc: "Alcohol can raise waking temperature temporarily."
    },
    sex: {
      title: "Intercourse",
      desc: "Logs help correlate activity with fertile window."
    },
    semen: {
      title: "Semen Exposure",
      desc: "Can resemble fertile mucus. Note recent activity."
    },
    infection: {
      title: "Infection/Inflammation",
      desc: "May alter mucus quality or temperature."
    },
    lateNight: {
      title: "Late Night",
      desc: "Significantly later bedtime can shift temperature."
    },
    lateMeas: {
      title: "Late Measurement",
      desc: "Measuring >30 mins late affects reliability."
    }
  };

  async function save() {
    setBusy(true);
    const payload = {
      date,
      mucusType,
      sensation,
      bleeding,
      temperature: temperature.trim() ? Number(temperature) : null,
      lhTest,
      sex,
      sleepHours: sleepHours.trim() ? Number(sleepHours) : null,
      alcohol,
      illness,
      stress: stress.trim() ? Number(stress) : null,
      fever,
      lateNight,
      measuredLate,
      semenExposure,
      infection,
      notes,
    };

    try {
      const data = await apiJson<MutationResponse>('/api/log-day', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });

      // Update cache with response data - eliminates refetch
      updateCacheFromMutation(queryClient, data);

      setSuccess(true);
      setTimeout(() => {
        window.location.hash = '#/today';
      }, 800);
    } catch (err: any) {
      if (err instanceof UnauthorizedError || err?.status === 401) {
        location.href = `/?openAuth=true&returnTo=${encodeURIComponent(currentReturnTo())}`;
      } else {
        alert('Could not save. Please try again.');
        setBusy(false);
      }
    }
  }

  if (success) {
    return (
      <div className="h-full bg-background font-sans flex flex-col">
        <Header />
        <div className="flex-1 flex flex-col items-center justify-center min-h-0 space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div className="rounded-full bg-green-100 p-6 dark:bg-green-900/30">
            <CheckCircle2 className="icon-2xl text-green-600 dark:text-green-400" />
          </div>
          <h2 className="text-2xl font-semibold tracking-tight">Logged</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-background font-sans flex flex-col">
      <Header />
      <div className="flex-1 w-full min-h-0 overflow-y-auto overflow-x-hidden no-scrollbar pb-4 sm:pb-6">
        <div className="w-full max-w-md mx-auto min-h-full flex flex-col pt-safe-offset-4 sm:pt-6">

          <DateNavigator
            label={(() => {
              const [y, m, day] = date.split('-').map(Number);
              const dObj = new Date(y, m - 1, day);
              const month = dObj.toLocaleDateString('en-US', { month: 'short' });
              const weekday = dObj.toLocaleDateString('en-US', { weekday: 'short' });
              return `${month} ${day}, ${weekday}`;
            })()}
            sublabel={date === todayIso() ? "Today" : "Edit Entry"}
            onPrev={() => setDate(addDays(date, -1))}
            onNext={() => setDate(addDays(date, 1))}
            prevDisabled={busy}
            nextDisabled={busy || date === todayIso()}
          />

          <div className="flex justify-center px-4 sm:px-6 py-1 sm:py-2 mb-2 sm:mb-4">
            <div className="inline-flex items-center gap-2 bg-zinc-100/80 dark:bg-zinc-800/80 px-3 sm:px-4 py-1.5 rounded-full border border-zinc-200/50 dark:border-zinc-700/50 backdrop-blur-sm">
              <Info className="w-3 h-3 sm:w-4 sm:h-4 text-blue-500" />
              <p className="text-[9px] sm:text-[11px] text-zinc-500 dark:text-zinc-400 font-semibold tracking-tight">
                Long-press any item for detailed help
              </p>
            </div>
          </div>

          <div className="px-3 sm:px-4 space-y-2">

            {/* 2. Temperature */}
            <InsetGroup>
              <InputRow
                label="BBT"
                value={temperature}
                onChange={setTemperature}
                placeholder="36.6"
                unit="°C"
                type="number"
                icon={Thermometer}
                iconBg="bg-orange-500"
                disabled={busy}
                onHelp={() => setHelpInfo(HELP_DATA.temperature)}
              />
            </InsetGroup>

            {/* 3. Fertility Signs */}
            <InsetGroup title="Fertility Signs">
              <div className="divide-y divide-border/30">
                {/* Mucus - Purple */}
                <SegmentedControl
                  label="Cervical Mucus"
                  value={mucusType}
                  onChange={setMucusType}
                  activeBgClass="bg-[#af52de]/10"
                  activeTextClass="text-[#af52de]"
                  disabled={busy}
                  options={[
                    { value: 'dry', label: 'Dry' },
                    { value: 'sticky', label: 'Sticky' },
                    { value: 'creamy', label: 'Cream' },
                    { value: 'watery', label: 'Watery' },
                    { value: 'eggwhite', label: 'EggW' },
                  ]}
                  onHelp={() => setHelpInfo(HELP_DATA.mucus)}
                />
                {/* Sensation - Blue */}
                <SegmentedControl
                  label="Sensation"
                  value={sensation}
                  onChange={setSensation}
                  activeBgClass="bg-[#007aff]/10"
                  activeTextClass="text-[#007aff]"
                  disabled={busy}
                  options={[
                    { value: 'dry', label: 'Dry' },
                    { value: 'damp', label: 'Damp' },
                    { value: 'slippery', label: 'Oil' },
                  ]}
                  onHelp={() => setHelpInfo(HELP_DATA.sensation)}
                />
                <div className="flex divide-x divide-border/30">
                  <div className="flex-1">
                    {/* Bleeding - Red */}
                    <SegmentedControl
                      label="Bleeding"
                      value={bleeding}
                      onChange={setBleeding}
                      activeBgClass="bg-[#ff3b30]/10"
                      activeTextClass="text-[#ff3b30]"
                      disabled={busy}
                      options={[
                        { value: 'none', label: '-' },
                        { value: 'spotting', label: 'Spot' },
                        { value: 'light', label: 'Lgt' },
                        { value: 'heavy', label: 'Hvy' },
                      ]}
                      onHelp={() => setHelpInfo(HELP_DATA.bleeding)}
                    />
                  </div>
                  <div className="flex-1">
                    {/* LH - Orange */}
                    <SegmentedControl
                      label="LH Test"
                      value={lhTest}
                      onChange={setLhTest}
                      activeBgClass="bg-[#ff9500]/10"
                      activeTextClass="text-[#ff9500]"
                      disabled={busy}
                      options={[
                        { value: 'notTaken', label: '--' },
                        { value: 'negative', label: 'Neg' },
                        { value: 'positive', label: 'Pos' },
                      ]}
                      onHelp={() => setHelpInfo(HELP_DATA.lh)}
                    />
                  </div>
                </div>
              </div>
            </InsetGroup>

            {/* 4. Context & Factors (Semantic 10%) */}
            <InsetGroup title="Context & Factors">
              <div className="p-2 sm:p-3 grid grid-cols-4 gap-1.5 sm:gap-3 border-b border-border/30 pb-2 sm:pb-4 mb-1 sm:mb-2">
                <ToggleTile label="Sex" icon={Heart} checked={sex} onChange={setSex} activeTextClass="text-pink-600" activeBgClass="bg-pink-500/10" disabled={busy} onHelp={() => setHelpInfo(HELP_DATA.sex)} />
                <ToggleTile label="Drink" icon={Wine} checked={alcohol} onChange={setAlcohol} activeTextClass="text-purple-600" activeBgClass="bg-purple-500/10" disabled={busy} onHelp={() => setHelpInfo(HELP_DATA.alcohol)} />
                <ToggleTile label="Sick" icon={Stethoscope} checked={illness} onChange={setIllness} activeTextClass="text-amber-600" activeBgClass="bg-amber-500/10" disabled={busy} onHelp={() => setHelpInfo(HELP_DATA.illness)} />
                <ToggleTile label="Stress" icon={Cloud} checked={Boolean(Number(stress) > 5)} onChange={(v) => setStress(v ? '7' : '0')} activeTextClass="text-blue-600" activeBgClass="bg-blue-500/10" disabled={busy} onHelp={() => setHelpInfo(HELP_DATA.stress)} />
              </div>

              <div className="border-b border-border/30 last:border-0">
                <InputRow
                  label="Sleep Duration"
                  value={sleepHours}
                  onChange={setSleepHours}
                  placeholder="8.0"
                  unit="hr"
                  type="number"
                  icon={Moon}
                  iconBg="bg-indigo-600"
                  disabled={busy}
                  onHelp={() => setHelpInfo(HELP_DATA.sleep)}
                />
                <InputRow
                  label="Stress Level"
                  value={stress}
                  onChange={setStress}
                  placeholder="0-10"
                  unit=""
                  type="number"
                  icon={Activity}
                  iconBg="bg-blue-500"
                  disabled={busy}
                  onHelp={() => setHelpInfo(HELP_DATA.stress)}
                />
              </div>

              <div className="px-2 sm:px-3 py-2 sm:py-3">
                <h4 className="text-[9px] sm:text-[10px] uppercase font-bold text-muted-foreground/50 mb-2 sm:mb-3 tracking-widest pl-1">Influencing Factors</h4>
                <div className="grid grid-cols-4 gap-1.5 sm:gap-3">
                  <ToggleTile label="Fever" icon={Flame} checked={fever} onChange={setFever} activeTextClass="text-orange-600" activeBgClass="bg-orange-500/10" disabled={busy} onHelp={() => setHelpInfo(HELP_DATA.illness)} />
                  <ToggleTile label="Late" icon={Moon} checked={lateNight} onChange={setLateNight} activeTextClass="text-indigo-600" activeBgClass="bg-indigo-500/10" disabled={busy} onHelp={() => setHelpInfo(HELP_DATA.lateNight)} />
                  <ToggleTile label="Time?" icon={Activity} checked={measuredLate} onChange={setMeasuredLate} activeTextClass="text-indigo-600" activeBgClass="bg-indigo-500/10" disabled={busy} onHelp={() => setHelpInfo(HELP_DATA.lateMeas)} />
                  <ToggleTile label="Semen" icon={Droplets} checked={semenExposure} onChange={setSemenExposure} activeTextClass="text-cyan-600" activeBgClass="bg-cyan-500/10" disabled={busy} onHelp={() => setHelpInfo(HELP_DATA.semen)} />
                </div>
                <div className="mt-1.5 sm:mt-3 grid grid-cols-4 gap-1.5 sm:gap-3">
                  <ToggleTile label="Infection" icon={AlertCircle} checked={infection} onChange={setInfection} activeTextClass="text-rose-600" activeBgClass="bg-rose-500/10" disabled={busy} onHelp={() => setHelpInfo(HELP_DATA.infection)} />
                </div>
              </div>
            </InsetGroup>

            {/* Notes Section */}
            <InsetGroup title="Notes">
              <div className="bg-card rounded-xl overflow-hidden">
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add any notes about today..."
                  className="w-full px-4 py-3 bg-transparent text-base text-foreground placeholder:text-muted-foreground focus:outline-none resize-none min-h-[100px]"
                  disabled={busy}
                />
              </div>
            </InsetGroup>

            {/* Save Button - now part of page content */}
            <div className="pt-6 pb-20 px-4">
              <Button
                onClick={save}
                disabled={busy}
                className="w-full h-12 text-[17px] font-semibold bg-[#007aff] hover:bg-[#0051d5] text-white rounded-xl shadow-lg shadow-blue-500/10 disabled:opacity-50"
              >
                {busy ? 'Saving...' : 'Save Daily Log'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Help Action Sheet */}
      <ActionSheet
        isOpen={helpInfo !== null}
        onClose={() => setHelpInfo(null)}
        title={helpInfo?.title}
        description={helpInfo?.desc}
        actions={[
          {
            label: "Got it",
            onClick: () => setHelpInfo(null)
          }
        ]}
      />
    </div>
  );
}

