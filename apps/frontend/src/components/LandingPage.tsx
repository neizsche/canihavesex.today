import * as React from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { HERO } from '../lib/siteConfig';
import { Shield, Feather, CheckCircle, Check } from 'lucide-react';


export function LandingPage() {
  const openAuth = () => {
    window.dispatchEvent(new CustomEvent('auth:open'));
  };

  const [email, setEmail] = React.useState('');
  const [status, setStatus] = React.useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setStatus('loading');
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, reason: 'premium_features' }),
      });
      if (res.ok) {
        setStatus('success');
        setEmail('');
      } else {
        setStatus('error');
      }
    } catch (e) {
      console.error(e);
      setStatus('error');
    }
  };

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans selection:bg-stone-200">

      {/* Hero */}
      <section className="px-6 pt-32 pb-24 md:pt-48 md:pb-32 text-center max-w-4xl mx-auto">
        <h1 className="text-5xl md:text-8xl font-semibold tracking-tighter text-slate-900 mb-8 leading-[1.05]">
          {HERO.TITLE}
        </h1>
        <p className="text-xl md:text-3xl text-slate-500/90 mb-10 font-medium tracking-tight max-w-3xl mx-auto leading-normal">
          <span className="line-through decoration-4 decoration-red-600 mr-6 font-cursive tracking-normal text-red-500 inline-block -rotate-3 origin-center text-3xl md:text-4xl">Cycle tracker</span>
          <span className="font-brand tracking-tight text-4xl md:text-5xl text-rose-500">fertility awareness app.</span>
        </p>
        <p className="text-lg md:text-xl text-stone-500 mb-8 font-normal leading-relaxed max-w-2xl mx-auto">
          {HERO.DESCRIPTION}
        </p>


        <p className="text-sm text-slate-400 mb-12">
          {HERO.METHOD_NOTE}
        </p>

        <div className="flex flex-col items-center gap-8">
          <Button
            size="lg"
            className="h-14 px-10 text-lg font-medium rounded-full bg-slate-900 text-white hover:bg-slate-800 hover:scale-105 active:scale-95 transition-all duration-300 shadow-xl shadow-slate-900/10"
            onClick={openAuth}
          >
            Start tracking
          </Button>

          <div className="flex flex-wrap justify-center items-center gap-x-5 gap-y-3 text-xs md:text-sm font-medium text-stone-400">
            <span className="flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 md:w-4 md:h-4 text-rose-500" strokeWidth={3} />
              Free by default.
            </span>
            <div className="hidden md:block w-1 h-1 rounded-full bg-stone-200" />
            <span className="flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 md:w-4 md:h-4 text-rose-500" strokeWidth={3} />
              No ads.
            </span>
            <div className="hidden md:block w-1 h-1 rounded-full bg-stone-200" />
            <span className="flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 md:w-4 md:h-4 text-rose-500" strokeWidth={3} />
              No tracking.
            </span>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="px-6 py-32 md:py-40 bg-slate-50 border-t border-slate-100">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-semibold text-center mb-20 text-slate-900 tracking-tight">
            Keep it simple.
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="group p-8 md:p-10 bg-white rounded-[2rem] shadow-[0_2px_40px_-12px_rgba(0,0,0,0.06)] border border-slate-100/50 hover:shadow-[0_8px_60px_-12px_rgba(0,0,0,0.1)] transition-all duration-500 flex flex-col items-center text-center gap-6">
              <span className="flex items-center justify-center w-14 h-14 rounded-2xl bg-slate-50 text-slate-900 font-bold text-xl mb-2 group-hover:scale-110 transition-transform duration-500">1</span>
              <div>
                <h3 className="text-xl font-semibold text-slate-900 mb-3">Log signs</h3>
                <p className="text-slate-500 text-base leading-relaxed">Track temperature and daily signs in a few taps.</p>
              </div>
            </div>

            <div className="group p-8 md:p-10 bg-white rounded-[2rem] shadow-[0_2px_40px_-12px_rgba(0,0,0,0.06)] border border-slate-100/50 hover:shadow-[0_8px_60px_-12px_rgba(0,0,0,0.1)] transition-all duration-500 flex flex-col items-center text-center gap-6">
              <span className="flex items-center justify-center w-14 h-14 rounded-2xl bg-slate-50 text-slate-900 font-bold text-xl mb-2 group-hover:scale-110 transition-transform duration-500">2</span>
              <div>
                <h3 className="text-xl font-semibold text-slate-900 mb-3">See status</h3>
                <p className="text-slate-500 text-base leading-relaxed">Get a clear fertile or non-fertile result immediately.</p>
              </div>
            </div>

            <div className="group p-8 md:p-10 bg-white rounded-[2rem] shadow-[0_2px_40px_-12px_rgba(0,0,0,0.06)] border border-slate-100/50 hover:shadow-[0_8px_60px_-12px_rgba(0,0,0,0.1)] transition-all duration-500 flex flex-col items-center text-center gap-6">
              <span className="flex items-center justify-center w-14 h-14 rounded-2xl bg-slate-50 text-slate-900 font-bold text-xl mb-2 group-hover:scale-110 transition-transform duration-500">3</span>
              <div>
                <h3 className="text-xl font-semibold text-slate-900 mb-3">Decide</h3>
                <p className="text-slate-500 text-base leading-relaxed">It’s your body. You stay in control of your choices.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Mission Section */}
      <section id="mission" className="px-6 py-32 md:py-40 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-24 max-w-3xl mx-auto">
            <h2 className="text-3xl md:text-5xl font-semibold text-slate-900 mb-6 tracking-tight">Built with care.</h2>
            <p className="text-xl md:text-2xl text-slate-500 font-normal">
              Focused on privacy, clarity, and reliability.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
            <div className="p-8 md:p-12 bg-slate-50 rounded-[2.5rem] flex flex-col items-center text-center gap-6 hover:bg-slate-100/80 transition-colors duration-500">
              <div className="p-4 bg-white rounded-2xl shadow-sm text-slate-900 mb-2">
                <Shield size={28} strokeWidth={1.5} />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-slate-900 mb-3">Private by design</h3>
                <p className="text-slate-500 text-base leading-relaxed">No ads, no tracking. Your health data remains strictly yours.</p>
              </div>
            </div>
            <div className="p-8 md:p-12 bg-slate-50 rounded-[2.5rem] flex flex-col items-center text-center gap-6 hover:bg-slate-100/80 transition-colors duration-500">
              <div className="p-4 bg-white rounded-2xl shadow-sm text-slate-900 mb-2">
                <Feather size={28} strokeWidth={1.5} />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-slate-900 mb-3">Simple and reliable</h3>
                <p className="text-slate-500 text-base leading-relaxed">Based on the symptothermal method, a well-known and studied approach.</p>
              </div>
            </div>
            <div className="p-8 md:p-12 bg-slate-50 rounded-[2.5rem] flex flex-col items-center text-center gap-6 hover:bg-slate-100/80 transition-colors duration-500">
              <div className="p-4 bg-white rounded-2xl shadow-sm text-slate-900 mb-2">
                <CheckCircle size={28} strokeWidth={1.5} />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-slate-900 mb-3">Built with care</h3>
                <p className="text-slate-500 text-base leading-relaxed">A cheeky name, serious thinking. Made by a small, independent team.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features & Coming Soon */}
      <section id="features" className="px-6 py-32 md:py-40 bg-white border-t border-slate-100">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-3xl md:text-5xl font-semibold text-slate-900 mb-6 tracking-tight">
              Everything you need.
            </h2>
            <p className="text-xl text-slate-500 max-w-2xl mx-auto">
              Free, forever. Advanced features coming soon.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-12 md:gap-16 mb-20">
            {/* Current Features */}
            <div>
              <h3 className="text-lg font-semibold text-slate-400 uppercase tracking-wider mb-8">Available now</h3>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" strokeWidth={2.5} />
                  <span className="text-slate-700 leading-relaxed">Daily logging (temperature, mucus, signs)</span>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" strokeWidth={2.5} />
                  <span className="text-slate-700 leading-relaxed">Current cycle view with daily guidance</span>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" strokeWidth={2.5} />
                  <span className="text-slate-700 leading-relaxed">Conservative symptothermal logic</span>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" strokeWidth={2.5} />
                  <span className="text-slate-700 leading-relaxed">In-depth fertility insights</span>
                </div>
              </div>
            </div>

            {/* Coming Soon */}
            <div className="md:border-l md:border-slate-100 md:pl-12">
              <h3 className="text-lg font-semibold text-slate-400 uppercase tracking-wider mb-8">Coming soon</h3>
              <div className="space-y-4 mb-10">
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full border-2 border-slate-200 shrink-0 mt-0.5" />
                  <span className="text-slate-400 leading-relaxed">Cycle history & trends</span>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full border-2 border-slate-200 shrink-0 mt-0.5" />
                  <span className="text-slate-400 leading-relaxed">Partner-friendly summary view</span>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full border-2 border-slate-200 shrink-0 mt-0.5" />
                  <span className="text-slate-400 leading-relaxed">Try to conceive mode</span>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full border-2 border-slate-200 shrink-0 mt-0.5" />
                  <span className="text-slate-400 leading-relaxed">Export & summaries</span>
                </div>
              </div>

              {status === 'success' ? (
                <div className="p-4 bg-emerald-50 text-emerald-700 font-medium rounded-2xl text-center">
                  You're on the list.
                </div>
              ) : (
                <div>
                  <p className="text-sm text-slate-500 mb-4">Get notified when advanced features are ready.</p>
                  <form onSubmit={handleSubmit} className="flex gap-2">
                    <Input
                      type="email"
                      placeholder="Email address"
                      className="bg-slate-50 border-slate-200 focus-visible:ring-1 focus-visible:ring-slate-300 h-11 rounded-xl text-sm"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      disabled={status === 'loading'}
                    />
                    <Button
                      type="submit"
                      size="sm"
                      className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl px-5 h-11 shrink-0"
                      disabled={status === 'loading'}
                    >
                      Notify me
                    </Button>
                  </form>
                </div>
              )}
            </div>
          </div>

          <div className="text-center">
            <Button
              size="lg"
              className="h-14 px-10 text-lg font-medium rounded-full bg-slate-900 text-white hover:bg-slate-800 hover:scale-105 active:scale-95 transition-all duration-300 shadow-xl shadow-slate-900/10"
              onClick={openAuth}
            >
              Get started free
            </Button>
          </div>
        </div>
      </section>

    </div>
  );
}