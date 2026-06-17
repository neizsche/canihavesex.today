import * as React from 'react';
import {
  Trash2,
  LogOut,
  HelpCircle,
  CheckCircle2,
  Activity,
  KeyRound,
  Copy,
  Minus,
  Plus,
  Pill,
  Baby,
  EyeOff,
  Moon,
} from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';

import { apiJson } from '@/lib/api';
import { updateCacheFromMutation, type MutationResponse } from '@/lib/cacheUtils';
import { Header } from '@/components/common/Header';
import { InsetGroup } from '@/components/common/ui/inset-group';
import { ActionSheet } from '@/components/common/ui/action-sheet';
import { Button } from '@/components/common/ui/button';
import { HelpScreen } from './HelpScreen';
import {
  SettingsActionRow,
  SettingsExpandableRow,
  SettingsToggleRow,
} from '@/components/common/ui/settings-row';
import { SETTINGS_SCREEN_LABELS } from './SettingsScreen.config';
import { ToggleTile } from '@/components/common/ui/toggle-tile';
import { useSession } from '@/hooks/queries/useSession';
import { useDiscreetMode } from '@/hooks/queries/useDiscreetMode';
import { useTheme } from '@/hooks/useTheme';

interface UserProfile {
  cycle_regularity: string | null;
  context_flags: string[];
  intent: string | null;
  avg_cycle_length: number;
  last_period_start: string | null;
  period_length: number;
  show_branding: boolean;
  theme: 'light' | 'dark';
}

const CONTEXT_FLAG_OPTIONS = [
  { id: 'pcos', label: 'PCOS', icon: Activity, bg: 'bg-purple-500/10', text: 'text-purple-500' },
  {
    id: 'thyroid',
    label: 'Thyroid',
    icon: Activity,
    bg: 'bg-orange-500/10',
    text: 'text-orange-500',
  },
  {
    id: 'post_birth_control',
    label: 'Post-BC',
    icon: Pill,
    bg: 'bg-blue-500/10',
    text: 'text-blue-500',
  },
  {
    id: 'breastfeeding',
    label: 'Nursing',
    icon: Baby,
    bg: 'bg-pink-500/10',
    text: 'text-pink-500',
  },
] as const;

type ConfirmAction = 'delete-all' | 'delete-account' | null;

const SHORTCUT_INSTALL_URL = 'https://example.com/shortcut';

type ApiKey = {
  id: string;
  name: string | null;
  keyPrefix: string;
  createdAt: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
};

function formatShortDate(value?: string | null): string {
  if (!value) return 'Never';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Never';
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function SettingsScreen() {
  const queryClient = useQueryClient();
  const [confirmAction, setConfirmAction] = React.useState<ConfirmAction>(null);
  const [busy, setBusy] = React.useState(false);
  const [success, setSuccess] = React.useState<{
    caption: string;
    variant: 'success' | 'destructive';
  } | null>(null);
  const [view, setView] = React.useState<'main' | 'help'>('main');
  const [cycleConfigOpen, setCycleConfigOpen] = React.useState(false);
  const [apiKeyBusy, setApiKeyBusy] = React.useState(false);
  const [newApiKey, setNewApiKey] = React.useState<string | null>(null);
  const [copiedKey, setCopiedKey] = React.useState(false);
  const [revokeTarget, setRevokeTarget] = React.useState<ApiKey | null>(null);
  const [regenConfirmOpen, setRegenConfirmOpen] = React.useState(false);
  const [shortcutOpen, setShortcutOpen] = React.useState(false);

  // Profile data state - Populated from server on load
  const [lastPeriod, setLastPeriod] = React.useState(new Date().toISOString().slice(0, 10));
  const [cycleMin, setCycleMin] = React.useState(26);
  const [cycleMax, setCycleMax] = React.useState(30);
  const [periodLength, setPeriodLength] = React.useState(5);
  const [regularity, setRegularity] = React.useState<'regular' | 'irregular' | 'unsure'>('regular');
  const [contextFlags, setContextFlags] = React.useState<string[]>([]);
  const [profileSaved, setProfileSaved] = React.useState(false);
  const [profileLoaded, setProfileLoaded] = React.useState(false);
  const saveTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: session } = useSession();
  const { showBranding: brandingVisible } = useDiscreetMode();
  const { theme, setTheme } = useTheme();

  // Fetch profile data from server
  const profileQuery = useQuery({
    queryKey: ['user-profile'],
    queryFn: () => apiJson<UserProfile>('/api/v1/user/profile'),
    enabled: !!session?.userId,
    staleTime: 60_000,
  });

  // Populate local state from server profile
  React.useEffect(() => {
    if (profileQuery.data && !profileLoaded) {
      const p = profileQuery.data;
      if (p.last_period_start) setLastPeriod(p.last_period_start);
      if (p.avg_cycle_length) {
        // Derive min/max from avg (±2 days)
        const avg = Math.round(p.avg_cycle_length);
        setCycleMin(Math.max(21, avg - 2));
        setCycleMax(Math.min(35, avg + 2));
      }
      if (p.period_length) setPeriodLength(p.period_length);
      if (p.cycle_regularity)
        setRegularity(p.cycle_regularity as 'regular' | 'irregular' | 'unsure');
      if (p.context_flags) setContextFlags(p.context_flags);
      // Server preference wins so the theme syncs across devices.
      if (p.theme === 'light' || p.theme === 'dark') setTheme(p.theme);
      setProfileLoaded(true);
    }
  }, [profileQuery.data, profileLoaded, setTheme]);

  // Debounced auto-save helper
  const saveProfile = React.useCallback(
    (patch: Record<string, any>) => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(async () => {
        try {
          await apiJson('/api/v1/user/profile', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(patch),
          });
          setProfileSaved(true);
          setTimeout(() => setProfileSaved(false), 1200);
          // Push the patch into the shared ['user-profile'] cache instead of refetching.
          // This keeps consumers like useDiscreetMode in sync instantly with no extra
          // network call (PATCH returns nothing reusable, and local state already reflects it).
          queryClient.setQueryData<UserProfile>(['user-profile'], (old) =>
            old ? { ...old, ...patch } : old
          );
          // Insights still need refreshing since cycle config affects predictions.
          queryClient.invalidateQueries({ queryKey: ['insights'] });
        } catch {
          // Silent fail — non-critical save
        }
      }, 800);
    },
    [queryClient]
  );

  const apiKeysQuery = useQuery({
    queryKey: ['api-keys'],
    queryFn: () => apiJson<{ keys: ApiKey[] }>('/api/v1/keys'),
    // Only fetch when the Apple Shortcuts section is actually opened
    enabled: !!session?.userId && shortcutOpen,
    staleTime: 10_000,
  });

  const apiKeys = (apiKeysQuery.data?.keys ?? []).filter((key) => !key.revokedAt);
  const activeKey = apiKeys[0] ?? null;

  async function createApiKey(regenerate = false) {
    setApiKeyBusy(true);
    setCopiedKey(false);
    try {
      const data = await apiJson<{
        key: string;
        keyId: string;
        keyPrefix: string;
        name: string;
        createdAt: string;
      }>('/api/v1/keys', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ regenerate }),
      });
      setNewApiKey(data.key);
      // The POST already returns the new key — write it into cache directly
      // instead of triggering a redundant GET. On regenerate the server revoked
      // all prior keys, so replace the list rather than appending.
      const newEntry: ApiKey = {
        id: data.keyId,
        name: data.name,
        keyPrefix: data.keyPrefix,
        createdAt: data.createdAt,
        lastUsedAt: null,
        revokedAt: null,
      };
      queryClient.setQueryData<{ keys: ApiKey[] }>(['api-keys'], (old) => ({
        keys: [newEntry, ...(regenerate ? [] : (old?.keys ?? []))],
      }));
    } catch (err) {
      alert('Could not create API key. Please try again.');
    }
    setApiKeyBusy(false);
  }

  async function regenerateApiKey() {
    setRegenConfirmOpen(false);
    await createApiKey(true);
  }

  async function copyApiKey() {
    if (!newApiKey) return;
    try {
      await navigator.clipboard.writeText(newApiKey);
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 1200);
    } catch (err) {
      alert('Copy failed. Please select the key manually.');
    }
  }

  async function revokeApiKey() {
    if (!revokeTarget) return;
    setApiKeyBusy(true);
    try {
      await apiJson(`/api/v1/keys/${revokeTarget.id}`, { method: 'DELETE' });
      if (revokeTarget.id === activeKey?.id) {
        setNewApiKey(null);
      }
      // Drop the revoked key from cache directly — no need to refetch the list.
      queryClient.setQueryData<{ keys: ApiKey[] }>(['api-keys'], (old) =>
        old ? { keys: old.keys.filter((k) => k.id !== revokeTarget.id) } : old
      );
    } catch (err) {
      alert('Could not revoke API key. Please try again.');
    }
    setApiKeyBusy(false);
  }

  async function executeDeleteAllData() {
    setBusy(true);
    try {
      const data = await apiJson<MutationResponse>('/api/v1/user/data', { method: 'DELETE' });
      updateCacheFromMutation(queryClient, data);

      // Clear all queries and redirect to onboarding
      queryClient.clear();

      setConfirmAction(null);
      setSuccess({ caption: 'Data Deleted', variant: 'destructive' });

      setTimeout(() => {
        setSuccess(null);
        window.location.hash = '#/onboarding';
        window.location.reload();
      }, 1000);
    } catch (err) {
      alert('Could not delete data. Please try again.');
    }
    setBusy(false);
  }

  async function executeDeleteAccount() {
    setBusy(true);
    try {
      await apiJson('/api/v1/user/account', { method: 'DELETE' });
      setConfirmAction(null);
      setSuccess({ caption: 'Account Deleted', variant: 'destructive' });
      setTimeout(() => {
        window.location.href = '/';
      }, 1500);
    } catch (err) {
      alert('Could not delete account. Please try again.');
      setBusy(false);
      setConfirmAction(null);
    }
  }

  async function handleConfirmAction() {
    if (confirmAction === 'delete-all') await executeDeleteAllData();
    else if (confirmAction === 'delete-account') await executeDeleteAccount();
  }

  async function signout() {
    try {
      await apiJson('/api/signout', { method: 'POST' });
      window.location.href = '/';
    } catch (err) {
      alert('Signout failed. Please try again.');
    }
  }

  const handleDateBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const val = e.target.value;
    const d = new Date(val);
    if (
      isNaN(d.getTime()) ||
      val.length !== 10 ||
      !/^\d{4}-\d{2}-\d{2}$/.test(val) ||
      d > new Date()
    ) {
      setLastPeriod(new Date().toISOString().slice(0, 10)); // Reset to today
    } else {
      setLastPeriod(val);
    }
  };

  if (view === 'help') {
    return <HelpScreen onBack={() => setView('main')} />;
  }

  if (success) {
    return (
      <div className="h-full bg-background font-sans flex flex-col">
        <Header />
        <div className="flex-1 flex flex-col items-center justify-center min-h-0 space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div
            className={cn(
              'rounded-full p-5 flex items-center justify-center shadow-sm',
              success.variant === 'success'
                ? 'bg-emerald-100/80 dark:bg-emerald-900/20'
                : 'bg-zinc-100 dark:bg-zinc-800'
            )}
          >
            {success.variant === 'success' ? (
              <CheckCircle2
                className="w-10 h-10 text-emerald-600 dark:text-emerald-500"
                strokeWidth={2.5}
              />
            ) : (
              <Trash2 className="w-10 h-10 text-zinc-500 dark:text-zinc-400" strokeWidth={2} />
            )}
          </div>
          <h2 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
            {success.caption}
          </h2>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-background font-sans flex flex-col">
      <Header />
      <div className="flex-1 overflow-y-auto no-scrollbar">
        <div
          className={cn(
            'pb-24 section-content',
            brandingVisible ? 'pt-6 sm:pt-8' : 'pt-10 sm:pt-12'
          )}
        >
          <div className="max-w-md mx-auto space-y-6 sm:space-y-8">
            <div className="px-4 flex flex-col gap-4">
              <h1 className="text-[34px] font-bold tracking-tight text-zinc-900 dark:text-zinc-100 leading-tight">
                {SETTINGS_SCREEN_LABELS.header}
              </h1>
            </div>

            {/* Profile Link */}
            <InsetGroup>
              <SettingsExpandableRow
                icon={<Activity className="icon-sm text-white" />}
                iconBgColor="bg-pink-500"
                title="Cycle Configuration"
                open={cycleConfigOpen}
                onToggle={() => setCycleConfigOpen((prev) => !prev)}
              >
                {/* Grouped Settings Card */}
                <div className="rounded-2xl border border-border/40 bg-white/70 dark:bg-zinc-900/50 overflow-hidden">
                  <div className="divide-y divide-zinc-200/50 dark:divide-zinc-800/50">
                    {/* Date Row */}
                    <div className="flex items-center justify-between p-3 px-4">
                      <div className="text-[13px] font-medium text-zinc-700 dark:text-zinc-300">
                        Last Period Start
                      </div>
                      <input
                        type="text"
                        value={lastPeriod}
                        onChange={(e) => setLastPeriod(e.target.value)}
                        onBlur={(e) => {
                          handleDateBlur(e);
                          const val = e.target.value;
                          const d = new Date(val);
                          if (
                            !isNaN(d.getTime()) &&
                            val.length === 10 &&
                            /^\d{4}-\d{2}-\d{2}$/.test(val) &&
                            d <= new Date()
                          ) {
                            saveProfile({ last_period_start: val });
                          }
                        }}
                        placeholder="YYYY-MM-DD"
                        className="w-[140px] text-right bg-transparent border-none focus:ring-0 text-[14px] font-medium text-zinc-900 dark:text-zinc-100 p-0 placeholder:text-zinc-400"
                      />
                    </div>

                    {/* Minimum Cycle Length Stepper */}
                    <div className="flex items-center justify-between p-3 px-4">
                      <div className="text-[13px] font-medium text-zinc-700 dark:text-zinc-300">
                        Minimum Length
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            const v = Math.max(21, cycleMin - 1);
                            setCycleMin(v);
                            saveProfile({ avg_cycle_length: Math.round((v + cycleMax) / 2) });
                          }}
                          className="w-7 h-7 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <div className="w-14 text-center font-semibold text-[14px] text-zinc-900 dark:text-zinc-100">
                          {cycleMin} days
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const v = Math.min(cycleMax, cycleMin + 1);
                            setCycleMin(v);
                            saveProfile({ avg_cycle_length: Math.round((v + cycleMax) / 2) });
                          }}
                          className="w-7 h-7 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Maximum Cycle Length Stepper */}
                    <div className="flex items-center justify-between p-3 px-4">
                      <div className="text-[13px] font-medium text-zinc-700 dark:text-zinc-300">
                        Maximum Length
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            const v = Math.max(cycleMin, cycleMax - 1);
                            setCycleMax(v);
                            saveProfile({ avg_cycle_length: Math.round((cycleMin + v) / 2) });
                          }}
                          className="w-7 h-7 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <div className="w-14 text-center font-semibold text-[14px] text-zinc-900 dark:text-zinc-100">
                          {cycleMax} days
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const v = Math.min(35, cycleMax + 1);
                            setCycleMax(v);
                            saveProfile({ avg_cycle_length: Math.round((cycleMin + v) / 2) });
                          }}
                          className="w-7 h-7 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Period Length Stepper */}
                    <div className="flex items-center justify-between p-3 px-4">
                      <div className="text-[13px] font-medium text-zinc-700 dark:text-zinc-300">
                        Typical Period
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            const v = Math.max(3, periodLength - 1);
                            setPeriodLength(v);
                            saveProfile({ period_length: v });
                          }}
                          className="w-7 h-7 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <div className="w-14 text-center font-semibold text-[14px] text-zinc-900 dark:text-zinc-100">
                          {periodLength} days
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const v = Math.min(7, periodLength + 1);
                            setPeriodLength(v);
                            saveProfile({ period_length: v });
                          }}
                          className="w-7 h-7 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Segmented Control for Regularity */}
                <div className="space-y-1.5 pt-2">
                  <div className="text-[11px] uppercase tracking-wide text-zinc-400 pl-2">
                    Cycle Regularity
                  </div>
                  <div className="flex items-center p-1 bg-zinc-100/80 dark:bg-zinc-800/80 rounded-xl">
                    {(['regular', 'irregular', 'unsure'] as const).map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => {
                          setRegularity(option);
                          saveProfile({ cycle_regularity: option });
                        }}
                        className={cn(
                          'flex-1 py-2 text-[12px] font-medium capitalize rounded-lg transition-all duration-200',
                          regularity === option
                            ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm'
                            : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300'
                        )}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Context Flags */}
                <div className="space-y-1.5 pt-2">
                  <div className="text-[11px] uppercase tracking-wide text-zinc-400 pl-2">
                    Health Context
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {CONTEXT_FLAG_OPTIONS.map((flag) => (
                      <ToggleTile
                        key={flag.id}
                        label={flag.label}
                        icon={flag.icon}
                        activeBgClass={flag.bg}
                        activeTextClass={flag.text}
                        checked={contextFlags.includes(flag.id)}
                        onChange={() => {
                          const newFlags = contextFlags.includes(flag.id)
                            ? contextFlags.filter((f) => f !== flag.id)
                            : [...contextFlags, flag.id];
                          setContextFlags(newFlags);
                          saveProfile({ context_flags: newFlags });
                        }}
                      />
                    ))}
                  </div>
                  <div className="text-[11px] text-zinc-500 dark:text-zinc-400 pl-2 pt-1">
                    Helps tune cycle predictions for your situation.
                  </div>
                </div>

                {/* Saved Indicator */}
                {profileSaved && (
                  <div className="flex items-center gap-1.5 pt-1 animate-in fade-in duration-200">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    <span className="text-[11px] font-medium text-emerald-500">Saved</span>
                  </div>
                )}
              </SettingsExpandableRow>
            </InsetGroup>

            {/* Display */}
            <InsetGroup>
              <div className="space-y-0 divide-y divide-border/30">
                <SettingsToggleRow
                  icon={<Moon className="icon-sm text-white" />}
                  iconBgColor="bg-slate-600"
                  label={SETTINGS_SCREEN_LABELS.appearance.darkMode}
                  description={SETTINGS_SCREEN_LABELS.appearance.darkModeHint}
                  checked={theme === 'dark'}
                  onChange={(checked) => {
                    const next = checked ? 'dark' : 'light';
                    setTheme(next);
                    saveProfile({ theme: next });
                  }}
                />
                <SettingsToggleRow
                  icon={<EyeOff className="icon-sm text-white" />}
                  iconBgColor="bg-indigo-500"
                  label={SETTINGS_SCREEN_LABELS.account.discreetMode}
                  description={SETTINGS_SCREEN_LABELS.account.discreetModeHint}
                  checked={!brandingVisible}
                  onChange={(checked) => {
                    // saveProfile writes show_branding into the shared
                    // ['user-profile'] cache, so useDiscreetMode (and this
                    // toggle) update instantly — no local mirror needed.
                    saveProfile({ show_branding: !checked });
                  }}
                />
              </div>
            </InsetGroup>

            {/* Account */}
            <InsetGroup>
              <div className="space-y-0 divide-y divide-border/30">
                {session?.email && (
                  <div className="px-4 py-3 sm:py-4 bg-zinc-50/50 dark:bg-zinc-900/50 text-left">
                    <div className="text-[10px] sm:text-[11px] font-bold text-zinc-400 uppercase tracking-widest mb-1">
                      {SETTINGS_SCREEN_LABELS.account.signedInAs}
                    </div>
                    <div className="text-sm sm:text-base font-semibold text-zinc-900 dark:text-zinc-100">
                      {session.email}
                    </div>
                  </div>
                )}
                {session?.email ? (
                  <>
                    <SettingsActionRow
                      icon={<LogOut className="icon-sm text-white" />}
                      iconBgColor="bg-zinc-500"
                      label={SETTINGS_SCREEN_LABELS.account.signOut}
                      onClick={signout}
                      disabled={busy}
                    />
                    <SettingsActionRow
                      icon={<Trash2 className="icon-sm text-white" />}
                      iconBgColor="bg-amber-500"
                      label={SETTINGS_SCREEN_LABELS.account.deleteAllData}
                      onClick={() => setConfirmAction('delete-all')}
                      disabled={busy}
                    />
                    <SettingsActionRow
                      icon={<Trash2 className="icon-sm text-white" />}
                      iconBgColor="bg-red-600"
                      label={SETTINGS_SCREEN_LABELS.account.deleteAccount}
                      onClick={() => setConfirmAction('delete-account')}
                      disabled={busy}
                      destructive
                    />
                  </>
                ) : (
                  <SettingsActionRow
                    icon={
                      <LogOut className="icon-sm text-white" style={{ transform: 'scaleX(-1)' }} />
                    }
                    iconBgColor="bg-[#007aff]"
                    label={SETTINGS_SCREEN_LABELS.account.signIn}
                    onClick={() => window.dispatchEvent(new Event('auth:open'))}
                  />
                )}
              </div>
            </InsetGroup>

            {/* Shortcuts */}
            <InsetGroup>
              <SettingsExpandableRow
                icon={<KeyRound className="icon-sm text-white" />}
                iconBgColor="bg-emerald-500"
                title="Apple Shortcuts"
                open={shortcutOpen}
                onToggle={() => setShortcutOpen((prev) => !prev)}
              >
                <div className="rounded-2xl border border-border/40 bg-white/70 dark:bg-zinc-900/50 p-3 space-y-2">
                  <div className="flex items-center justify-between text-[11px] uppercase tracking-wide text-zinc-400">
                    <span>Secure Key</span>
                    <span>
                      {activeKey
                        ? `Last used ${formatShortDate(activeKey.lastUsedAt)}`
                        : 'Not connected'}
                    </span>
                  </div>
                  {newApiKey ? (
                    <textarea
                      readOnly
                      rows={2}
                      value={newApiKey}
                      onFocus={(e) => e.currentTarget.select()}
                      className="w-full resize-none rounded-lg border border-zinc-200/60 dark:border-zinc-700/60 bg-white/80 dark:bg-zinc-950/40 px-2 py-2 text-[12px] font-mono text-zinc-900 dark:text-zinc-100"
                    />
                  ) : activeKey ? (
                    <div className="text-[13px] font-mono text-zinc-700 dark:text-zinc-200">
                      {activeKey.keyPrefix}…
                    </div>
                  ) : (
                    <div className="text-[13px] text-zinc-600 dark:text-zinc-300">
                      Generate a key to connect Shortcuts.
                    </div>
                  )}
                  {newApiKey && (
                    <div className="text-[11px] text-amber-600/90 dark:text-amber-200/80">
                      Shown once. Save it to your Shortcut now.
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button asChild variant="outline" className="h-9 px-4 text-sm">
                    <a href={SHORTCUT_INSTALL_URL} target="_blank" rel="noreferrer">
                      Install Shortcut
                    </a>
                  </Button>
                  {!activeKey && (
                    <Button
                      onClick={() => createApiKey(false)}
                      disabled={apiKeyBusy}
                      className="h-9 px-4 text-sm"
                    >
                      Generate Key
                    </Button>
                  )}
                  {activeKey && (
                    <>
                      <Button
                        onClick={() => setRegenConfirmOpen(true)}
                        disabled={apiKeyBusy}
                        className="h-9 px-4 text-sm"
                      >
                        Regenerate Key
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setRevokeTarget(activeKey)}
                        disabled={apiKeyBusy}
                        className="h-9 px-3 text-sm"
                      >
                        Revoke Key
                      </Button>
                    </>
                  )}
                  {newApiKey && (
                    <Button
                      variant="outline"
                      onClick={copyApiKey}
                      disabled={apiKeyBusy}
                      className="h-9 px-3 text-sm"
                    >
                      <Copy className="icon-sm mr-2" />
                      {copiedKey ? 'Copied' : 'Copy Key'}
                    </Button>
                  )}
                </div>

                <div className="rounded-xl border border-border/30 bg-zinc-50/60 dark:bg-zinc-900/40 p-3 text-[11px] text-zinc-500 dark:text-zinc-400 space-y-1">
                  <div>1. Add the Shortcut.</div>
                  <div>2. Paste your key when prompted.</div>
                  <div>3. Log with one tap from Shortcuts.</div>
                </div>
              </SettingsExpandableRow>
            </InsetGroup>

            {/* Support */}
            <InsetGroup>
              <SettingsActionRow
                icon={<HelpCircle className="icon-sm text-white" />}
                iconBgColor="bg-blue-500"
                label={SETTINGS_SCREEN_LABELS.support.helpAndFeedback}
                onClick={() => setView('help')}
              />
            </InsetGroup>
          </div>

          <ActionSheet
            isOpen={confirmAction !== null}
            onClose={() => setConfirmAction(null)}
            title={
              confirmAction === 'delete-all'
                ? SETTINGS_SCREEN_LABELS.dialogs.deleteAll.title
                : SETTINGS_SCREEN_LABELS.dialogs.deleteAccount.title
            }
            description={
              confirmAction === 'delete-all'
                ? SETTINGS_SCREEN_LABELS.dialogs.deleteAll.description
                : SETTINGS_SCREEN_LABELS.dialogs.deleteAccount.description
            }
            actions={[
              {
                label:
                  confirmAction === 'delete-all'
                    ? SETTINGS_SCREEN_LABELS.dialogs.deleteAll.action
                    : SETTINGS_SCREEN_LABELS.dialogs.deleteAccount.action,
                onClick: handleConfirmAction,
                isDestructive: true,
              },
            ]}
          />

          <ActionSheet
            isOpen={revokeTarget !== null}
            onClose={() => setRevokeTarget(null)}
            title="REVOKE API KEY"
            description="This key will stop working immediately."
            actions={[
              {
                label: 'Revoke Key',
                onClick: revokeApiKey,
                isDestructive: true,
              },
            ]}
          />

          <ActionSheet
            isOpen={regenConfirmOpen}
            onClose={() => setRegenConfirmOpen(false)}
            title="REGENERATE API KEY"
            description="Your old key will stop working immediately."
            actions={[
              {
                label: 'Regenerate Key',
                onClick: regenerateApiKey,
                isDestructive: true,
              },
            ]}
          />
        </div>
      </div>
    </div>
  );
}
