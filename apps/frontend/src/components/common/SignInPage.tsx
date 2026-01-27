import * as React from 'react';
import { Button } from './ui/button';
import { getApiBase } from '../../lib/api';
import { BRAND, HERO } from '../../lib/siteConfig';
import { ShieldCheck } from 'lucide-react';

type StatusTone = 'muted' | 'danger';

interface SignInPageProps {
    returnTo?: string;
}

export function SignInPage({ returnTo = '/app#/today' }: SignInPageProps) {
    const [status, setStatus] = React.useState<string>('');
    const [statusTone, setStatusTone] = React.useState<StatusTone>('muted');
    const [busy, setBusy] = React.useState(false);

    const apiBase = React.useMemo(() => getApiBase(), []);

    function startGoogleOauth() {
        const url = `${apiBase}/api/auth/oauth/google/start?returnTo=${encodeURIComponent(returnTo)}`;
        location.href = url;
    }

    React.useEffect(() => {
        let cancelled = false;
        async function checkSession() {
            try {
                const res = await fetch(`${apiBase}/api/session/check`, { credentials: 'include' });
                if (cancelled) return;

                if (res.ok) {
                    const data = await res.json();
                    if (data.authenticated) {
                        location.href = returnTo;
                    }
                }
            } catch (err) {
                console.warn('Session check failed:', err);
            }
        }
        void checkSession();
        return () => {
            cancelled = true;
        };
    }, [apiBase, returnTo]);

    return (
        <div className="fixed inset-0 z-50 flex flex-col bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950">
            {/* Subtle background pattern */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,_rgba(17,24,39,0.02),transparent_70%)] pointer-events-none" />

            {/* Header - Minimal branding */}
            <div className="relative flex-shrink-0 pt-6 pb-4 flex items-center justify-center">
                <div className="text-base tracking-tight text-zinc-400 dark:text-zinc-500 font-medium">
                    {BRAND.PREFIX}<span className="text-rose-400 font-semibold italic">{BRAND.HIGHLIGHT}</span>{BRAND.SUFFIX}
                </div>
            </div>

            {/* Main Content - Centered */}
            <div className="relative flex-1 overflow-y-auto">
                <div className="min-h-full flex flex-col items-center justify-center px-6 py-12">
                    <div className="w-full max-w-[420px]">

                        {/* Card Container with glassmorphic effect */}
                        <div className="bg-white/80 dark:bg-zinc-900/50 backdrop-blur-xl rounded-[32px] shadow-2xl shadow-zinc-900/5 dark:shadow-black/20 border border-zinc-200/50 dark:border-zinc-800/50 p-10 space-y-8">

                            {/* Logo */}
                            <div className="flex justify-center">
                                <div className="relative">
                                    <img
                                        src="/logo.png"
                                        alt="Logo"
                                        className="w-20 h-20 mix-blend-multiply dark:mix-blend-screen"
                                    />
                                </div>
                            </div>

                            {/* Title */}
                            <div className="text-center space-y-2">
                                <h1 className="text-[32px] font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 leading-tight">
                                    Welcome
                                </h1>
                                <p className="text-[15px] text-zinc-500 dark:text-zinc-400 font-normal leading-relaxed">
                                    {HERO.SUBTITLE.BEFORE}<span className="text-rose-500 dark:text-rose-400 font-medium">{HERO.SUBTITLE.HIGHLIGHT}</span>{HERO.SUBTITLE.AFTER}
                                </p>
                            </div>

                            {/* Sign In Button - Apple-style */}
                            <div className="space-y-3 pt-2">
                                <Button
                                    type="button"
                                    className="w-full h-12 text-[15px] font-medium bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border border-zinc-300/50 dark:border-zinc-700/50 hover:bg-zinc-50 dark:hover:bg-zinc-800/80 hover:border-zinc-400/50 dark:hover:border-zinc-600/50 hover:shadow-lg hover:shadow-zinc-900/5 active:scale-[0.98] shadow-sm transition-all duration-200 rounded-[14px]"
                                    onClick={() => {
                                        setBusy(true);
                                        setStatus('');
                                        startGoogleOauth();
                                    }}
                                    disabled={busy}
                                >
                                    <svg className="mr-2.5 h-5 w-5" viewBox="0 0 24 24">
                                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                    </svg>
                                    Continue with Google
                                </Button>
                            </div>

                            {/* Status Message */}
                            {status && (
                                <div
                                    className={
                                        statusTone === 'danger'
                                            ? 'text-[13px] text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 p-3 rounded-xl font-medium'
                                            : 'text-[13px] text-zinc-500 dark:text-zinc-400'
                                    }
                                    role="status"
                                >
                                    {status}
                                </div>
                            )}

                            {/* Privacy Note */}
                            <div className="bg-zinc-50/80 dark:bg-zinc-800/30 rounded-[18px] p-4 border border-zinc-200/50 dark:border-zinc-700/30 flex items-start gap-3 text-left">
                                <ShieldCheck className="w-[18px] h-[18px] text-zinc-400 dark:text-zinc-500 shrink-0 mt-0.5" />
                                <p className="text-[13px] text-zinc-600 dark:text-zinc-400 leading-relaxed font-normal">
                                    {HERO.PRIVACY_NOTE}
                                </p>
                            </div>

                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
}
