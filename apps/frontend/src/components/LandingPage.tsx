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
          // Redirect authenticated users to /today
          window.location.href = '/today';
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
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60 shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <a href="/" className="text-2xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
            canihavesex.today
          </a>
          <Button variant="ghost" onClick={() => setAuthModalOpen(true)}>
            Log in
          </Button>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden px-6 py-20 md:py-32">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5"></div>
        <div className="relative mx-auto max-w-5xl text-center">
          <h1 className="text-6xl md:text-8xl font-black tracking-tight bg-gradient-to-r from-foreground via-foreground to-foreground/80 bg-clip-text text-transparent leading-tight mb-6">
            We don't guess.<br />
            <span className="bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
              We read your body.
            </span>
          </h1>
          <div className="text-lg md:text-xl text-muted-foreground font-medium mb-10">
            Fertility Awareness App
          </div>
          <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed mb-12">
            A simple way to understand your fertility, based on real biological signs. No calendars. No predictions. Just a clear view of where you are today.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button size="lg" className="text-lg px-8 py-4 h-auto shadow-lg hover:shadow-xl transition-all duration-300" onClick={() => setAuthModalOpen(true)}>
              Open the app
            </Button>
            <Button variant="outline" size="lg" className="text-lg px-8 py-4 h-auto" onClick={() => setAuthModalOpen(true)}>
              See how it works
            </Button>
          </div>
        </div>
      </section>

      {/* Why This Exists */}
      <section className="px-6 py-20 md:py-32">
        <div className="mx-auto max-w-5xl">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-8">
              Because your body isn't a calendar
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              Most fertility apps try to tell you what will happen next week. Real bodies don't work that way.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-12 items-center">
            <Card className="p-8 shadow-xl border-0 bg-gradient-to-br from-card to-card/80">
              <CardContent className="p-0">
                <div className="text-center space-y-6">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-500/10 mb-4">
                    <span className="text-3xl">💭</span>
                  </div>
                  <h3 className="text-2xl font-bold mb-4">One simple question</h3>
                  <p className="text-lg text-muted-foreground leading-relaxed">
                    "What does your body tell us today?"
                  </p>
                  <p className="text-muted-foreground">
                    No forecasts. No guessing. Just today.
                  </p>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-2xl font-bold">A calmer approach</h3>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  Instead of promising certainty, we show you what the signs actually say.
                </p>
                <ul className="space-y-3 text-muted-foreground">
                  <li className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>If things are clear, you'll see it</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>If things are unclear, we'll tell you that too</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>It's a quieter approach — but a more trustworthy one</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* What You Can Do */}
      <section className="px-6 py-20 md:py-32 bg-muted/30">
        <div className="mx-auto max-w-7xl">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-8">
              Made for everyday use
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Simple tools that fit into your daily routine.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Card className="p-8 shadow-lg hover:shadow-xl transition-all duration-300 border-0 bg-gradient-to-br from-card to-card/80 group">
              <CardContent className="p-0 space-y-6">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-500/10 group-hover:bg-blue-500/20 transition-colors">
                  <span className="text-3xl">⚡</span>
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-3">Log signs in a few seconds</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Quick, focused logging that doesn't interrupt your day.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="p-8 shadow-lg hover:shadow-xl transition-all duration-300 border-0 bg-gradient-to-br from-card to-card/80 group">
              <CardContent className="p-0 space-y-6">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-green-500/10 group-hover:bg-green-500/20 transition-colors">
                  <span className="text-3xl">👀</span>
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-3">See today's status at a glance</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Clear, simple view of where you are in your cycle today.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="p-8 shadow-lg hover:shadow-xl transition-all duration-300 border-0 bg-gradient-to-br from-card to-card/80 group">
              <CardContent className="p-0 space-y-6">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-purple-500/10 group-hover:bg-purple-500/20 transition-colors">
                  <span className="text-3xl">📈</span>
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-3">Follow your current cycle</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Easy way to track your progress through this cycle.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="text-center mt-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-sm">
              <span className="text-primary font-medium">Pro features:</span>
              <span className="text-muted-foreground">Look back at past cycles • Share with partner • Export data</span>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="px-6 py-20 md:py-32">
        <div className="mx-auto max-w-7xl">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-8">
              Your body already shows the signals
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              We simply help you track and interpret these signals, using well-known fertility awareness rules.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Card className="p-8 shadow-lg border-0 bg-gradient-to-br from-card to-card/80">
              <CardContent className="p-0 space-y-4">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-500/10">
                  <span className="text-2xl">💧</span>
                </div>
                <h3 className="text-xl font-bold">Cervical mucus</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Shows when fertility is opening — changes in consistency and quantity.
                </p>
              </CardContent>
            </Card>

            <Card className="p-8 shadow-lg border-0 bg-gradient-to-br from-card to-card/80">
              <CardContent className="p-0 space-y-4">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-pink-500/10">
                  <span className="text-2xl">🎯</span>
                </div>
                <h3 className="text-xl font-bold">A "peak" day</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Marks the turning point — the most fertile mucus in your cycle.
                </p>
              </CardContent>
            </Card>

            <Card className="p-8 shadow-lg border-0 bg-gradient-to-br from-card to-card/80">
              <CardContent className="p-0 space-y-4">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-orange-500/10">
                  <span className="text-2xl">🌡️</span>
                </div>
                <h3 className="text-xl font-bold">Basal temperature</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Confirms when the fertile window has closed — a sustained rise after ovulation.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Free and Pro */}
      <section className="px-6 py-20 md:py-32 bg-muted/30">
        <div className="mx-auto max-w-5xl">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-8">
              Start free. Upgrade if you want more.
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Everything you need to get started is completely free.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <Card className="relative p-8 shadow-xl border-2 border-primary/20 bg-gradient-to-br from-card to-card/80">
              <div className="absolute -top-4 left-8 bg-primary text-primary-foreground px-4 py-2 rounded-full text-sm font-semibold">
                Free forever
              </div>
              <CardContent className="p-0 space-y-6">
                <div>
                  <h3 className="text-3xl font-bold">$0</h3>
                  <p className="text-muted-foreground">Great for daily use and current cycle tracking</p>
                </div>
                <ul className="space-y-4">
                  <li className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>Today's status</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>Sign logging</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>Current cycle view</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="p-8 shadow-xl border-0 bg-gradient-to-br from-primary/5 to-primary/10">
              <CardContent className="p-0 space-y-6">
                <div>
                  <h3 className="text-3xl font-bold">$5<span className="text-lg font-normal">/month</span></h3>
                  <p className="text-muted-foreground">For people who want deeper insight and history</p>
                </div>
                <ul className="space-y-4">
                  <li className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>Temperature interpretation</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>Cycle history</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>Partner access</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>Data export</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Privacy Comes First */}
      <section className="px-6 py-20 md:py-32">
        <div className="mx-auto max-w-4xl">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-8">
              This is personal. We treat it that way.
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Your fertility journey deserves respect and privacy.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <Card className="p-8 shadow-xl border-0 bg-gradient-to-br from-green-500/5 to-green-500/10">
              <CardContent className="p-0 space-y-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-green-500/10">
                    <span className="text-2xl">🔒</span>
                  </div>
                  <h3 className="text-2xl font-bold">Privacy promise</h3>
                </div>
                <ul className="space-y-4">
                  <li className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>No ads</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>No tracking</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>No selling your data</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>Delete everything anytime</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="p-8 shadow-xl border-0 bg-gradient-to-br from-blue-500/5 to-blue-500/10">
              <CardContent className="p-0 space-y-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-500/10">
                    <span className="text-2xl">🤝</span>
                  </div>
                  <h3 className="text-2xl font-bold">Still, a few important notes</h3>
                </div>
                <div className="space-y-4 text-muted-foreground">
                  <p className="leading-relaxed">
                    This is informational only — not birth control, not medical advice.
                    Use reliable protection if avoiding pregnancy.
                  </p>
                  <p className="leading-relaxed">
                    We focus on today because predicting tomorrow is impossible.
                    If things are unclear, we'll be honest about that.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        returnTo="/today"
      />
    </div>
  );
}