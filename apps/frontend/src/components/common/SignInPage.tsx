import * as React from 'react';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { Button } from './ui/button';
import { getApiBase } from '../../lib/api';
import { BRAND, HERO } from '../../lib/siteConfig';
import { ShieldCheck } from 'lucide-react';
import { BrandTitle } from './BrandTitle';

type StatusTone = 'muted' | 'danger';

interface SignInPageProps {
    returnTo?: string;
}

export function SignInPage({ returnTo = '/app#/today' }: SignInPageProps) {
    const [status, setStatus] = React.useState<string>('');
    const [statusTone, setStatusTone] = React.useState<StatusTone>('muted');
    const [busy, setBusy] = React.useState(false);

    const apiBase = React.useMemo(() => getApiBase(), []);

    const [mode, setMode] = React.useState<'signin' | 'signup'>('signin');
    const [email, setEmail] = React.useState('');
    const [password, setPassword] = React.useState('');
    const [providers, setProviders] = React.useState<{ password: boolean; google: boolean; oidc: boolean }>({
        password: true,
        google: false,
        oidc: false,
    });

    React.useEffect(() => {
        let cancelled = false;
        fetch(`${apiBase}/api/auth/providers`, { credentials: 'include' })
            .then((r) => (r.ok ? r.json() : null))
            .then((d) => { if (!cancelled && d) setProviders(d); })
            .catch(() => {});
        return () => { cancelled = true; };
    }, [apiBase]);

    async function handleEmailSubmit(e: React.FormEvent) {
        e.preventDefault();
        setBusy(true);
        setStatus('');
        try {
            const endpoint = mode === 'signin' ? '/api/auth/login' : '/api/auth/register';
            const res = await fetch(`${apiBase}${endpoint}`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });
            if (res.ok) {
                location.href = returnTo;
                return;
            }
            const data = await res.json().catch(() => ({} as any));
            setStatusTone('danger');
            setStatus(data?.message || 'Something went wrong. Please try again.');
        } catch {
            setStatusTone('danger');
            setStatus('Network error. Please try again.');
        } finally {
            setBusy(false);
        }
    }

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

    const containerVariants: Variants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1,
                delayChildren: 0.2
            }
        }
    };

    const itemVariants: Variants = {
        hidden: { opacity: 0, y: 20 },
        visible: {
            opacity: 1,
            y: 0,
            transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] }
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex flex-col bg-slate-50 dark:bg-zinc-950 overflow-hidden">
            {/* Animated Background Elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-rose-200/20 dark:bg-rose-900/10 blur-[120px] rounded-full animate-pulse" />
                <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] bg-blue-200/20 dark:bg-blue-900/10 blur-[120px] rounded-full animate-pulse" style={{ animationDelay: '1s' }} />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,_rgba(255,255,255,0),_rgba(255,255,255,1))] dark:bg-[radial-gradient(circle_at_50%_50%,_rgba(9,9,11,0),_rgba(9,9,11,1))]" />
            </div>

            {/* Header - Brand title matching onboarding */}
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
                className="relative flex-shrink-0 pt-8 pb-4 flex items-center justify-center z-50"
            >
                <BrandTitle />
            </motion.div>

            {/* Main Content - Centered */}
            <div className="relative flex-1 flex flex-col items-center justify-center px-6 z-10">
                <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    className="w-full max-w-[440px] space-y-12"
                >
                    {/* Hero Section */}
                    <div className="text-center space-y-6">
                        <motion.div variants={itemVariants} className="flex justify-center">
                            <div className="relative group">
                                <div className="absolute inset-0 bg-rose-500/10 dark:bg-rose-500/20 blur-2xl rounded-full scale-0 group-hover:scale-110 transition-transform duration-700" />
                                <img
                                    src="/logo.png"
                                    alt="Logo"
                                    className="relative w-24 h-24 mix-blend-multiply dark:mix-blend-screen transition-transform duration-700 ease-out hover:scale-105"
                                />
                            </div>
                        </motion.div>

                        <div className="space-y-3">
                            <motion.h1
                                variants={itemVariants}
                                className="text-[40px] font-bold tracking-tight text-zinc-900 dark:text-zinc-50 leading-[1.1] font-brand"
                            >
                                Welcome
                            </motion.h1>
                            <motion.p
                                variants={itemVariants}
                                className="text-[17px] text-zinc-500 dark:text-zinc-400 font-normal leading-relaxed max-w-[320px] mx-auto"
                            >
                                {HERO.SUBTITLE.BEFORE}<span className="text-rose-500 dark:text-rose-400 font-medium">{HERO.SUBTITLE.HIGHLIGHT}</span>{HERO.SUBTITLE.AFTER}
                            </motion.p>
                        </div>
                    </div>

                    {/* Action Area */}
                    <motion.div variants={itemVariants} className="space-y-6">
                        <form onSubmit={handleEmailSubmit} className="space-y-3">
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="Email"
                                autoComplete="email"
                                required
                                className="w-full h-[56px] px-5 rounded-[20px] bg-white/60 dark:bg-zinc-900/50 border border-zinc-200/70 dark:border-zinc-800/70 text-[16px] text-zinc-900 dark:text-zinc-50 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 outline-none focus:border-zinc-400 dark:focus:border-zinc-600 transition-colors"
                            />
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Password"
                                autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                                required
                                minLength={8}
                                className="w-full h-[56px] px-5 rounded-[20px] bg-white/60 dark:bg-zinc-900/50 border border-zinc-200/70 dark:border-zinc-800/70 text-[16px] text-zinc-900 dark:text-zinc-50 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 outline-none focus:border-zinc-400 dark:focus:border-zinc-600 transition-colors"
                            />
                            <Button
                                type="submit"
                                disabled={busy}
                                className="w-full h-[56px] text-[16px] font-semibold bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors duration-300 rounded-[20px]"
                            >
                                {mode === 'signin' ? 'Sign in' : 'Create account'}
                            </Button>
                        </form>

                        <button
                            type="button"
                            onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setStatus(''); }}
                            className="w-full text-[14px] text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
                        >
                            {mode === 'signin' ? "Don't have an account? Create one" : 'Already have an account? Sign in'}
                        </button>

                        {providers.google && (
                            <>
                                <div className="flex items-center gap-3">
                                    <div className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
                                    <span className="text-[12px] text-zinc-400 dark:text-zinc-500">or</span>
                                    <div className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
                                </div>
                                <Button
                                    type="button"
                                    className="w-full h-[56px] text-[16px] font-semibold bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors duration-300 rounded-[20px] flex items-center justify-center gap-3"
                                    onClick={() => { setBusy(true); setStatus(''); startGoogleOauth(); }}
                                    disabled={busy}
                                >
                                    <svg className="h-5 w-5" viewBox="0 0 24 24">
                                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                    </svg>
                                    Continue with Google
                                </Button>
                            </>
                        )}

                        {/* Status Message */}
                        <AnimatePresence>
                            {status && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className={
                                        statusTone === 'danger'
                                            ? 'text-[14px] text-rose-600 dark:text-rose-400 bg-rose-50/50 dark:bg-rose-950/20 px-4 py-3 rounded-2xl font-medium text-center border border-rose-100 dark:border-rose-900/30'
                                            : 'text-[14px] text-zinc-500 dark:text-zinc-400 text-center'
                                    }
                                    role="status"
                                >
                                    {status}
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Privacy Note */}
                        <motion.div
                            variants={itemVariants}
                            className="flex flex-col items-center gap-4 px-4 pt-4"
                        >
                            <div className="flex items-center gap-2 text-zinc-400 dark:text-zinc-500">
                                <ShieldCheck className="w-4 h-4" />
                                <span className="text-[13px] font-medium tracking-wide">Privacy First</span>
                            </div>
                            <p className="text-[14px] text-zinc-500 dark:text-zinc-400 text-center leading-relaxed">
                                {HERO.PRIVACY_NOTE}
                            </p>
                        </motion.div>
                    </motion.div>
                </motion.div>
            </div>

            {/* Footer shadow */}
            <div className="h-12 flex-shrink-0" />
        </div>
    );
}
