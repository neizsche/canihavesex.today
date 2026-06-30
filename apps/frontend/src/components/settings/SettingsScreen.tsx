import * as React from 'react';
import { Trash2, CheckCircle2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';

import { apiJson } from '@/lib/api';
import {
  updateCacheFromMutation,
  clearPersistedCache,
  type MutationResponse,
} from '@/lib/cacheUtils';
import { Header } from '@/components/common/Header';
import { ActionSheet } from '@/components/common/ui/action-sheet';
import { HelpScreen } from './HelpScreen';
import { SETTINGS_SCREEN_LABELS } from './SettingsScreen.config';
import { useSession } from '@/hooks/queries/useSession';
import { useDiscreetMode } from '@/hooks/queries/useDiscreetMode';
import { useTheme } from '@/hooks/useTheme';
import { useBillingStatus } from '@/hooks/queries/useBillingStatus';
import { useProfileSettings } from '@/hooks/queries/useProfileSettings';
import { AccountHub } from './AccountHub';
import { CycleScreen } from './CycleScreen';
import { SettingsAccountActions } from './SettingsAccountActions';
import { SettingsPreferencesSection } from './SettingsPreferencesSection';

type ConfirmAction = 'delete-all' | 'delete-account' | null;

type SettingsView = 'main' | 'help' | 'cycle';

export function SettingsScreen() {
  const queryClient = useQueryClient();
  const [confirmAction, setConfirmAction] = React.useState<ConfirmAction>(null);
  const [busy, setBusy] = React.useState(false);
  const [success, setSuccess] = React.useState<{
    caption: string;
    variant: 'success' | 'destructive';
  } | null>(null);
  const [view, setView] = React.useState<SettingsView>('main');
  // Open when the user taps a demo-locked action — explains why it's unavailable.
  const [demoLockOpen, setDemoLockOpen] = React.useState(false);

  const { data: session } = useSession();
  const { data: billing } = useBillingStatus();
  const {
    cycleLength,
    periodLength,
    regularity,
    temperatureUnit,
    setTemperatureUnit,
    saveProfile,
  } = useProfileSettings();
  // The shared public demo account can't delete its data or itself — those
  // would wipe the demo for everyone. Lock those rows (server-enforced too).
  const isDemo = billing?.state === 'demo';
  const { showBranding: brandingVisible } = useDiscreetMode();
  const { theme, setTheme } = useTheme();

  async function executeDeleteAllData() {
    setBusy(true);
    try {
      const data = await apiJson<MutationResponse>('/api/v1/user/data', { method: 'DELETE' });
      updateCacheFromMutation(queryClient, data);

      // Clear all queries and the persisted localStorage cache so a
      // subsequent login on the same device starts clean.
      queryClient.clear();
      clearPersistedCache();

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

      // Wipe in-memory cache + persisted localStorage cache so the next
      // user on this device doesn't inherit stale session/data.
      queryClient.clear();
      clearPersistedCache();

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

      // Purge the persisted query cache so the next user on this device
      // doesn't see stale session data from the previous account.
      queryClient.clear();
      clearPersistedCache();

      window.location.href = '/';
    } catch (err) {
      alert('Signout failed. Please try again.');
    }
  }

  if (view === 'help') {
    return <HelpScreen onBack={() => setView('main')} />;
  }

  if (view === 'cycle') {
    return <CycleScreen onBack={() => setView('main')} />;
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
          <div className="max-w-md mx-auto space-y-6 sm:space-y-7">
            <div className="px-4 flex flex-col gap-1">
              <h1 className="text-[30px] font-extrabold tracking-[-0.04em] text-zinc-900 dark:text-zinc-100 leading-tight">
                {SETTINGS_SCREEN_LABELS.header}
              </h1>
            </div>

            <AccountHub session={session} email={session?.email} onHelp={() => setView('help')} />

            <SettingsPreferencesSection
              cycleLength={cycleLength}
              periodLength={periodLength}
              regularity={regularity}
              temperatureUnit={temperatureUnit}
              brandingVisible={brandingVisible}
              theme={theme}
              onOpenCycle={() => setView('cycle')}
              onThemeChange={(checked) => {
                const next = checked ? 'dark' : 'light';
                setTheme(next);
                saveProfile({ theme: next });
              }}
              onDiscreetModeChange={(checked) => {
                saveProfile({ show_branding: !checked });
              }}
              onTemperatureUnitChange={() => {
                const next = temperatureUnit === 'celsius' ? 'fahrenheit' : 'celsius';
                setTemperatureUnit(next);
                saveProfile({ temperature_unit: next });
              }}
            />

            <SettingsAccountActions
              email={session?.email}
              busy={busy}
              isDemo={isDemo}
              onSignOut={signout}
              onDeleteAllData={() =>
                isDemo ? setDemoLockOpen(true) : setConfirmAction('delete-all')
              }
              onDeleteAccount={() =>
                isDemo ? setDemoLockOpen(true) : setConfirmAction('delete-account')
              }
              onSignIn={() => window.dispatchEvent(new Event('auth:open'))}
            />
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
            isOpen={demoLockOpen}
            onClose={() => setDemoLockOpen(false)}
            title="Not available in the demo"
            description="You're exploring the shared demo account, so this is read-only. Create your own account to delete data or manage your account."
            actions={[]}
          />
        </div>
      </div>
    </div>
  );
}
