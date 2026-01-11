import * as React from 'react';
import { CalendarDays, Droplets, Save, Thermometer, TestTube2, Heart, Moon, AlertCircle, ChevronDown, CheckCircle } from 'lucide-react';

import { apiFetch, currentReturnTo } from '../lib/api';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Separator } from './ui/separator';

type MucusType = 'dry' | 'sticky' | 'creamy' | 'watery' | 'eggwhite';
type Sensation = 'dry' | 'damp' | 'slippery';
type Bleeding = 'none' | 'spotting' | 'light' | 'heavy';
type LhTest = 'positive' | 'negative' | 'notTaken';

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function LogScreen() {
  const [date, setDate] = React.useState<string>(todayIso());
  const [temperature, setTemperature] = React.useState<string>('');
  const [mucusType, setMucusType] = React.useState<MucusType>('dry');
  const [sensation, setSensation] = React.useState<Sensation>('dry');
  const [bleeding, setBleeding] = React.useState<Bleeding>('none');
  const [lhTest, setLhTest] = React.useState<LhTest>('notTaken');

  // Optional/context fields supported by backend (/log-day)
  const [sex, setSex] = React.useState(false);
  const [sleepHours, setSleepHours] = React.useState<string>(''); // optional number
  const [alcohol, setAlcohol] = React.useState(false);
  const [illness, setIllness] = React.useState(false);
  const [stress, setStress] = React.useState<string>(''); // optional 0-10
  const [notes, setNotes] = React.useState<string>(''); // optional

  // Quality/confounders
  const [fever, setFever] = React.useState(false);
  const [lateNight, setLateNight] = React.useState(false);
  const [measuredLate, setMeasuredLate] = React.useState(false);
  const [semenExposure, setSemenExposure] = React.useState(false);
  const [infection, setInfection] = React.useState(false);

  const [busy, setBusy] = React.useState(false);
  const [status, setStatus] = React.useState<string>('');
  const [statusTone, setStatusTone] = React.useState<'muted' | 'danger' | 'ok'>('muted');

  async function save() {
    setBusy(true);
    setStatusTone('muted');
    setStatus('Saving…');

    const payload = {
      date,
      mucusType,
      sensation,
      bleeding,
      temperature: temperature.trim() ? Number(temperature) : null,
      lhTest,

      // optional extensions
      sex,
      sleepHours: sleepHours.trim() ? Number(sleepHours) : null,
      alcohol,
      illness,
      stress: stress.trim() ? Number(stress) : null,
      notes: notes.trim() ? notes.trim() : null,

      // quality flags
      fever,
      lateNight,
      measuredLate,
      semenExposure,
      infection,
    };

    try {
      const res = await apiFetch('/log-day', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.status === 401) {
        setStatusTone('danger');
        location.href = `/auth?returnTo=${encodeURIComponent(currentReturnTo())}`;
        setBusy(false);
        return;
      }

      if (!res.ok) {
        setStatusTone('danger');
        setStatus('Save failed.');
        setBusy(false);
        return;
      }

      setStatusTone('ok');
      setStatus('Saved.');
      setBusy(false);
      // Navigate within the SPA (avoid flashing the landing page).
      setTimeout(() => {
        if (window.location.pathname.startsWith('/app')) {
          window.location.hash = '#/today';
        } else {
          window.location.href = '/app#/today';
        }
      }, 350);
    } catch {
      setStatusTone('danger');
      setStatus('Network error.');
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <div className="text-sm text-muted-foreground">Log</div>
        <h1 className="text-2xl font-semibold tracking-tight">Track today</h1>
        <p className="text-sm text-muted-foreground">Record your observations. Keep it simple and consistent.</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="space-y-6">
            {/* Date Section */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Date</span>
              </div>
              <input
                id="date"
                type="date"
                className="h-12 w-full rounded-lg border bg-background px-4 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                disabled={busy}
              />
            </div>

            {/* Temperature Section */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Thermometer className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Temperature</span>
                <span className="text-xs text-muted-foreground">(optional)</span>
              </div>
              <input
                id="temperature"
                type="number"
                inputMode="decimal"
                step="0.01"
                placeholder="36.60"
                className="h-12 w-full rounded-lg border bg-background px-4 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={temperature}
                onChange={(e) => setTemperature(e.target.value)}
                disabled={busy}
              />
            </div>

            {/* Fertility Signs Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Heart className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Fertility signs</span>
              </div>
              <p className="text-xs text-muted-foreground">Pick the closest match. Don't overthink it.</p>

              <div className="grid gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Cervical mucus</label>
                  <div className="relative">
                    <Droplets className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <select
                      id="mucusType"
                      className="h-12 w-full appearance-none rounded-lg border bg-background pl-10 pr-10 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      value={mucusType}
                      onChange={(e) => setMucusType(e.target.value as MucusType)}
                      disabled={busy}
                    >
                      <option value="dry">Dry</option>
                      <option value="sticky">Sticky</option>
                      <option value="creamy">Creamy</option>
                      <option value="watery">Watery</option>
                      <option value="eggwhite">Egg white</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Sensation</label>
                  <select
                    id="sensation"
                    className="h-12 w-full appearance-none rounded-lg border bg-background px-4 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    value={sensation}
                    onChange={(e) => setSensation(e.target.value as Sensation)}
                    disabled={busy}
                  >
                    <option value="dry">Dry</option>
                    <option value="damp">Damp</option>
                    <option value="slippery">Slippery</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Bleeding</label>
                  <select
                    id="bleeding"
                    className="h-12 w-full appearance-none rounded-lg border bg-background px-4 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    value={bleeding}
                    onChange={(e) => setBleeding(e.target.value as Bleeding)}
                    disabled={busy}
                  >
                    <option value="none">None</option>
                    <option value="spotting">Spotting</option>
                    <option value="light">Light</option>
                    <option value="heavy">Heavy</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">LH test</label>
                  <div className="relative">
                    <TestTube2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <select
                      id="lhTest"
                      className="h-12 w-full appearance-none rounded-lg border bg-background pl-10 pr-10 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      value={lhTest}
                      onChange={(e) => setLhTest(e.target.value as LhTest)}
                      disabled={busy}
                    >
                      <option value="notTaken">Not taken</option>
                      <option value="negative">Negative</option>
                      <option value="positive">Positive</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Advanced Options */}
            <div className="rounded-xl border bg-muted/20 p-4">
              <details>
                <summary className="cursor-pointer flex items-center justify-between select-none">
                  <span className="text-sm font-medium text-foreground flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    Advanced options
                  </span>
                  <ChevronDown className="h-4 w-4 text-muted-foreground group-open:rotate-180 transition-transform" />
                </summary>
                <div className="mt-4 space-y-6">
                  {/* Context */}
                  <div className="space-y-3">
                    <div className="text-sm font-medium text-foreground">Context</div>
                    <div className="space-y-3">
                      <label className="flex items-center gap-3 text-sm">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-gray-300"
                          checked={sex}
                          onChange={(e) => setSex(e.target.checked)}
                          disabled={busy}
                        />
                        Sex happened today
                      </label>
                      <label className="flex items-center gap-3 text-sm">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-gray-300"
                          checked={alcohol}
                          onChange={(e) => setAlcohol(e.target.checked)}
                          disabled={busy}
                        />
                        Alcohol
                      </label>
                      <label className="flex items-center gap-3 text-sm">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-gray-300"
                          checked={illness}
                          onChange={(e) => setIllness(e.target.checked)}
                          disabled={busy}
                        />
                        Sick / unwell
                      </label>
                    </div>
                  </div>

                  {/* Sleep & Stress */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Moon className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium text-foreground">Sleep & stress</span>
                    </div>
                    <div className="text-xs text-muted-foreground">Affects temperature reliability</div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground" htmlFor="sleepHours">
                          Sleep hours
                        </label>
                        <input
                          id="sleepHours"
                          type="number"
                          inputMode="decimal"
                          step="0.5"
                          placeholder="8"
                          className="h-12 w-full rounded-lg border bg-background px-4 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                          value={sleepHours}
                          onChange={(e) => setSleepHours(e.target.value)}
                          disabled={busy}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground" htmlFor="stress">
                          Stress (0–10)
                        </label>
                        <input
                          id="stress"
                          type="number"
                          inputMode="numeric"
                          min={0}
                          max={10}
                          step={1}
                          placeholder="0"
                          className="h-12 w-full rounded-lg border bg-background px-4 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                          value={stress}
                          onChange={(e) => setStress(e.target.value)}
                          disabled={busy}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Temperature Quality */}
                  <div className="space-y-3">
                    <div className="text-sm font-medium text-foreground">Temperature quality</div>
                    <div className="space-y-3">
                      <label className="flex items-center gap-3 text-sm">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-gray-300"
                          checked={fever}
                          onChange={(e) => setFever(e.target.checked)}
                          disabled={busy}
                        />
                        Fever today
                      </label>
                      <label className="flex items-center gap-3 text-sm">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-gray-300"
                          checked={lateNight}
                          onChange={(e) => setLateNight(e.target.checked)}
                          disabled={busy}
                        />
                        Late night / unusual sleep
                      </label>
                      <label className="flex items-center gap-3 text-sm">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-gray-300"
                          checked={measuredLate}
                          onChange={(e) => setMeasuredLate(e.target.checked)}
                          disabled={busy}
                        />
                        Measured later than usual
                      </label>
                    </div>
                  </div>

                  {/* Mucus Quality */}
                  <div className="space-y-3">
                    <div className="text-sm font-medium text-foreground">Mucus reliability</div>
                    <div className="space-y-3">
                      <label className="flex items-center gap-3 text-sm">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-gray-300"
                          checked={semenExposure}
                          onChange={(e) => setSemenExposure(e.target.checked)}
                          disabled={busy}
                        />
                        Semen exposure
                      </label>
                      <label className="flex items-center gap-3 text-sm">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-gray-300"
                          checked={infection}
                          onChange={(e) => setInfection(e.target.checked)}
                          disabled={busy}
                        />
                        Possible infection
                      </label>
                    </div>
                  </div>

                  {/* Notes */}
                  <div className="space-y-3">
                    <div className="text-sm font-medium text-foreground">Notes</div>
                    <textarea
                      className="min-h-[96px] w-full resize-none rounded-lg border bg-background px-4 py-3 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      placeholder="Optional notes..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      disabled={busy}
                    />
                    <div className="text-xs text-muted-foreground">Avoid adding identifying info.</div>
                  </div>
                </div>
              </details>
            </div>

            {/* Save Button */}
            <div className="pt-4" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 12px)' }}>
              <Button className="h-14 w-full text-base font-medium" onClick={save} disabled={busy}>
                <Save className="mr-2 h-5 w-5" />
                Save observation
              </Button>

              {/* Status Message */}
              {status && (
                <div className="mt-4 flex items-center justify-center gap-2 p-3 rounded-lg bg-muted/50">
                  {statusTone === 'ok' && <CheckCircle className="h-4 w-4 text-green-600" />}
                  {statusTone === 'danger' && <AlertCircle className="h-4 w-4 text-red-600" />}
                  <span
                    className={`text-sm ${
                      statusTone === 'danger'
                        ? 'text-red-600'
                        : statusTone === 'ok'
                          ? 'text-green-600'
                          : 'text-muted-foreground'
                    }`}
                    role="status"
                  >
                    {status}
                  </span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
