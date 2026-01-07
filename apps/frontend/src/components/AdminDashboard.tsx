import * as React from 'react';

import { getApiBase } from '../lib/api';
import { cn } from '../lib/utils';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Separator } from './ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';

type AdminUser = { id: string; email: string; createdAt?: string };
type AdminCycle = {
  id: string;
  userId: string;
  startDate: string;
  state: string;
  peakDate?: string | null;
  tempShiftConfirmedDate?: string | null;
  createdAt?: string;
};

type AdminLog = {
  id: string;
  userId: string;
  cycleId: string;
  date: string;
  mucusType: string;
  sensation: string;
  bleeding: string;
  temperature: number | null;
  lhTest: string;
  createdAt?: string;
};

type TabKey = 'overview' | 'users' | 'cycles' | 'logs';

type Selection =
  | { kind: 'none' }
  | { kind: 'user'; value: AdminUser }
  | { kind: 'cycle'; value: AdminCycle; userEmail: string | null }
  | { kind: 'log'; value: AdminLog; userEmail: string | null; cycle: AdminCycle | null };

const LS_API = 'admin_api_base';
const LS_TOKEN = 'admin_token';

function safeIsoDate(s?: string | null) {
  if (!s) return '';
  return String(s);
}

export function AdminDashboard() {
  const defaultApiBase = React.useMemo(() => getApiBase(), []);

  const [apiBase, setApiBase] = React.useState(() => {
    try {
      return (localStorage.getItem(LS_API) || defaultApiBase).replace(/\/$/, '');
    } catch {
      return defaultApiBase;
    }
  });

  const [token, setToken] = React.useState(() => {
    try {
      return localStorage.getItem(LS_TOKEN) || '';
    } catch {
      return '';
    }
  });

  const [activeTab, setActiveTab] = React.useState<TabKey>('overview');

  const [users, setUsers] = React.useState<AdminUser[]>([]);
  const [cycles, setCycles] = React.useState<AdminCycle[]>([]);
  const [logs, setLogs] = React.useState<AdminLog[]>([]);

  const [busy, setBusy] = React.useState(false);
  const [status, setStatus] = React.useState<string>('');
  const [query, setQuery] = React.useState('');
  const [selection, setSelection] = React.useState<Selection>({ kind: 'none' });

  const userById = React.useMemo(() => {
    const m = new Map<string, AdminUser>();
    for (const u of users) m.set(u.id, u);
    return m;
  }, [users]);

  const cycleById = React.useMemo(() => {
    const m = new Map<string, AdminCycle>();
    for (const c of cycles) m.set(c.id, c);
    return m;
  }, [cycles]);

  async function adminFetch<T>(path: string): Promise<T> {
    const res = await fetch(`${apiBase}${path}`, {
      headers: {
        ...(token ? { 'x-admin-token': token } : {}),
      },
    });

    if (res.status === 401) {
      throw new Error('Unauthorized (check ADMIN_TOKEN / x-admin-token)');
    }
    if (res.status === 404) {
      throw new Error('Admin endpoints not enabled (ADMIN_TOKEN missing on backend)');
    }
    if (!res.ok) {
      throw new Error(`Request failed (${res.status})`);
    }

    return (await res.json()) as T;
  }

  async function loadAll() {
    setBusy(true);
    setStatus('Loading…');
    try {
      const [u, c, l] = await Promise.all([
        adminFetch<{ users: AdminUser[] }>('/admin/users'),
        adminFetch<{ cycles: AdminCycle[] }>('/admin/cycles'),
        adminFetch<{ logs: AdminLog[] }>('/admin/logs?limit=200'),
      ]);

      setUsers(Array.isArray(u.users) ? u.users : []);
      setCycles(Array.isArray(c.cycles) ? c.cycles : []);
      setLogs(Array.isArray(l.logs) ? l.logs : []);

      setStatus('');
    } catch (e: any) {
      setStatus(e?.message || 'Error');
    } finally {
      setBusy(false);
    }
  }

  function saveSettings() {
    try {
      localStorage.setItem(LS_API, apiBase);
      localStorage.setItem(LS_TOKEN, token);
    } catch {
      // ignore
    }
    setStatus('Saved.');
  }

  React.useEffect(() => {
    void loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredUsers = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => u.id.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
  }, [users, query]);

  const filteredCycles = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return cycles;
    return cycles.filter((c) => {
      const email = userById.get(c.userId)?.email ?? '';
      return (
        c.id.toLowerCase().includes(q) ||
        c.userId.toLowerCase().includes(q) ||
        email.toLowerCase().includes(q) ||
        c.state.toLowerCase().includes(q) ||
        c.startDate.toLowerCase().includes(q)
      );
    });
  }, [cycles, query, userById]);

  const filteredLogs = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return logs;
    return logs.filter((l) => {
      const email = userById.get(l.userId)?.email ?? '';
      const cycle = cycleById.get(l.cycleId);
      const cycleState = cycle?.state ?? '';
      const cycleStart = cycle?.startDate ?? '';
      return (
        l.id.toLowerCase().includes(q) ||
        l.userId.toLowerCase().includes(q) ||
        l.cycleId.toLowerCase().includes(q) ||
        l.date.toLowerCase().includes(q) ||
        email.toLowerCase().includes(q) ||
        cycleState.toLowerCase().includes(q) ||
        cycleStart.toLowerCase().includes(q) ||
        l.mucusType.toLowerCase().includes(q) ||
        l.sensation.toLowerCase().includes(q) ||
        l.bleeding.toLowerCase().includes(q) ||
        l.lhTest.toLowerCase().includes(q)
      );
    });
  }, [logs, query, userById, cycleById]);

  const kpis = React.useMemo(() => {
    const totalUsers = users.length;
    const totalCycles = cycles.length;
    const totalLogs = logs.length;

    const last7Cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const last7Logs = logs.filter((l) => {
      const t = Date.parse(l.date);
      if (Number.isNaN(t)) return false;
      return t >= last7Cutoff;
    }).length;

    return { totalUsers, totalCycles, totalLogs, last7Logs };
  }, [users, cycles, logs]);

  function renderTabButton(tab: TabKey, label: string) {
    const active = activeTab === tab;
    return (
      <Button
        type="button"
        size="sm"
        variant={active ? 'default' : 'ghost'}
        onClick={() => {
          setActiveTab(tab);
          setSelection({ kind: 'none' });
        }}
        disabled={busy}
      >
        {label}
      </Button>
    );
  }

  return (
    <div className="space-y-4">
      <header className="space-y-1">
        <div className="text-sm text-muted-foreground">Admin</div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Users, cycles, and logs in one place.</p>
      </header>

      <Card>
        <CardHeader className="space-y-2">
          <CardTitle className="text-base">Connection</CardTitle>
          <CardDescription className="text-sm">Uses backend admin endpoints. Token is stored locally.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">API base</div>
              <Input value={apiBase} onChange={(e) => setApiBase(e.target.value)} placeholder={defaultApiBase} />
            </div>
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">Admin token (x-admin-token)</div>
              <Input value={token} onChange={(e) => setToken(e.target.value)} placeholder="ADMIN_TOKEN" type="password" />
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button type="button" variant="secondary" onClick={saveSettings} disabled={busy}>
              Save settings
            </Button>
            <Button type="button" variant="outline" onClick={loadAll} disabled={busy}>
              Refresh data
            </Button>
            <div className="sm:ml-auto">
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search (id, email, date, state…)" />
            </div>
          </div>

          {status ? <div className="text-sm text-muted-foreground" role="status">{status}</div> : null}
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="space-y-1">
            <CardDescription>Total users</CardDescription>
            <CardTitle className="text-xl">{kpis.totalUsers}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="space-y-1">
            <CardDescription>Total cycles</CardDescription>
            <CardTitle className="text-xl">{kpis.totalCycles}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="space-y-1">
            <CardDescription>Total logs</CardDescription>
            <CardTitle className="text-xl">{kpis.totalLogs}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="space-y-1">
            <CardDescription>Logs (last 7d)</CardDescription>
            <CardTitle className="text-xl">{kpis.last7Logs}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader className="space-y-2">
          <CardTitle className="text-base">Data</CardTitle>
          <CardDescription className="text-sm">Joint views with quick drill-down.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {renderTabButton('overview', 'Overview')}
            {renderTabButton('users', `Users (${users.length})`)}
            {renderTabButton('cycles', `Cycles (${cycles.length})`)}
            {renderTabButton('logs', `Logs (${logs.length})`)}
          </div>

          <Separator />

          <div className="grid gap-3 lg:grid-cols-3">
            <div className={cn('lg:col-span-2', selection.kind !== 'none' ? 'order-2 lg:order-1' : '')}>
              {activeTab === 'overview' ? (
                <div className="space-y-3">
                  <div className="text-sm font-medium">Recent logs (joined)</div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>User</TableHead>
                        <TableHead>Cycle</TableHead>
                        <TableHead>State</TableHead>
                        <TableHead>Mucus/Sensation</TableHead>
                        <TableHead>Bleeding</TableHead>
                        <TableHead>Temp</TableHead>
                        <TableHead>LH</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredLogs.slice(0, 50).map((l) => {
                        const email = userById.get(l.userId)?.email ?? null;
                        const cycle = cycleById.get(l.cycleId) ?? null;
                        return (
                          <TableRow
                            key={l.id}
                            className="cursor-pointer"
                            onClick={() => setSelection({ kind: 'log', value: l, userEmail: email, cycle })}
                          >
                            <TableCell className="whitespace-nowrap">{l.date}</TableCell>
                            <TableCell className="max-w-[220px] truncate">{email ?? l.userId}</TableCell>
                            <TableCell className="whitespace-nowrap">{cycle?.startDate ?? l.cycleId}</TableCell>
                            <TableCell className="whitespace-nowrap">{cycle?.state ?? '-'}</TableCell>
                            <TableCell className="whitespace-nowrap">{`${l.mucusType}/${l.sensation}`}</TableCell>
                            <TableCell className="whitespace-nowrap">{l.bleeding}</TableCell>
                            <TableCell className="whitespace-nowrap">{l.temperature == null ? '-' : String(l.temperature)}</TableCell>
                            <TableCell className="whitespace-nowrap">{l.lhTest}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              ) : null}

              {activeTab === 'users' ? (
                <div className="space-y-3">
                  <div className="text-sm font-medium">Users</div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Email</TableHead>
                        <TableHead>User ID</TableHead>
                        <TableHead>Created</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsers.map((u) => (
                        <TableRow
                          key={u.id}
                          className="cursor-pointer"
                          onClick={() => setSelection({ kind: 'user', value: u })}
                        >
                          <TableCell className="max-w-[280px] truncate">{u.email}</TableCell>
                          <TableCell className="max-w-[260px] truncate">{u.id}</TableCell>
                          <TableCell className="whitespace-nowrap">{safeIsoDate(u.createdAt) || '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : null}

              {activeTab === 'cycles' ? (
                <div className="space-y-3">
                  <div className="text-sm font-medium">Cycles (joined with user email)</div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Start date</TableHead>
                        <TableHead>State</TableHead>
                        <TableHead>User</TableHead>
                        <TableHead>Peak</TableHead>
                        <TableHead>Temp shift</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredCycles.map((c) => {
                        const email = userById.get(c.userId)?.email ?? null;
                        return (
                          <TableRow
                            key={c.id}
                            className="cursor-pointer"
                            onClick={() => setSelection({ kind: 'cycle', value: c, userEmail: email })}
                          >
                            <TableCell className="whitespace-nowrap">{c.startDate}</TableCell>
                            <TableCell className="whitespace-nowrap">{c.state}</TableCell>
                            <TableCell className="max-w-[220px] truncate">{email ?? c.userId}</TableCell>
                            <TableCell className="whitespace-nowrap">{safeIsoDate(c.peakDate) || '-'}</TableCell>
                            <TableCell className="whitespace-nowrap">{safeIsoDate(c.tempShiftConfirmedDate) || '-'}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              ) : null}

              {activeTab === 'logs' ? (
                <div className="space-y-3">
                  <div className="text-sm font-medium">Logs (joined with user + cycle)</div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>User</TableHead>
                        <TableHead>Cycle start</TableHead>
                        <TableHead>State</TableHead>
                        <TableHead>Mucus/Sensation</TableHead>
                        <TableHead>Bleeding</TableHead>
                        <TableHead>Temp</TableHead>
                        <TableHead>LH</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredLogs.map((l) => {
                        const email = userById.get(l.userId)?.email ?? null;
                        const cycle = cycleById.get(l.cycleId) ?? null;
                        return (
                          <TableRow
                            key={l.id}
                            className="cursor-pointer"
                            onClick={() => setSelection({ kind: 'log', value: l, userEmail: email, cycle })}
                          >
                            <TableCell className="whitespace-nowrap">{l.date}</TableCell>
                            <TableCell className="max-w-[220px] truncate">{email ?? l.userId}</TableCell>
                            <TableCell className="whitespace-nowrap">{cycle?.startDate ?? '-'}</TableCell>
                            <TableCell className="whitespace-nowrap">{cycle?.state ?? '-'}</TableCell>
                            <TableCell className="whitespace-nowrap">{`${l.mucusType}/${l.sensation}`}</TableCell>
                            <TableCell className="whitespace-nowrap">{l.bleeding}</TableCell>
                            <TableCell className="whitespace-nowrap">{l.temperature == null ? '-' : String(l.temperature)}</TableCell>
                            <TableCell className="whitespace-nowrap">{l.lhTest}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              ) : null}
            </div>

            <div className={cn(selection.kind !== 'none' ? 'order-1 lg:order-2' : '')}>
              <div className="sticky top-20">
                <Card>
                  <CardHeader className="space-y-2">
                    <CardTitle className="text-base">Details</CardTitle>
                    <CardDescription className="text-sm">Click a row to inspect joined details.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {selection.kind === 'none' ? (
                      <div className="text-sm text-muted-foreground">No row selected.</div>
                    ) : null}

                    {selection.kind === 'user' ? (
                      <div className="space-y-2">
                        <div className="text-sm font-medium">User</div>
                        <div className="text-sm">{selection.value.email}</div>
                        <div className="text-xs text-muted-foreground break-all">{selection.value.id}</div>
                        <pre className="max-h-[360px] overflow-auto rounded-md border bg-muted/30 p-3 text-xs">
                          {JSON.stringify(selection.value, null, 2)}
                        </pre>
                      </div>
                    ) : null}

                    {selection.kind === 'cycle' ? (
                      <div className="space-y-2">
                        <div className="text-sm font-medium">Cycle</div>
                        <div className="text-sm">{selection.value.startDate}</div>
                        <div className="text-xs text-muted-foreground">{selection.value.state}</div>
                        <div className="text-xs text-muted-foreground break-all">User: {selection.userEmail ?? selection.value.userId}</div>
                        <pre className="max-h-[360px] overflow-auto rounded-md border bg-muted/30 p-3 text-xs">
                          {JSON.stringify({ ...selection.value, userEmail: selection.userEmail }, null, 2)}
                        </pre>
                      </div>
                    ) : null}

                    {selection.kind === 'log' ? (
                      <div className="space-y-2">
                        <div className="text-sm font-medium">Log</div>
                        <div className="text-sm">{selection.value.date}</div>
                        <div className="text-xs text-muted-foreground break-all">User: {selection.userEmail ?? selection.value.userId}</div>
                        <div className="text-xs text-muted-foreground break-all">Cycle: {selection.cycle?.startDate ?? selection.value.cycleId}</div>
                        <pre className="max-h-[360px] overflow-auto rounded-md border bg-muted/30 p-3 text-xs">
                          {JSON.stringify(
                            {
                              ...selection.value,
                              userEmail: selection.userEmail,
                              cycle: selection.cycle,
                            },
                            null,
                            2
                          )}
                        </pre>
                      </div>
                    ) : null}
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
