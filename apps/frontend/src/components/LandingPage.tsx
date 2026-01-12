import * as React from 'react';
import { Button } from './ui/button';
import { checkAuth } from '../lib/api';
import { AuthModal } from './AuthModal';
import { Shield, Feather, CheckCircle } from 'lucide-react';

export function LandingPage() {
  React.useEffect(() => {
    let cancelled = false;

    async function check() {
      try {
        const isAuthenticated = await checkAuth();
        if (!cancelled && isAuthenticated) {
          window.location.href = '/app#/today';
        }
      } catch {
        // Ignore - stay on landing page
      }
    }

    void check();

    return () => {
      cancelled = true;
    };
  }, []);

  const openAuth = () => {
    window.dispatchEvent(new CustomEvent('auth:open'));
  };

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans selection:bg-stone-200">

      {/* Hero */}
      <section className="px-6 pt-32 pb-24 md:pt-48 md:pb-32 text-center max-w-2xl mx-auto">
        <h1 className="text-5xl md:text-7xl font-semibold tracking-tight text-gray-900 mb-6">
          Clarity for your intimate decisions.
        </h1>
        <p className="text-xl md:text-2xl text-gray-600 mb-8 font-medium">
          A simple fertility awareness app.
        </p>
        <p className="text-lg md:text-xl text-gray-500 mb-12 font-normal leading-relaxed">
          Log your cycle. See today’s status. That’s it.
        </p>

        <div className="flex justify-center">
          <Button
            size="lg"
            className="h-12 px-8 text-base font-medium rounded-full bg-stone-900 text-white hover:bg-stone-800 transition-all shadow-sm hover:shadow-md"
            onClick={openAuth}
          >
            Start tracking
          </Button>
        </div>
      </section>

      {/* Why Today */}
      <section className="px-6 py-16 bg-stone-50/50">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-8 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="p-3 bg-white rounded-2xl shadow-sm border border-stone-100 text-stone-700">
              <Shield size={24} strokeWidth={1.5} />
            </div>
            <h3 className="text-lg font-medium text-gray-900">Private by design</h3>
            <p className="text-stone-500 leading-relaxed">Your data stays yours. No ads. No selling. No funny business.</p>
          </div>
          <div className="flex flex-col items-center gap-4">
            <div className="p-3 bg-white rounded-2xl shadow-sm border border-stone-100 text-stone-700">
              <Feather size={24} strokeWidth={1.5} />
            </div>
            <h3 className="text-lg font-medium text-gray-900">Simple and reliable</h3>
            <p className="text-stone-500 leading-relaxed">Based on the symptothermal method, a well-known and studied approach.</p>
          </div>
          <div className="flex flex-col items-center gap-4">
            <div className="p-3 bg-white rounded-2xl shadow-sm border border-stone-100 text-stone-700">
              <CheckCircle size={24} strokeWidth={1.5} />
            </div>
            <h3 className="text-lg font-medium text-gray-900">Built with care</h3>
            <p className="text-stone-500 leading-relaxed">A cheeky name, serious thinking. Made by a small, independent team.</p>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="px-6 py-24 max-w-3xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-semibold text-center mb-16 text-gray-900">
          How it works
        </h2>
        <div className="space-y-12">

          <div className="flex gap-6 items-start md:items-center">
            <span className="flex-none flex items-center justify-center w-10 h-10 rounded-full bg-stone-100 text-stone-600 font-semibold text-lg">1</span>
            <div>
              <h3 className="text-xl font-medium text-gray-900 mb-2">Log signs</h3>
              <p className="text-gray-500 leading-relaxed">Track temperature and daily signs in a few taps.</p>
            </div>
          </div>

          <div className="flex gap-6 items-start md:items-center">
            <span className="flex-none flex items-center justify-center w-10 h-10 rounded-full bg-stone-100 text-stone-600 font-semibold text-lg">2</span>
            <div>
              <h3 className="text-xl font-medium text-gray-900 mb-2">See today’s status</h3>
              <div className="text-gray-500 leading-relaxed">
                Get a simple result:
                <ul className="mt-2 space-y-1 list-disc list-inside text-stone-600/80 pl-2">
                  <li>Fertile period</li>
                  <li>Not fertile period</li>
                  <li>Uncertain period</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="flex gap-6 items-start md:items-center">
            <span className="flex-none flex items-center justify-center w-10 h-10 rounded-full bg-stone-100 text-stone-600 font-semibold text-lg">3</span>
            <div>
              <h3 className="text-xl font-medium text-gray-900 mb-2">Decide</h3>
              <p className="text-gray-500 leading-relaxed">It’s your body. You stay in control.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer & Disclaimer */}
      <footer className="px-6 py-12 border-t border-stone-100 text-center bg-stone-50/30">
        <div className="max-w-md mx-auto space-y-6">
          <p className="text-sm text-stone-500 leading-relaxed">
            This is not medical advice. It’s a simple tool to help you think more clearly.
          </p>
        </div>
      </footer>
    </div>
  );
}