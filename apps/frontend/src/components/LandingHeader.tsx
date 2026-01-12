import * as React from 'react';
import { AuthModal } from './AuthModal';

export function LandingHeader() {
    const [authOpen, setAuthOpen] = React.useState(false);

    React.useEffect(() => {
        const handleAuthOpen = () => setAuthOpen(true);
        window.addEventListener('auth:open', handleAuthOpen);
        return () => window.removeEventListener('auth:open', handleAuthOpen);
    }, []);

    return (
        <>
            <header className="sticky top-0 z-50 border-b border-gray-100 bg-white/80 backdrop-blur-md transition-all">
                <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
                    <a href="/" className="text-base font-medium tracking-wide text-gray-900 hover:text-gray-600 transition-colors">
                        can i have sex today
                    </a>
                    <button
                        onClick={() => setAuthOpen(true)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-slate-700 text-white text-sm font-normal rounded hover:bg-slate-800 transition-colors"
                    >
                        Log in
                    </button>
                </div>
            </header>

            <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} />
        </>
    );
}
