import * as React from 'react';
import { Button } from './ui/button';
import { HERO } from '../lib/siteConfig';
import { Shield, Feather, CheckCircle, Check, Minus } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';

const coreFeatures = [
  { name: 'Daily logging', free: true, pro: true },
  { name: 'Today’s risk & explanation', free: true, pro: true },
  { name: 'Current cycle view', free: true, pro: true },
  { name: 'Core conservative logic', free: true, pro: true },
];

const premiumFeatures = [
  { name: 'Cycle history', free: false, pro: true },
  { name: 'Partner view', free: false, pro: true },
  { name: 'Try to conceive mode', free: false, pro: true },
  { name: 'Export & summaries', free: false, pro: true },
  { name: 'Custom conservatism', free: false, pro: true },
];

export function LandingPage() {
  const openAuth = () => {
    window.dispatchEvent(new CustomEvent('auth:open'));
  };

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans selection:bg-stone-200">

      {/* Hero */}
      <section className="px-6 pt-32 pb-24 md:pt-48 md:pb-32 text-center max-w-4xl mx-auto">
        <h1 className="text-5xl md:text-8xl font-bold tracking-tight text-slate-950 mb-8 leading-[1.05] bg-clip-text text-transparent bg-gradient-to-b from-slate-950 to-slate-700">
          {HERO.TITLE}
        </h1>
        <p className="text-xl md:text-2xl text-slate-600 mb-8 font-medium tracking-tight">
          {HERO.SUBTITLE.BEFORE}<span className="text-red-600">{HERO.SUBTITLE.HIGHLIGHT}</span>{HERO.SUBTITLE.AFTER}
        </p>
        <p className="text-lg md:text-xl text-gray-500 mb-12 font-normal leading-relaxed">
          {HERO.DESCRIPTION}
        </p>

        <div className="flex flex-col items-center gap-8">
          <Button
            size="lg"
            className="h-12 px-8 text-base font-medium rounded-full bg-stone-900 text-white hover:bg-stone-800 transition-all shadow-sm hover:shadow-md"
            onClick={openAuth}
          >
            Start tracking
          </Button>

          <div className="flex flex-wrap justify-center items-center gap-x-5 gap-y-3 text-xs md:text-sm font-medium text-stone-400">
            <span className="flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 md:w-4 md:h-4 text-red-600" strokeWidth={3} />
              Free by default.
            </span>
            <div className="hidden md:block w-1 h-1 rounded-full bg-stone-200" />
            <span className="flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 md:w-4 md:h-4 text-red-600" strokeWidth={3} />
              No ads.
            </span>
            <div className="hidden md:block w-1 h-1 rounded-full bg-stone-200" />
            <span className="flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 md:w-4 md:h-4 text-red-600" strokeWidth={3} />
              No tracking.
            </span>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="px-6 py-24 md:py-32 bg-stone-50/40 border-y border-stone-100">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-semibold text-center mb-16 text-gray-900">
            Keep it simple
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 max-w-4xl mx-auto">
            <div className="flex flex-col items-center text-center gap-4">
              <span className="flex items-center justify-center w-10 h-10 rounded-full bg-white border border-stone-200 text-stone-600 font-semibold text-lg shadow-sm">1</span>
              <h3 className="text-lg font-medium text-gray-900">Log signs</h3>
              <p className="text-stone-500 text-sm leading-relaxed">Track temperature and daily signs in a few taps.</p>
            </div>

            <div className="flex flex-col items-center text-center gap-4">
              <span className="flex items-center justify-center w-10 h-10 rounded-full bg-white border border-stone-200 text-stone-600 font-semibold text-lg shadow-sm">2</span>
              <h3 className="text-lg font-medium text-gray-900">See status</h3>
              <p className="text-stone-500 text-sm leading-relaxed">Get a clear fertile or non-fertile result immediately.</p>
            </div>

            <div className="flex flex-col items-center text-center gap-4">
              <span className="flex items-center justify-center w-10 h-10 rounded-full bg-white border border-stone-200 text-stone-600 font-semibold text-lg shadow-sm">3</span>
              <h3 className="text-lg font-medium text-gray-900">Decide</h3>
              <p className="text-stone-500 text-sm leading-relaxed">It’s your body. You stay in control of your choices.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Mission Section */}
      <section id="mission" className="px-6 py-24 md:py-32 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-20 max-w-2xl mx-auto">
            <h2 className="text-3xl font-semibold text-gray-900 mb-4">Built with care.</h2>
            <p className="text-lg text-stone-500 italic">
              Focused on privacy, clarity, and reliability.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-8 bg-stone-50/50 rounded-3xl border border-stone-100 flex flex-col items-center text-center gap-6">
              <div className="p-3 bg-white rounded-2xl shadow-sm border border-stone-100 text-stone-700">
                <Shield size={24} strokeWidth={1.5} />
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Private by design</h3>
                <p className="text-stone-500 text-sm leading-relaxed">No ads, no tracking. Your health data remains strictly yours.</p>
              </div>
            </div>
            <div className="p-8 bg-stone-50/50 rounded-3xl border border-stone-100 flex flex-col items-center text-center gap-6">
              <div className="p-3 bg-white rounded-2xl shadow-sm border border-stone-100 text-stone-700">
                <Feather size={24} strokeWidth={1.5} />
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Simple and reliable</h3>
                <p className="text-stone-500 text-sm leading-relaxed">Based on the symptothermal method, a well-known and studied approach.</p>
              </div>
            </div>
            <div className="p-8 bg-stone-50/50 rounded-3xl border border-stone-100 flex flex-col items-center text-center gap-6">
              <div className="p-3 bg-white rounded-2xl shadow-sm border border-stone-100 text-stone-700">
                <CheckCircle size={24} strokeWidth={1.5} />
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Built with care</h3>
                <p className="text-stone-500 text-sm leading-relaxed">A cheeky name, serious thinking. Made by a small, independent team.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing / Comparison */}
      <section id="pricing" className="px-6 py-24 md:py-32 bg-stone-50/40 border-t border-stone-100">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-2xl md:text-3xl font-semibold text-gray-900 mb-4">
              Compare variants
            </h2>
            <p className="text-stone-500">
              Pick the version that fits your needs.
            </p>
          </div>

          <div className="bg-white rounded-3xl border border-stone-200 overflow-hidden shadow-sm max-w-3xl mx-auto">
            <Table>
              <TableHeader className="bg-stone-50/50">
                <TableRow className="hover:bg-transparent border-stone-100">
                  <TableHead className="py-4 md:py-6 pl-4 md:pl-8 text-[10px] md:text-sm font-medium uppercase tracking-wider text-stone-400 w-1/2">Features</TableHead>
                  <TableHead className="py-4 md:py-6 text-center text-gray-900 font-semibold text-sm md:text-base">Free</TableHead>
                  <TableHead className="py-4 md:py-6 text-center text-gray-900 font-semibold text-sm md:text-base italic">Pro</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {coreFeatures.map((f) => (
                  <TableRow key={f.name} className="border-stone-100">
                    <TableCell className="py-3 md:py-4 pl-4 md:pl-8 text-stone-600 font-medium text-xs md:text-base">{f.name}</TableCell>
                    <TableCell className="text-center px-2">
                      <Check className="h-4 w-4 md:h-5 md:w-5 text-red-600 mx-auto" strokeWidth={3} />
                    </TableCell>
                    <TableCell className="text-center px-2">
                      <Check className="h-4 w-4 md:h-5 md:w-5 text-red-600 mx-auto" strokeWidth={3} />
                    </TableCell>
                  </TableRow>
                ))}
                {premiumFeatures.map((f) => (
                  <TableRow key={f.name} className="border-stone-100">
                    <TableCell className="py-3 md:py-4 pl-4 md:pl-8 text-stone-600 font-medium text-xs md:text-base">{f.name}</TableCell>
                    <TableCell className="text-center px-2">
                      <Minus className="h-3 w-3 md:h-4 md:w-4 text-stone-200 mx-auto" />
                    </TableCell>
                    <TableCell className="text-center px-2">
                      <Check className="h-4 w-4 md:h-5 md:w-5 text-stone-400 mx-auto" strokeWidth={2} />
                    </TableCell>
                  </TableRow>
                ))}

                {/* CTA Row */}
                <TableRow className="hover:bg-transparent border-none">
                  <TableCell className="py-6 md:py-8 pl-4 md:pl-8"></TableCell>
                  <TableCell className="py-6 md:py-8 px-2 text-center">
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-full px-4 md:px-6 h-8 md:h-10 text-xs md:text-sm font-semibold border-red-600 text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors"
                      onClick={openAuth}
                    >
                      Start free
                    </Button>
                  </TableCell>
                  <TableCell className="py-6 md:py-8 px-2 text-center">
                    <span className="text-[10px] md:text-xs text-stone-400 font-semibold uppercase tracking-widest">Soon</span>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </div>
      </section>

    </div>
  );
}