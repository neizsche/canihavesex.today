import * as React from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { CheckCircle } from 'lucide-react';
import { checkAuth } from '../lib/api';
import { AuthModal } from './AuthModal';

export function LandingPage() {
  const [authModalOpen, setAuthModalOpen] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;

    async function check() {
      try {
        const isAuthenticated = await checkAuth();
        if (!cancelled && isAuthenticated) {
          // Redirect authenticated users to the SPA shell
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
  return (
    <div className="min-h-screen bg-background">

      {/* Hero */}
      <section className="relative px-6 py-32 md:py-40 lg:py-48 overflow-hidden">
        {/* Subtle background pattern */}
        <div className="absolute inset-0 opacity-[0.03]">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Ccircle cx='30' cy='30' r='1.5'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}></div>
        </div>

        <div className="relative mx-auto max-w-5xl text-center">
          <div className="mb-12">
            <h1 className="text-6xl md:text-8xl font-bold tracking-tight text-foreground leading-[1.05] mb-8">
              We don't guess.
              <br />
              <span className="bg-gradient-to-r from-primary via-primary to-primary/80 bg-clip-text text-transparent">
                We read your body.
              </span>
            </h1>

            <div className="inline-flex items-center px-6 py-3 rounded-full bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 text-primary text-base font-medium mb-10 shadow-sm">
              Professional Fertility Awareness Platform
            </div>
          </div>

          <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed mb-16 font-medium">
            Scientifically-backed fertility tracking that empowers women with accurate, personalized insights. Join thousands of women who trust our evidence-based approach to reproductive health.
          </p>

          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center mb-20">
            <Button
              size="lg"
              className="px-10 py-5 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] bg-primary hover:bg-primary/90"
              onClick={() => setAuthModalOpen(true)}
            >
              Access Your Fertility Insights
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="px-10 py-5 text-lg border-2 hover:bg-primary/5 transition-all duration-300"
              onClick={() => setAuthModalOpen(true)}
            >
              View Clinical Methodology
            </Button>
          </div>

          {/* Professional trust indicators */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-3xl mx-auto">
            <div className="flex flex-col items-center gap-3 p-6 rounded-xl bg-card/50 border border-border/50 backdrop-blur-sm">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center">
                <span className="text-2xl">🔒</span>
              </div>
              <div className="text-center">
                <div className="font-semibold text-foreground mb-1">Bank-Level Security</div>
                <div className="text-sm text-muted-foreground">Your data is fully encrypted and secure</div>
              </div>
            </div>

            <div className="flex flex-col items-center gap-3 p-6 rounded-xl bg-card/50 border border-border/50 backdrop-blur-sm">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
                <span className="text-2xl">🧬</span>
              </div>
              <div className="text-center">
                <div className="font-semibold text-foreground mb-1">Evidence-Based</div>
                <div className="text-sm text-muted-foreground">Developed with medical professionals</div>
              </div>
            </div>

            <div className="flex flex-col items-center gap-3 p-6 rounded-xl bg-card/50 border border-border/50 backdrop-blur-sm">
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center">
                <span className="text-2xl">👥</span>
              </div>
              <div className="text-center">
                <div className="font-semibold text-foreground mb-1">15,000+ Women</div>
                <div className="text-sm text-muted-foreground">Trust our platform worldwide</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* The Challenge */}
      <section className="py-24 md:py-32 bg-gradient-to-b from-background to-muted/20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div className="space-y-8">
              <div>
                <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">
                  Most fertility apps are making promises they can't keep
                </h2>
                <p className="text-xl text-muted-foreground leading-relaxed">
                  Traditional period trackers predict your future based on past patterns. But every woman's cycle is unique, and external factors constantly change the equation.
                </p>
              </div>

              <div className="space-y-6">
                <div className="flex items-start gap-4 p-4 rounded-lg bg-card border border-border/50">
                  <div className="w-8 h-8 bg-destructive/10 dark:bg-destructive/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="text-sm font-bold text-destructive">❌</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-1">Predictive calendars</h3>
                    <p className="text-muted-foreground text-sm">Assume regularity that doesn't exist in real life</p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 rounded-lg bg-card border border-border/50">
                  <div className="w-8 h-8 bg-muted rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="text-sm font-bold text-muted-foreground">⚠️</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-1">False precision</h3>
                    <p className="text-muted-foreground text-sm">Give confidence numbers that aren't scientifically valid</p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 rounded-lg bg-card border border-border/50">
                  <div className="w-8 h-8 bg-primary/10 dark:bg-primary/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="text-sm font-bold text-primary">🎯</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-1">Our approach</h3>
                    <p className="text-muted-foreground text-sm">Focus on what your body is telling you right now</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="aspect-square bg-gradient-to-br from-primary/10 via-primary/5 to-transparent rounded-3xl p-8 flex items-center justify-center border border-primary/10">
                <div className="text-center space-y-6">
                  <div className="w-24 h-24 bg-gradient-to-br from-primary/20 to-primary/10 rounded-2xl flex items-center justify-center mx-auto shadow-lg">
                    <span className="text-5xl">🔬</span>
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold mb-2">Science-Backed Method</h3>
                    <p className="text-muted-foreground">
                      Based on established fertility awareness principles, not unproven algorithms
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Core Features */}
      <section className="px-6 py-24 md:py-32 bg-muted/30">
        <div className="mx-auto max-w-7xl">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-6xl font-bold tracking-tight mb-8">
              Everything you need to understand your fertility
            </h2>
            <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              Professional-grade fertility tracking designed for modern women who want evidence-based insights.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mb-16">
            <div className="group relative bg-card rounded-2xl p-8 border border-border/50 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500/10 to-blue-600/10 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                  <span className="text-3xl">⚡</span>
                </div>
                <h3 className="text-2xl font-bold mb-4 text-center">Rapid Data Entry</h3>
                <p className="text-muted-foreground leading-relaxed text-center">
                  Log your fertility signs in under 30 seconds with our streamlined, professional interface designed for busy women.
                </p>
              </div>
            </div>

            <div className="group relative bg-card rounded-2xl p-8 border border-border/50 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative">
                <div className="w-16 h-16 bg-gradient-to-br from-green-500/10 to-green-600/10 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                  <span className="text-3xl">📊</span>
                </div>
                <h3 className="text-2xl font-bold mb-4 text-center">Real-Time Insights</h3>
                <p className="text-muted-foreground leading-relaxed text-center">
                  Get immediate, evidence-based analysis of your current fertility status with clear, actionable information.
                </p>
              </div>
            </div>

            <div className="group relative bg-card rounded-2xl p-8 border border-border/50 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-500/10 to-purple-600/10 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                  <span className="text-3xl">📈</span>
                </div>
                <h3 className="text-2xl font-bold mb-4 text-center">Cycle Analytics</h3>
                <p className="text-muted-foreground leading-relaxed text-center">
                  Track patterns over time with professional-grade analytics and historical data visualization.
                </p>
              </div>
            </div>
          </div>

          <div className="text-center">
            <div className="inline-flex items-center gap-4 px-8 py-4 rounded-2xl bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20">
              <span className="text-primary font-semibold">🚀 Pro Features Include:</span>
              <span className="text-muted-foreground">Advanced analytics • Partner sharing • Data export • Priority support</span>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="px-6 py-24 md:py-32 bg-muted/20">
        <div className="mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-6">
              Your body already shows the signals
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              We simply help you track and interpret these signals, using well-known fertility awareness rules.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center space-y-6 p-8 rounded-xl border bg-card">
              <div className="w-16 h-16 bg-muted/50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">💧</span>
              </div>
              <h3 className="text-xl font-semibold">Cervical mucus</h3>
              <p className="text-muted-foreground leading-relaxed">
                Shows when fertility is opening — changes in consistency and quantity.
              </p>
            </div>

            <div className="text-center space-y-6 p-8 rounded-xl border bg-card">
              <div className="w-16 h-16 bg-muted/50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">🎯</span>
              </div>
              <h3 className="text-xl font-semibold">Peak day</h3>
              <p className="text-muted-foreground leading-relaxed">
                Marks the turning point — the most fertile mucus in your cycle.
              </p>
            </div>

            <div className="text-center space-y-6 p-8 rounded-xl border bg-card">
              <div className="w-16 h-16 bg-muted/50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">🌡️</span>
              </div>
              <h3 className="text-xl font-semibold">Basal temperature</h3>
              <p className="text-muted-foreground leading-relaxed">
                Confirms when the fertile window has closed — a sustained rise after ovulation.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="px-6 py-24 md:py-32">
        <div className="mx-auto max-w-6xl">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-6xl font-bold tracking-tight mb-8">
              Transparent pricing for every woman
            </h2>
            <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              Start free and upgrade only when you need advanced features. No hidden fees, no surprises.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-primary/5 rounded-3xl blur-xl group-hover:blur-2xl transition-all"></div>
              <div className="relative bg-card rounded-3xl p-8 border-2 border-primary/20 shadow-xl">
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <div className="bg-primary text-primary-foreground px-6 py-3 rounded-full text-sm font-bold shadow-lg">
                    Free Forever
                  </div>
                </div>

                <div className="text-center space-y-8 pt-6">
                  <div>
                    <div className="text-6xl font-bold text-foreground mb-2">$0</div>
                    <div className="text-lg text-muted-foreground font-medium">Perfect for getting started</div>
                  </div>

                  <ul className="space-y-4 text-left">
                    <li className="flex items-start gap-4">
                      <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-primary text-sm">✓</span>
                      </div>
                      <span className="text-foreground">Today's fertility assessment</span>
                    </li>
                    <li className="flex items-start gap-4">
                      <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-primary text-sm">✓</span>
                      </div>
                      <span className="text-foreground">Daily observation logging</span>
                    </li>
                    <li className="flex items-start gap-4">
                      <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-primary text-sm">✓</span>
                      </div>
                      <span className="text-foreground">Current cycle tracking</span>
                    </li>
                    <li className="flex items-start gap-4">
                      <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-primary text-sm">✓</span>
                      </div>
                      <span className="text-foreground">Basic data visualization</span>
                    </li>
                  </ul>

                  <Button
                    size="lg"
                    className="w-full text-lg py-4"
                    onClick={() => setAuthModalOpen(true)}
                  >
                    Begin Free Assessment
                  </Button>
                </div>
              </div>
            </div>

            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-3xl blur-xl group-hover:blur-2xl transition-all"></div>
              <div className="relative bg-gradient-to-br from-card to-card/95 rounded-3xl p-8 border-2 border-primary shadow-2xl">
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <div className="bg-gradient-to-r from-primary to-purple-600 text-white px-6 py-3 rounded-full text-sm font-bold shadow-lg">
                    Most Popular
                  </div>
                </div>

                <div className="text-center space-y-8 pt-6">
                  <div>
                    <div className="text-6xl font-bold text-foreground mb-2">
                      $5<span className="text-2xl font-normal text-muted-foreground">/mo</span>
                    </div>
                    <div className="text-lg text-muted-foreground font-medium">Advanced fertility insights</div>
                  </div>

                  <ul className="space-y-4 text-left">
                    <li className="flex items-start gap-4">
                      <div className="w-6 h-6 bg-primary/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-primary text-sm font-bold">✓</span>
                      </div>
                      <span className="text-foreground font-medium">Everything in Free plan</span>
                    </li>
                    <li className="flex items-start gap-4">
                      <div className="w-6 h-6 bg-primary/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-primary text-sm font-bold">✓</span>
                      </div>
                      <span className="text-foreground">Advanced temperature analysis</span>
                    </li>
                    <li className="flex items-start gap-4">
                      <div className="w-6 h-6 bg-primary/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-primary text-sm font-bold">✓</span>
                      </div>
                      <span className="text-foreground">Historical cycle data</span>
                    </li>
                    <li className="flex items-start gap-4">
                      <div className="w-6 h-6 bg-primary/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-primary text-sm font-bold">✓</span>
                      </div>
                      <span className="text-foreground">Partner data sharing</span>
                    </li>
                    <li className="flex items-start gap-4">
                      <div className="w-6 h-6 bg-primary/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-primary text-sm font-bold">✓</span>
                      </div>
                      <span className="text-foreground">Data export & backup</span>
                    </li>
                  </ul>

                  <Button
                    size="lg"
                    variant="outline"
                    className="w-full text-lg py-4 border-2 hover:bg-primary hover:text-primary-foreground transition-all"
                    onClick={() => setAuthModalOpen(true)}
                  >
                    Start Professional Trial
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Privacy & Trust */}
      <section className="px-6 py-24 md:py-32">
        <div className="mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-6">
              Your privacy comes first.
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Your fertility journey deserves respect and complete privacy.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="p-8 rounded-xl border bg-card">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                  <span className="text-2xl">🔒</span>
                </div>
                <h3 className="text-xl font-semibold">Privacy promise</h3>
              </div>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                  <span>No ads or tracking</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                  <span>Your data is never sold</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                  <span>Delete everything anytime</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                  <span>Bank-level security</span>
                </li>
              </ul>
            </div>

            <div className="p-8 rounded-xl border bg-card">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 bg-secondary/50 rounded-xl flex items-center justify-center">
                  <span className="text-2xl">⚠️</span>
                </div>
                <h3 className="text-xl font-semibold">Important disclaimer</h3>
              </div>
              <div className="space-y-4 text-muted-foreground">
                <p>
                  This app provides fertility awareness information based on established methods.
                  For medical decisions or contraception, consult healthcare professionals.
                </p>
                <p>
                  We focus on current observations rather than predictions, with conservative guidelines when certainty is limited.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>


      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        returnTo="/app#/today"
      />
    </div>
  );
}