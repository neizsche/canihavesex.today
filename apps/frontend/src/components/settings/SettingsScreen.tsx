import * as React from 'react';
import { Trash2, LogOut, HelpCircle, CheckCircle2, ChevronRight, Activity, KeyRound, Copy } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { usePremiumFeatures } from '@/lib/featureFlags';

import { apiJson } from '@/lib/api';
import { updateCacheFromMutation, type MutationResponse } from '@/lib/cacheUtils';
import { Header } from '@/components/common/Header';
import { InsetGroup } from '@/components/common/ui/inset-group';
import { ActionSheet } from '@/components/common/ui/action-sheet';
import { Button } from '@/components/common/ui/button';
import { HelpScreen } from './HelpScreen';
import { AppModeSwitcher, type AppMode } from '@/components/common/ui/app-mode-switcher';
import { SETTINGS_SCREEN_LABELS } from './SettingsScreen.config';
import { CycleSettingsScreen } from './CycleSettingsScreen';
import { PremiumUnlockCard } from '@/components/common/ui/PremiumUnlockCard';
import { useSession } from '@/hooks/queries/useSession';

type ConfirmAction = 'reset' | 'delete-all' | 'delete-account' | null;

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
        year: 'numeric'
    });
}

export function SettingsScreen() {
    const queryClient = useQueryClient();
    const { premiumEnabled } = usePremiumFeatures();
    const [confirmAction, setConfirmAction] = React.useState<ConfirmAction>(null);
    const [busy, setBusy] = React.useState(false);
    const [success, setSuccess] = React.useState<{ caption: string; variant: 'success' | 'destructive' } | null>(null);
    const [view, setView] = React.useState<'main' | 'help' | 'cycle-settings'>('main');
    const [appMode, setAppMode] = React.useState<AppMode>('tracking');
    const [showPremiumUpsell, setShowPremiumUpsell] = React.useState(false);
    const premiumSectionRef = React.useRef<HTMLDivElement>(null);
    const [apiKeyBusy, setApiKeyBusy] = React.useState(false);
    const [newApiKey, setNewApiKey] = React.useState<string | null>(null);
    const [copiedKey, setCopiedKey] = React.useState(false);
    const [revokeTarget, setRevokeTarget] = React.useState<ApiKey | null>(null);
    const [regenConfirmOpen, setRegenConfirmOpen] = React.useState(false);
    const [shortcutOpen, setShortcutOpen] = React.useState(false);

    // Profile data state - Kept here to preserve state across views
    const [lastPeriod, setLastPeriod] = React.useState(new Date().toISOString().slice(0, 10));
    const [cycleMin, setCycleMin] = React.useState(26);
    const [cycleMax, setCycleMax] = React.useState(30);
    const [periodLength, setPeriodLength] = React.useState(5);
    const [regularity, setRegularity] = React.useState<'regular' | 'irregular' | 'unsure'>('regular');

    const { data: session } = useSession();

    const apiKeysQuery = useQuery({
        queryKey: ['api-keys'],
        queryFn: () => apiJson<{ keys: ApiKey[] }>('/api/v1/keys'),
        enabled: !!session?.userId,
        staleTime: 10_000
    });

    const apiKeys = (apiKeysQuery.data?.keys ?? []).filter((key) => !key.revokedAt);
    const activeKey = apiKeys[0] ?? null;

    // Enforce Dark Mode
    React.useEffect(() => {
        document.documentElement.classList.add('dark');
        localStorage.setItem('theme', 'dark');
    }, []);

    // Hide premium upsell on component mount (screen reload)
    React.useEffect(() => {
        setShowPremiumUpsell(false);
    }, []);

    const handlePremiumClick = (mode: AppMode) => {
        setShowPremiumUpsell(true);
        // Smooth scroll to premium section after a short delay
        setTimeout(() => {
            premiumSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
    };

    async function createApiKey(regenerate = false) {
        setApiKeyBusy(true);
        setCopiedKey(false);
        try {
            const data = await apiJson<{ key: string; keyId: string; keyPrefix: string; name: string }>('/api/v1/keys', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ regenerate })
            });
            setNewApiKey(data.key);
            await queryClient.invalidateQueries({ queryKey: ['api-keys'] });
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
            await queryClient.invalidateQueries({ queryKey: ['api-keys'] });
        } catch (err) {
            alert('Could not revoke API key. Please try again.');
        }
        setApiKeyBusy(false);
    }

    async function executeResetCycle() {
        setBusy(true);
        try {
            const data = await apiJson<MutationResponse>('/api/cycles/reset', { method: 'POST' });
            updateCacheFromMutation(queryClient, data);
            setConfirmAction(null);
            setSuccess({ caption: 'Cycle Reset', variant: 'success' });
            setTimeout(() => setSuccess(null), 1000);
        } catch (err) {
            alert('Could not reset cycle. Please try again.');
        }
        setBusy(false);
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
        if (confirmAction === 'reset') await executeResetCycle();
        else if (confirmAction === 'delete-all') await executeDeleteAllData();
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

    if (view === 'help') {
        return <HelpScreen onBack={() => setView('main')} />;
    }

    if (view === 'cycle-settings') {
        return (
            <CycleSettingsScreen
                onBack={() => setView('main')}
                lastPeriod={lastPeriod}
                setLastPeriod={setLastPeriod}
                cycleMin={cycleMin}
                setCycleMin={setCycleMin}
                cycleMax={cycleMax}
                setCycleMax={setCycleMax}
                periodLength={periodLength}
                setPeriodLength={setPeriodLength}
                regularity={regularity}
                setRegularity={setRegularity}
            />
        );
    }

    if (success) {
        return (
            <div className="h-full bg-background font-sans flex flex-col">
                <Header />
                <div className="flex-1 flex flex-col items-center justify-center min-h-0 space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-200">
                    <div className={cn(
                        "rounded-full p-5 flex items-center justify-center shadow-sm",
                        success.variant === 'success'
                            ? "bg-emerald-100/80 dark:bg-emerald-900/20"
                            : "bg-zinc-100 dark:bg-zinc-800"
                    )}>
                        {
                            success.variant === 'success' ? (
                                <CheckCircle2 className="w-10 h-10 text-emerald-600 dark:text-emerald-500" strokeWidth={2.5} />
                            ) : (
                                <Trash2 className="w-10 h-10 text-zinc-500 dark:text-zinc-400" strokeWidth={2} />
                            )
                        }
                    </div>
                    <h2 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
                        {success.caption}
                    </h2>
                </div>
            </div >
        );
    }

    return (
        <div className="h-full bg-background font-sans flex flex-col">
            <Header />
            <div className="flex-1 overflow-y-auto">
                <div className="pb-24 pt-6 sm:pt-8 section-content">
                    <div className="max-w-md mx-auto space-y-6 sm:space-y-8">
                        <div className="px-4 flex flex-col gap-4">
                            <h1 className="text-[34px] font-bold tracking-tight text-zinc-900 dark:text-zinc-100 leading-tight">
                                {SETTINGS_SCREEN_LABELS.header}
                            </h1>

                            {/* App Mode - Clean "Pill" Style */}
                            {premiumEnabled && (
                                <div className="flex flex-col items-center gap-3 py-2">
                                    <AppModeSwitcher
                                        value={appMode}
                                        onChange={setAppMode}
                                        variant="pill"
                                        onPremiumClick={handlePremiumClick}
                                        showHint={true}
                                    />
                                </div>
                            )}
                        </div>

                        {/* Profile Link */}
                        <InsetGroup title={SETTINGS_SCREEN_LABELS.sections.profile}>
                            <button
                                onClick={() => setView('cycle-settings')}
                                className="w-full h-11 sm:h-12 flex items-center justify-between hover:bg-zinc-100 dark:hover:bg-zinc-800 px-4 transition-all duration-200 active:bg-zinc-200 dark:active:bg-zinc-700"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-7 h-7 rounded-md bg-pink-500 flex items-center justify-center">
                                        <Activity className="icon-sm text-white" />
                                    </div>
                                    <div className="font-normal text-[15px] sm:text-[17px] text-zinc-900 dark:text-zinc-100">
                                        Cycle Configuration
                                    </div>
                                </div>
                                <ChevronRight className="icon-sm text-zinc-300" />
                            </button>
                        </InsetGroup>

                        {/* Account */}
                        <InsetGroup title={SETTINGS_SCREEN_LABELS.sections.account}>
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
                                        <button
                                            onClick={signout}
                                            disabled={busy}
                                            className="w-full h-11 sm:h-12 flex items-center justify-between hover:bg-zinc-100 dark:hover:bg-zinc-800 px-4 transition-all duration-200 active:bg-zinc-200 dark:active:bg-zinc-700 disabled:opacity-50"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-7 h-7 rounded-md bg-zinc-500 flex items-center justify-center">
                                                    <LogOut className="icon-sm text-white" />
                                                </div>
                                                <span className="font-normal text-[15px] sm:text-[17px] text-zinc-900 dark:text-zinc-100">
                                                    {SETTINGS_SCREEN_LABELS.account.signOut}
                                                </span>
                                            </div>
                                            <ChevronRight className="icon-sm text-zinc-300" />
                                        </button>

                                        <button
                                            onClick={() => setConfirmAction('delete-all')}
                                            disabled={busy}
                                            className="w-full h-11 sm:h-12 flex items-center justify-between hover:bg-zinc-100 dark:hover:bg-zinc-800 px-4 transition-all duration-200 active:bg-zinc-200 dark:active:bg-zinc-700 disabled:opacity-50"
                                        >
                                            <div className="flex items-center gap-3 text-left">
                                                <div className="w-7 h-7 rounded-md bg-amber-500 flex items-center justify-center">
                                                    <Trash2 className="icon-sm text-white" />
                                                </div>
                                                <div className="font-normal text-[15px] sm:text-[17px] text-zinc-900 dark:text-zinc-100">{SETTINGS_SCREEN_LABELS.account.deleteAllData}</div>
                                            </div>
                                            <ChevronRight className="icon-sm text-zinc-300" />
                                        </button>

                                        <button
                                            onClick={() => setConfirmAction('delete-account')}
                                            disabled={busy}
                                            className="w-full h-11 sm:h-12 flex items-center justify-between hover:bg-rose-100 dark:hover:bg-rose-950/30 px-4 transition-all duration-200 active:bg-rose-200 dark:active:bg-rose-950/40 disabled:opacity-50"
                                        >
                                            <div className="flex items-center gap-3 text-left">
                                                <div className="w-7 h-7 rounded-md bg-red-600 flex items-center justify-center">
                                                    <Trash2 className="icon-sm text-white" />
                                                </div>
                                                <div className="font-normal text-[15px] sm:text-[17px] text-zinc-900 dark:text-zinc-100">{SETTINGS_SCREEN_LABELS.account.deleteAccount}</div>
                                            </div>
                                            <ChevronRight className="icon-sm text-rose-400/50" />
                                        </button>
                                    </>
                                ) : (
                                    <button
                                        onClick={() => window.dispatchEvent(new Event('auth:open'))}
                                        className="w-full h-12 sm:h-14 flex items-center justify-between hover:bg-zinc-100 dark:hover:bg-zinc-800 px-4 transition-all duration-200 active:bg-zinc-200 dark:active:bg-zinc-700"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-7 h-7 rounded-md bg-[#007aff] flex items-center justify-center">
                                                <LogOut className="icon-sm text-white" style={{ transform: 'scaleX(-1)' }} />
                                            </div>
                                            <span className="font-normal text-base sm:text-lg text-zinc-900 dark:text-zinc-100">
                                                {SETTINGS_SCREEN_LABELS.account.signIn}
                                            </span>
                                        </div>
                                        <ChevronRight className="icon-sm text-zinc-300" />
                                    </button>
                                )}
                            </div>
                        </InsetGroup>

                        {/* Shortcuts */}
                        <InsetGroup title={SETTINGS_SCREEN_LABELS.sections.shortcuts} containerClassName="mb-3">
                            <div className="divide-y divide-zinc-200/50 dark:divide-zinc-800/50">
                                <button
                                    type="button"
                                    onClick={() => setShortcutOpen((prev) => !prev)}
                                    aria-expanded={shortcutOpen}
                                    aria-controls="settings-apple-shortcut"
                                    className="w-full min-h-[44px] sm:min-h-[48px] flex items-center justify-between px-4 py-3 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all duration-200 active:bg-zinc-200 dark:active:bg-zinc-700"
                                >
                                    <div className="flex items-center gap-3 text-left">
                                        <div className="w-7 h-7 rounded-md bg-emerald-500 flex items-center justify-center shrink-0">
                                            <KeyRound className="icon-sm text-white" />
                                        </div>
                                        <div className="space-y-0.5">
                                            <div className="font-normal text-[15px] sm:text-[17px] text-zinc-900 dark:text-zinc-100">
                                                Apple Shortcuts
                                            </div>
                                            <div className="text-xs text-zinc-500 dark:text-zinc-400">
                                                Log in seconds from the Shortcuts app with a secure key.
                                            </div>
                                        </div>
                                    </div>
                                    <ChevronRight
                                        className={cn(
                                            "icon-sm text-zinc-300 transition-transform",
                                            shortcutOpen && "rotate-90 text-zinc-500"
                                        )}
                                    />
                                </button>

                                <div
                                    id="settings-apple-shortcut"
                                    className={cn(
                                        "px-4 pt-4 pb-3 space-y-4 transition-all duration-300",
                                        shortcutOpen ? "opacity-100 max-h-[1200px]" : "opacity-0 max-h-0 overflow-hidden pointer-events-none"
                                    )}
                                >
                                    <div className="rounded-2xl border border-border/40 bg-white/70 dark:bg-zinc-900/50 p-3 space-y-2">
                                        <div className="flex items-center justify-between text-[11px] uppercase tracking-wide text-zinc-400">
                                            <span>Secure Key</span>
                                            <span>{activeKey ? `Last used ${formatShortDate(activeKey.lastUsedAt)}` : 'Not connected'}</span>
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
                                        <Button
                                            asChild
                                            variant="outline"
                                            className="h-9 px-4 text-sm"
                                        >
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
                                </div>
                            </div>
                        </InsetGroup>

                        {/* Support */}
                        <InsetGroup title={SETTINGS_SCREEN_LABELS.sections.support}>
                            <button
                                onClick={() => setView('help')}
                                className="w-full h-11 sm:h-12 flex items-center justify-between hover:bg-zinc-100 dark:hover:bg-zinc-800 px-4 transition-all duration-200 active:bg-zinc-200 dark:active:bg-zinc-700"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-7 h-7 rounded-md bg-blue-500 flex items-center justify-center">
                                        <HelpCircle className="icon-sm text-white" />
                                    </div>
                                    <div className="font-normal text-[15px] sm:text-[17px] text-zinc-900 dark:text-zinc-100">{SETTINGS_SCREEN_LABELS.support.helpAndFeedback}</div>
                                </div>
                                <ChevronRight className="icon-sm text-zinc-300" />
                            </button>
                        </InsetGroup>

                        {/* Premium Upsell - Conditionally shown if premium enabled */}
                        {premiumEnabled && showPremiumUpsell && (
                            <div
                                className={cn(
                                    "w-full px-4 transition-all duration-500 ease-out overflow-hidden shrink-0 animate-in fade-in slide-in-from-bottom-4"
                                )}
                            >
                                <div ref={premiumSectionRef}>
                                    <PremiumUnlockCard
                                        title="Premium Feature"
                                        description="Upgrade to unlock advanced cycle modes and personalized insights"
                                        className="max-w-md mx-auto"
                                    />
                                </div>
                            </div>
                        )}

                    </div>

                    <ActionSheet
                        isOpen={confirmAction !== null}
                        onClose={() => setConfirmAction(null)}
                        title={
                            confirmAction === 'reset'
                                ? SETTINGS_SCREEN_LABELS.dialogs.reset.title
                                : confirmAction === 'delete-all'
                                    ? SETTINGS_SCREEN_LABELS.dialogs.deleteAll.title
                                    : SETTINGS_SCREEN_LABELS.dialogs.deleteAccount.title
                        }
                        description={
                            confirmAction === 'reset'
                                ? SETTINGS_SCREEN_LABELS.dialogs.reset.description
                                : confirmAction === 'delete-all'
                                    ? SETTINGS_SCREEN_LABELS.dialogs.deleteAll.description
                                    : SETTINGS_SCREEN_LABELS.dialogs.deleteAccount.description
                        }
                        actions={[
                            {
                                label: confirmAction === 'reset'
                                    ? SETTINGS_SCREEN_LABELS.dialogs.reset.action
                                    : confirmAction === 'delete-all'
                                        ? SETTINGS_SCREEN_LABELS.dialogs.deleteAll.action
                                        : SETTINGS_SCREEN_LABELS.dialogs.deleteAccount.action,
                                onClick: handleConfirmAction,
                                isDestructive: true
                            }
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
                                isDestructive: true
                            }
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
                                isDestructive: true
                            }
                        ]}
                    />
                </div>
            </div>
        </div>
    );
}
