import type { Db } from './db.js';

// Ordered runner: each migration has a unique, increasing `version`; on boot we
// apply only the versions missing from `schema_migrations`, in order, each in its
// own transaction.
type Migration = {
  version: number;
  name: string;
  up: (db: Db) => Promise<void>;
};

const migrations: Migration[] = [
  {
    version: 1,
    name: 'baseline',
    up: async (db) => {
      // Update timestamp trigger function
      await db.exec(`
        CREATE OR REPLACE FUNCTION update_updated_at_column()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.updated_at = NOW();
            RETURN NEW;
        END;
        $$ language 'plpgsql';
      `);

      // Core tables
      await db.exec(`
        CREATE TABLE IF NOT EXISTS users (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          email TEXT NOT NULL UNIQUE,
          password_hash TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          email_verified BOOLEAN NOT NULL DEFAULT true,
          last_login_at TIMESTAMPTZ,
          app_version TEXT
        );

        CREATE TABLE IF NOT EXISTS user_identities (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          provider TEXT NOT NULL,
          provider_user_id TEXT NOT NULL,
          email TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          UNIQUE(provider, provider_user_id)
        );

        CREATE TABLE IF NOT EXISTS user_settings (
          user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
          theme TEXT NOT NULL DEFAULT 'dark',
          cycle_regularity TEXT,
          show_branding BOOLEAN NOT NULL DEFAULT true,
          education_seen JSONB NOT NULL DEFAULT '{}',
          avg_cycle_length NUMERIC(5,2) NOT NULL DEFAULT 28.0,
          onboarding_completed_at TIMESTAMPTZ,
          reanchor_kind TEXT,
          reanchor_cycle_start DATE,
          tracking_paused BOOLEAN NOT NULL DEFAULT false,
          temperature_unit TEXT NOT NULL DEFAULT 'celsius',
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS logs (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          date DATE NOT NULL,
          bleeding TEXT CONSTRAINT chk_logs_bleeding
            CHECK (bleeding IS NULL OR bleeding IN ('none','spotting','light','medium','heavy')),
          temperature NUMERIC(5,2),
          mucus TEXT CONSTRAINT chk_logs_mucus
            CHECK (mucus IS NULL OR mucus IN ('dry','sticky','creamy','watery','eggwhite')),
          lh_test TEXT CONSTRAINT chk_logs_lh_test
            CHECK (lh_test IS NULL OR lh_test IN ('positive','negative')),
          disturbances JSONB NOT NULL DEFAULT '[]',
          symptoms JSONB NOT NULL DEFAULT '[]',
          notes TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          cycle_start BOOLEAN NOT NULL DEFAULT false,
          is_uncertain BOOLEAN NOT NULL DEFAULT false,
          UNIQUE(user_id, date)
        );

        CREATE TABLE IF NOT EXISTS cycles (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          start_date DATE NOT NULL,
          end_date DATE,
          ovulation_prediction DATE,
          ovulation_confirmed_date DATE,
          length INTEGER,
          period_length INTEGER,
          analysis_flags JSONB NOT NULL DEFAULT '[]',
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS daily_status (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          date DATE NOT NULL,
          fertility_status TEXT NOT NULL CONSTRAINT chk_daily_status_fertility
            CHECK (fertility_status IN ('fertile','unsure','not_fertile','period')),
          phase TEXT NOT NULL CONSTRAINT chk_daily_status_phase
            CHECK (phase IN ('Follicular','Ovulatory','Luteal','Period')),
          is_predicted BOOLEAN NOT NULL,
          insights_payload JSONB NOT NULL,
          engine_version TEXT NOT NULL,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          UNIQUE(user_id, date)
        );

        CREATE TABLE IF NOT EXISTS waitlist (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          email TEXT NOT NULL UNIQUE,
          source TEXT,
          reason TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS email_verification_codes (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          code_hash TEXT NOT NULL,
          expires_at TIMESTAMPTZ NOT NULL,
          attempts INTEGER NOT NULL DEFAULT 0,
          consumed_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS subscriptions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          provider TEXT NOT NULL DEFAULT 'dodo',
          provider_subscription_id TEXT UNIQUE,
          provider_customer_id TEXT,
          plan TEXT NOT NULL CONSTRAINT chk_subscriptions_plan
            CHECK (plan IN ('yearly','lifetime')),
          status TEXT NOT NULL CONSTRAINT chk_subscriptions_status
            CHECK (status IN ('active','canceled','past_due')),
          current_period_end TIMESTAMPTZ,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          cancel_at_period_end BOOLEAN NOT NULL DEFAULT false
        );

        CREATE TABLE IF NOT EXISTS billing_events (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID REFERENCES users(id) ON DELETE SET NULL,
          provider TEXT NOT NULL DEFAULT 'dodo',
          provider_event_id TEXT UNIQUE,
          event_type TEXT NOT NULL,
          outcome TEXT NOT NULL CONSTRAINT chk_billing_events_outcome
            CHECK (outcome IN ('succeeded','failed')),
          plan TEXT,
          provider_payment_id TEXT,
          provider_subscription_id TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          amount_cents INTEGER,
          currency TEXT
        );
      `);

      // Indexes
      await db.exec(`
        CREATE INDEX IF NOT EXISTS idx_logs_user_date ON logs (user_id, date DESC);
        CREATE INDEX IF NOT EXISTS idx_cycles_user_start ON cycles (user_id, start_date DESC);
        CREATE UNIQUE INDEX IF NOT EXISTS idx_cycles_user_active ON cycles (user_id) WHERE end_date IS NULL;
        CREATE INDEX IF NOT EXISTS idx_daily_status_user_date ON daily_status (user_id, date DESC);
        CREATE INDEX IF NOT EXISTS idx_evc_user_active
          ON email_verification_codes (user_id, created_at DESC) WHERE consumed_at IS NULL;
        CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions (user_id);
        CREATE INDEX IF NOT EXISTS idx_subscriptions_user_active
          ON subscriptions (user_id) WHERE status = 'active';
        CREATE INDEX IF NOT EXISTS idx_billing_events_user ON billing_events (user_id);
        CREATE INDEX IF NOT EXISTS idx_billing_events_created ON billing_events (created_at DESC);
      `);

      // Triggers
      for (const table of ['user_settings', 'logs', 'cycles', 'daily_status', 'subscriptions']) {
        await db.exec(`
          DO $$
          BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_update_updated_at_${table}') THEN
              CREATE TRIGGER trg_update_updated_at_${table}
              BEFORE UPDATE ON ${table}
              FOR EACH ROW
              EXECUTE FUNCTION update_updated_at_column();
            END IF;
          END $$;
        `);
      }
    },
  },
];

export async function migrate(db: Db) {
  // Use public. prefix to avoid connection pooler search_path issues
  await db.exec(`
    CREATE TABLE IF NOT EXISTS public.schema_migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  const appliedRows = await db.query<{ version: number }>(
    `SELECT version FROM public.schema_migrations`
  );
  const applied = new Set(appliedRows.map((r) => r.version));

  const pending = migrations
    .filter((m) => !applied.has(m.version))
    .sort((a, b) => a.version - b.version);

  if (pending.length === 0) {
    console.log('[migrate] No pending migrations');
    return;
  }

  for (const m of pending) {
    await db.transaction(async (tx) => {
      await m.up(tx);
      await tx.query(`INSERT INTO public.schema_migrations (version, name) VALUES ($1, $2)`, [
        m.version,
        m.name,
      ]);
    });
    console.log(`[migrate] applied #${m.version} ${m.name}`);
  }
}
