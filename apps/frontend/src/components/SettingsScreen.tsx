
import * as React from 'react';
import { Sun, Moon, Trash2, RotateCcw, LogOut, Info, Shield, Scale, HelpCircle, FileText, X, CheckCircle2, ChevronRight } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { BRAND, CONTACT_EMAIL, LEGAL_TITLES } from '../lib/siteConfig';
import { cn } from '../lib/utils';

import { apiJson } from '../lib/api';
import { updateCacheFromMutation, type MutationResponse } from '../lib/cacheUtils';
import { Button } from './ui/button';
import { Header } from './Header';
import { InsetGroup } from './ui/inset-group';
import { ActionSheet, type ActionSheetAction } from './ui/action-sheet';
import { HelpScreen } from './HelpScreen';

type ConfirmAction = 'reset' | 'delete-all' | 'delete-account' | null;

export function SettingsScreen() {
    const queryClient = useQueryClient();
    const [confirmAction, setConfirmAction] = React.useState<ConfirmAction>(null);
    const [busy, setBusy] = React.useState(false);
    const [success, setSuccess] = React.useState<{ caption: string; variant: 'success' | 'destructive' } | null>(null);
    const [activeLegal, setActiveLegal] = React.useState<'about' | 'privacy' | 'terms' | 'how' | 'limits' | 'disclaimer' | null>(null);
    const [view, setView] = React.useState<'main' | 'help'>('main');

    const session = queryClient.getQueryData<{ userId: string; email?: string | null }>(['session']) ?? null;

    const [theme, setTheme] = React.useState<'light' | 'dark'>(() => {
        if (typeof window === 'undefined') return 'dark'; // Default to dark
        return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
    });

    // Fetch user preferences on mount
    React.useEffect(() => {
        if (!session?.userId) return;

        async function fetchPreferences() {
            try {
                const response = await apiJson<{ theme: 'light' | 'dark' }>('/api/preferences');
                const newTheme = response.theme || 'dark';
                setTheme(newTheme);
                document.documentElement.classList.toggle('dark', newTheme === 'dark');
                localStorage.setItem('theme', newTheme);
            } catch (err) {
                // Fallback to dark mode if API fails
                console.error('Failed to fetch preferences:', err);
            }
        }

        fetchPreferences();
    }, [session?.userId]);

    async function toggleTheme() {
        const next = theme === 'dark' ? 'light' : 'dark';
        setTheme(next);
        document.documentElement.classList.toggle('dark', next === 'dark');
        localStorage.setItem('theme', next);

        // Persist to backend if logged in
        if (session?.userId) {
            try {
                await apiJson('/api/preferences', {
                    method: 'PATCH',
                    headers: { 'content-type': 'application/json' },
                    body: JSON.stringify({ theme: next })
                });
            } catch (err) {
                console.error('Failed to save theme preference:', err);
            }
        }
    }

    async function executeResetCycle() {
        setBusy(true);
        try {
            const data = await apiJson<MutationResponse>('/api/reset-cycle', { method: 'POST' });

            // Update cache with response data - no refetch needed
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
            const data = await apiJson<MutationResponse>('/api/delete-all-data', { method: 'POST' });

            // Update cache with response data - no refetch needed
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
            await apiJson('/api/delete-account', { method: 'POST' });
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
                        {success.variant === 'success' ? (
                            <CheckCircle2 className="w-10 h-10 text-emerald-600 dark:text-emerald-500" strokeWidth={2.5} />
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
        <>
            <Header />
            <div className="pb-24 pt-6 sm:pt-8">
                <div className="max-w-md mx-auto space-y-6 sm:space-y-8">
                    <h1 className="px-4 text-[34px] font-bold tracking-tight text-zinc-900 dark:text-zinc-100 leading-tight pb-2">
                        Settings
                    </h1>

                    {/* Account - More Prominent (10% larger) */}
                    <InsetGroup title="Account">
                        <div className="space-y-0 divide-y divide-border/30">
                            {session?.email && (
                                <div className="px-4 py-3 sm:py-4 bg-zinc-50/50 dark:bg-zinc-900/50 text-left">
                                    <div className="text-[10px] sm:text-[11px] font-bold text-zinc-400 uppercase tracking-widest mb-1">
                                        Signed in as
                                    </div>
                                    <div className="text-sm sm:text-base font-semibold text-zinc-900 dark:text-zinc-100">
                                        {session.email}
                                    </div>
                                </div>
                            )}
                            {session?.email ? (
                                <button
                                    onClick={signout}
                                    disabled={busy}
                                    className="w-full h-12 sm:h-14 flex items-center justify-between hover:bg-zinc-100 dark:hover:bg-zinc-800 px-4 transition-all duration-200 active:bg-zinc-200 dark:active:bg-zinc-700 disabled:opacity-50"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-md bg-rose-500 flex items-center justify-center">
                                            <LogOut className="icon-sm sm:icon-md text-white" />
                                        </div>
                                        <span className="font-normal text-base sm:text-lg text-zinc-900 dark:text-zinc-100">
                                            Sign Out
                                        </span>
                                    </div>
                                    <ChevronRight className="icon-sm sm:icon-md text-zinc-300" />
                                </button>
                            ) : (
                                <button
                                    onClick={() => window.dispatchEvent(new Event('auth:open'))}
                                    className="w-full h-12 sm:h-14 flex items-center justify-between hover:bg-zinc-100 dark:hover:bg-zinc-800 px-4 transition-all duration-200 active:bg-zinc-200 dark:active:bg-zinc-700"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-md bg-[#007aff] flex items-center justify-center">
                                            <LogOut className="icon-sm sm:icon-md text-white" style={{ transform: 'scaleX(-1)' }} />
                                        </div>
                                        <span className="font-normal text-base sm:text-lg text-zinc-900 dark:text-zinc-100">
                                            Sign In
                                        </span>
                                    </div>
                                    <ChevronRight className="icon-sm sm:icon-md text-zinc-300" />
                                </button>
                            )}
                        </div>
                    </InsetGroup>

                    {/* Appearance */}
                    <InsetGroup title="Appearance">
                        <button
                            onClick={toggleTheme}
                            className="w-full h-11 sm:h-12 flex items-center justify-between hover:bg-zinc-100 dark:hover:bg-zinc-800 px-4 transition-all duration-200 active:bg-zinc-200 dark:active:bg-zinc-700"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-md bg-zinc-500 flex items-center justify-center">
                                    {theme === 'dark' ? (
                                        <Moon className="icon-sm sm:icon-md text-white" />
                                    ) : (
                                        <Sun className="icon-sm sm:icon-md text-white" />
                                    )}
                                </div>
                                <div className="font-normal text-[15px] sm:text-[17px] text-zinc-900 dark:text-zinc-100">
                                    {theme === 'dark' ? 'Dark Mode' : 'Light Mode'}
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-[15px] sm:text-[17px] text-zinc-400">Switch</span>
                                <ChevronRight className="icon-xs sm:icon-sm text-zinc-300" />
                            </div>
                        </button>
                    </InsetGroup>



                    {/* Data Management */}
                    <InsetGroup title="Data Management">
                        <div className="space-y-0 divide-y divide-border/30">
                            <button
                                onClick={() => setConfirmAction('reset')}
                                disabled={busy}
                                className="w-full h-11 sm:h-12 flex items-center justify-between hover:bg-zinc-100 dark:hover:bg-zinc-800 px-4 transition-all duration-200 active:bg-zinc-200 dark:active:bg-zinc-700 disabled:opacity-50"
                            >
                                <div className="flex items-center gap-3 text-left">
                                    <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-md bg-amber-500 flex items-center justify-center">
                                        <RotateCcw className="icon-xs sm:icon-sm text-white" />
                                    </div>
                                    <div className="font-normal text-[15px] sm:text-[17px] text-zinc-900 dark:text-zinc-100">Reset Cycle</div>
                                </div>
                                <ChevronRight className="icon-xs sm:icon-sm text-zinc-300" />
                            </button>

                            <button
                                onClick={() => setConfirmAction('delete-all')}
                                disabled={busy}
                                className="w-full h-11 sm:h-12 flex items-center justify-between hover:bg-zinc-100 dark:hover:bg-zinc-800 px-4 transition-all duration-200 active:bg-zinc-200 dark:active:bg-zinc-700 disabled:opacity-50"
                            >
                                <div className="flex items-center gap-3 text-left">
                                    <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-md bg-rose-600 flex items-center justify-center">
                                        <Trash2 className="icon-xs sm:icon-sm text-white" />
                                    </div>
                                    <div className="font-normal text-[15px] sm:text-[17px] text-zinc-900 dark:text-zinc-100">Delete All Data</div>
                                </div>
                                <ChevronRight className="icon-xs sm:icon-sm text-zinc-300" />
                            </button>
                        </div>
                    </InsetGroup>

                    {/* Advanced */}
                    <InsetGroup title="Advanced">
                        <button
                            onClick={() => setConfirmAction('delete-account')}
                            disabled={busy}
                            className="w-full h-11 sm:h-12 flex items-center justify-between hover:bg-rose-100 dark:hover:bg-rose-950/30 px-4 transition-all duration-200 active:bg-rose-200 dark:active:bg-rose-950/40 disabled:opacity-50"
                        >
                            <div className="flex items-center gap-3 text-left">
                                <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-md bg-red-600 flex items-center justify-center">
                                    <Trash2 className="icon-xs sm:icon-sm text-white" />
                                </div>
                                <div className="font-normal text-[15px] sm:text-[17px] text-zinc-900 dark:text-zinc-100">Delete Account</div>
                            </div>
                            <ChevronRight className="icon-xs sm:icon-sm text-rose-400/50" />
                        </button>
                    </InsetGroup>

                    {/* Support */}
                    <InsetGroup title="Support">
                        <button
                            onClick={() => setView('help')}
                            className="w-full h-11 sm:h-12 flex items-center justify-between hover:bg-zinc-100 dark:hover:bg-zinc-800 px-4 transition-all duration-200 active:bg-zinc-200 dark:active:bg-zinc-700"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-md bg-blue-500 flex items-center justify-center">
                                    <HelpCircle className="icon-sm sm:icon-md text-white" />
                                </div>
                                <div className="font-normal text-[15px] sm:text-[17px] text-zinc-900 dark:text-zinc-100">Help & Feedback</div>
                            </div>
                            <ChevronRight className="icon-xs sm:icon-sm text-zinc-300" />
                        </button>
                    </InsetGroup>

                    <div className="pt-4 sm:pt-8 text-center px-4">
                        <div className="text-[10px] sm:text-[11px] text-zinc-400 leading-relaxed font-medium">
                            {BRAND.PREFIX}<span className="text-rose-500 text-[12px] sm:text-[13px] font-black italic">{BRAND.HIGHLIGHT}</span>{BRAND.SUFFIX} <br />
                            V2.0.0 • Made with care
                        </div>
                    </div>

                </div>

                <ActionSheet
                    isOpen={confirmAction !== null}
                    onClose={() => setConfirmAction(null)}
                    title={
                        confirmAction === 'reset'
                            ? 'RESET CURRENT CYCLE'
                            : confirmAction === 'delete-all'
                                ? 'DELETE ALL HEALTH DATA'
                                : 'DELETE ACCOUNT'
                    }
                    description={
                        confirmAction === 'reset'
                            ? 'Clear current cycle analysis. Logs remain.'
                            : confirmAction === 'delete-all'
                                ? 'Permanently remove all logs and history. This action cannot be undone.'
                                : 'Permanently remove account and data. This action cannot be undone.'
                    }
                    actions={[
                        {
                            label: confirmAction === 'reset' ? 'Reset Cycle' : confirmAction === 'delete-all' ? 'Delete Data' : 'Delete Account',
                            onClick: handleConfirmAction,
                            isDestructive: true
                        }
                    ]}
                />
            </div>
        </>
    );
}
