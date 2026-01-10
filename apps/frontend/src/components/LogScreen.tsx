import * as React from 'react';
import { CalendarDays, Droplets, Save, Thermometer, TestTube2 } from 'lucide-react';

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
    };

    try {
      const res = await apiFetch('/api/log-day', {
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
    <div className="space-y-4">
      <header className="space-y-1">
        <div className="text-sm text-muted-foreground">Log</div>
        <h1 className="text-2xl font-semibold tracking-tight">Today’s observations</h1>
        <p className="text-sm text-muted-foreground">Record what you noticed today. Keep it simple and consistent.</p>
      </header>

      <Card>
        <CardHeader className="space-y-2">
          <CardTitle className="text-base">Entry</CardTitle>
          <CardDescription className="text-sm">One log per day. Temperature is optional.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-1">
            <div className="text-sm font-medium">Basics</div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="date">
              Date
            </label>
            <div className="relative">
              <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                id="date"
                type="date"
                className="h-12 w-full rounded-md border bg-background pl-10 pr-3 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                disabled={busy}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="temperature">
              Temperature (optional)
            </label>
            <div className="relative">
              <Thermometer className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                id="temperature"
                type="number"
                inputMode="decimal"
                step="0.01"
                placeholder="36.60"
                className="h-12 w-full rounded-md border bg-background pl-10 pr-3 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={temperature}
                onChange={(e) => setTemperature(e.target.value)}
                disabled={busy}
              />
            </div>
          </div>

          <Separator />

          <div className="space-y-1">
            <div className="text-sm font-medium">Fertility signs</div>
            <div className="text-xs text-muted-foreground">Pick the closest match. Don’t overthink it.</div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="mucusType">
              Cervical mucus
            </label>
            <div className="relative">
              <Droplets className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <select
                id="mucusType"
                className="h-12 w-full appearance-none rounded-md border bg-background pl-10 pr-10 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
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
            <label className="text-sm font-medium" htmlFor="sensation">
              Sensation
            </label>
            <select
              id="sensation"
              className="h-12 w-full appearance-none rounded-md border bg-background px-3 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
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
            <label className="text-sm font-medium" htmlFor="bleeding">
              Bleeding
            </label>
            <select
              id="bleeding"
              className="h-12 w-full appearance-none rounded-md border bg-background px-3 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
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
            <label className="text-sm font-medium" htmlFor="lhTest">
              LH test
            </label>
            <div className="relative">
              <TestTube2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <select
                id="lhTest"
                className="h-12 w-full appearance-none rounded-md border bg-background pl-10 pr-10 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
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

          <Separator />

          <div style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 12px)' }}>
            <Button className="mt-2 h-12 w-full" onClick={save} disabled={busy}>
              <Save className="mr-2 h-4 w-4" />
              Save log
            </Button>
            {status ? (
              <div
                className={
                  statusTone === 'danger'
                    ? 'mt-2 text-sm text-[hsl(var(--risk-high))]'
                    : statusTone === 'ok'
                      ? 'mt-2 text-sm text-[hsl(var(--risk-low))]'
                      : 'mt-2 text-sm text-muted-foreground'
                }
                role="status"
              >
                {status}
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
