import * as React from 'react';
import { Trash2, LogOut, HelpCircle, CheckCircle2, ChevronRight, Activity } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { BRAND } from '../../lib/siteConfig';
import { cn } from '../../lib/utils';
import { usePremiumFeatures } from '../../lib/featureFlags';

import { apiJson } from '../../lib/api';
import { updateCacheFromMutation, type MutationResponse } from '../../lib/cacheUtils';
import { Header } from '../common/Header';
import { InsetGroup } from '../common/ui/inset-group';
import { ActionSheet } from '../common/ui/action-sheet';
import { HelpScreen } from './HelpScreen';
import { AppModeSwitcher, type AppMode } from '../common/ui/app-mode-switcher';
import { SETTINGS_SCREEN_LABELS } from './SettingsScreen.config';
import { CycleSettingsScreen } from './CycleSettingsScreen';
import { PremiumUnlockCard } from '../common/ui/PremiumUnlockCard';

type ConfirmAction = 'reset' | 'delete-all' | 'delete-account' | null;

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

    // Profile data state - Kept here to preserve state across views
    const [lastPeriod, setLastPeriod] = React.useState(new Date().toISOString().slice(0, 10));
    const [cycleMin, setCycleMin] = React.useState(26);
    const [cycleMax, setCycleMax] = React.useState(30);
    const [periodLength, setPeriodLength] = React.useState(5);
    const [regularity, setRegularity] = React.useState<'regular' | 'irregular' | 'unsure'>('regular');

    const session = queryClient.getQueryData<{ userId: string; email?: string | null }>(['session']) ?? null;

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
            const data = await apiJson<MutationResponse>('/api/user/data/delete', { method: 'POST' });
            updateCacheFromMutation(queryClient, data);
            setConfirmAction(null);
            setSuccess({ caption: 'Data Deleted', variant: 'destructive' });
            setTimeout(() => setSuccess(null), 1000);
        } catch (err) {
            alert('Could not delete data. Please try again.');
        }
        setBusy(false);
    }

    async function executeDeleteAccount() {
        setBusy(true);
        try {
            await apiJson('/api/user/account/delete', { method: 'POST' });
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
            await fetch('/api/signout', { method: 'POST' });
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
                </div>
            </div>
        </div>
    );
}
