import * as React from 'react';
import { AuthModal } from './AuthModal';
import { BRAND } from '../lib/siteConfig';

export function LandingHeader() {
    const [authOpen, setAuthOpen] = React.useState(false);

    React.useEffect(() => {
        // Auto-open modal if directed with openAuth=true
        const params = new URLSearchParams(window.location.search);
        if (params.get('openAuth') === 'true') {
            setAuthOpen(true);
        }

        const handleAuthOpen = () => setAuthOpen(true);
        window.addEventListener('auth:open', handleAuthOpen);
        return () => window.removeEventListener('auth:open', handleAuthOpen);
    }, []);

    return (
        <>
            <header className="sticky top-0 z-50 border-b border-gray-100 bg-white transition-all">
                <div className="mx-auto flex max-w-5xl items-center justify-between px-4 md:px-6 py-4 md:py-6">
                    <a href="/" className="flex items-center gap-2 md:gap-4 group">
                        <img
                            src="/logo.png"
                            alt="Logo"
                            className="w-12 md:w-16 group-hover:scale-105 transition-transform duration-200 mix-blend-multiply"
                        />
                        <span className="text-xl md:text-2xl tracking-tighter text-slate-950 group-hover:text-slate-800 transition-colors font-outfit">
                            {BRAND.PREFIX}<span className="text-red-600 font-extrabold font-outfit">{BRAND.HIGHLIGHT}</span>{BRAND.SUFFIX}
                        </span>
                    </a>
                    <button
                        onClick={() => setAuthOpen(true)}
                        className="inline-flex items-center gap-2 px-3 md:px-4 py-1.5 md:py-2 bg-slate-700 text-white text-xs md:text-sm font-semibold rounded hover:bg-slate-800 transition-colors shrink-0 shadow-sm"
                    >
                        Log in
                    </button>
                </div>
            </header>

            <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} />
        </>
    );
}
