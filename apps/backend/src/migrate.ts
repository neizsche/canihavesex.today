import type { Db } from './db.js';

// --- Ordered migration runner ------------------------------------------------
// Each migration has a unique, monotonically increasing `version`. On boot we
// read which versions have already been applied (from `schema_migrations`) and
// run only the missing ones, in order, each inside its own transaction.
//
// This replaces the old single-integer "schema version" gate, which silently
// skipped the entire DDL pass once the DB reached v1 — so any schema edit made
// afterwards never applied unless someone remembered to bump the constant. To
// change the schema now: append a new migration with the next version number.
// Never edit an already-released migration in place.

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
      // updated_at trigger helper (used by the per-table triggers below).
      await db.exec(`
        CREATE OR REPLACE FUNCTION update_updated_at_column()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.updated_at = NOW();
            RETURN NEW;
        END;
        $$ language 'plpgsql';
      `);

      // --- Tables -----------------------------------------------------------
      await db.exec(`
        CREATE TABLE IF NOT EXISTS users (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          email TEXT NOT NULL UNIQUE,
          password_hash TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
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

        CREATE TABLE IF NOT EXISTS user_api_keys (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          name TEXT,
          key_hash TEXT NOT NULL UNIQUE,
          key_prefix TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          last_used_at TIMESTAMPTZ,
          revoked_at TIMESTAMPTZ
        );

        -- Per-user settings. Merges the former user_preferences (UI/onboarding)
        -- and user_metadata (engine baselines) tables: they were both 1:1 with
        -- users and always fetched together. The redundant app_mode (derivable
        -- from intent) and the unused baseline_temp_avg were dropped, and the
        -- four education_*_shown_at columns collapsed into one JSONB map.
        CREATE TABLE IF NOT EXISTS user_settings (
          user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
          theme TEXT NOT NULL DEFAULT 'dark',
          intent TEXT,
          cycle_regularity TEXT,
          context_flags JSONB NOT NULL DEFAULT '[]',
          show_branding BOOLEAN NOT NULL DEFAULT true,
          education_seen JSONB NOT NULL DEFAULT '{}',
          avg_cycle_length NUMERIC(5,2) NOT NULL DEFAULT 28.0,
          onboarding_completed_at TIMESTAMPTZ,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS logs (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          date DATE NOT NULL,
          bleeding TEXT,
          temperature NUMERIC(5,2),
          mucus TEXT,
          lh_test TEXT,
          disturbances JSONB NOT NULL DEFAULT '[]',
          symptoms JSONB NOT NULL DEFAULT '[]',
          notes TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          UNIQUE(user_id, date)
        );

        CREATE TABLE IF NOT EXISTS cycles (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          start_date DATE NOT NULL,
          end_date DATE, -- NULL means the active (current) cycle
          ovulation_prediction DATE,
          ovulation_confirmed_date DATE,
          length INTEGER,
          period_length INTEGER,
          analysis_flags JSONB NOT NULL DEFAULT '[]',
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        -- Denormalized engine output, one row per user per day. engine_version
        -- lets the read path invalidate rows produced by an older engine.
        CREATE TABLE IF NOT EXISTS daily_status (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          date DATE NOT NULL,
          fertility_status TEXT NOT NULL,
          phase TEXT NOT NULL,
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
      `);

      // --- Indexes ----------------------------------------------------------
      await db.exec(`
        CREATE INDEX IF NOT EXISTS idx_logs_user_date ON logs (user_id, date DESC);
        CREATE INDEX IF NOT EXISTS idx_cycles_user_start ON cycles (user_id, start_date DESC);
        -- At most one active cycle (end_date IS NULL) per user.
        CREATE UNIQUE INDEX IF NOT EXISTS idx_cycles_user_active ON cycles (user_id) WHERE end_date IS NULL;
        CREATE INDEX IF NOT EXISTS idx_daily_status_user_date ON daily_status (user_id, date DESC);
        CREATE INDEX IF NOT EXISTS idx_user_api_keys_user_id ON user_api_keys (user_id);
        CREATE INDEX IF NOT EXISTS idx_user_api_keys_hash ON user_api_keys (key_hash);
      `);

      // --- updated_at triggers ---------------------------------------------
      for (const table of ['user_settings', 'logs', 'cycles', 'daily_status']) {
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
  {
    version: 2,
    name: 'log_cycle_start_and_enum_checks',
    up: async (db) => {
      // R1 (engine v6): optional, user-set period-start markers. The engine
      // trusts an explicit `cycle_start` over inference and skips an `is_uncertain`
      // start for prediction. Both default false → existing rows are unaffected
      // and inference still applies when they are absent.
      await db.exec(`
        ALTER TABLE logs ADD COLUMN IF NOT EXISTS cycle_start BOOLEAN NOT NULL DEFAULT false;
        ALTER TABLE logs ADD COLUMN IF NOT EXISTS is_uncertain BOOLEAN NOT NULL DEFAULT false;
      `);

      // DB-level enum integrity (was app-only validation). Added NOT VALID so the
      // migration can never fail on pre-existing rows; the constraint is still
      // enforced on every INSERT/UPDATE going forward. NULL is allowed where the
      // column is optional.
      const checks: Array<[string, string, string]> = [
        [
          'logs',
          'chk_logs_bleeding',
          `bleeding IS NULL OR bleeding IN ('none','spotting','light','medium','heavy')`,
        ],
        [
          'logs',
          'chk_logs_mucus',
          `mucus IS NULL OR mucus IN ('dry','sticky','creamy','watery','eggwhite')`,
        ],
        ['logs', 'chk_logs_lh_test', `lh_test IS NULL OR lh_test IN ('positive','negative')`],
        [
          'daily_status',
          'chk_daily_status_fertility',
          `fertility_status IN ('fertile','unsure','not_fertile','period')`,
        ],
        [
          'daily_status',
          'chk_daily_status_phase',
          `phase IN ('Follicular','Ovulatory','Luteal','Period')`,
        ],
      ];
      for (const [table, name, expr] of checks) {
        await db.exec(`
          DO $$
          BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = '${name}') THEN
              ALTER TABLE ${table} ADD CONSTRAINT ${name} CHECK (${expr}) NOT VALID;
            END IF;
          END $$;
        `);
      }
    },
  },
  {
    version: 3,
    name: 'drop_unused_onboarding_fields',
    up: async (db) => {
      // `intent` and `context_flags` were collected at onboarding but never
      // consumed: intent defaulted to a constant and was only echoed back, and
      // context_flags was stored but read by nothing (the engine never looked at
      // it). The engine inputs that actually matter — avg_cycle_length and
      // cycle_regularity — stay. Dropping both columns end-to-end.
      await db.exec(`
        ALTER TABLE user_settings DROP COLUMN IF EXISTS intent;
        ALTER TABLE user_settings DROP COLUMN IF EXISTS context_flags;
      `);
    },
  },
  {
    version: 4,
    name: 'email_verification',
    up: async (db) => {
      // Cloud-only email verification (gated by REQUIRE_EMAIL_VERIFICATION).
      // `email_verified` defaults TRUE so every account that isn't a cloud
      // password sign-up is considered verified out of the box: existing rows
      // (back-filled by ADD COLUMN), OAuth users (Google already verifies the
      // address), the demo account, and all self-hosted users. The cloud
      // register path is the only place that explicitly sets it to false, then
      // a confirmed code flips it back to true.
      await db.exec(`
        ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT true;

        CREATE TABLE IF NOT EXISTS email_verification_codes (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          code_hash TEXT NOT NULL,
          expires_at TIMESTAMPTZ NOT NULL,
          attempts INTEGER NOT NULL DEFAULT 0,
          consumed_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        -- The hot lookup is "latest unconsumed code for this user".
        CREATE INDEX IF NOT EXISTS idx_evc_user_active
          ON email_verification_codes (user_id, created_at DESC)
          WHERE consumed_at IS NULL;
      `);
    },
  },
  {
    version: 5,
    name: 'subscriptions',
    up: async (db) => {
      // Cloud-only billing (gated by BILLING_ENABLED). Self-host never sets that
      // flag, so this table simply stays empty and the entitlement gate never
      // runs. One row per paid purchase. Column names are intentionally
      // PROVIDER-AGNOSTIC (`provider` + `provider_*_id`) so swapping the payment
      // provider — Dodo today, anything else later — never touches the schema,
      // the entitlement rules, or the gate; only the provider adapter changes.
      // provider_subscription_id is the external id we upsert on (for one-time
      // lifetime, the adapter stores the payment id there so retries stay
      // idempotent). current_period_end is NULL for lifetime (never expires).
      await db.exec(`
        CREATE TABLE IF NOT EXISTS subscriptions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          provider TEXT NOT NULL DEFAULT 'dodo',
          provider_subscription_id TEXT UNIQUE,
          provider_customer_id TEXT,
          plan TEXT NOT NULL,
          status TEXT NOT NULL,
          current_period_end TIMESTAMPTZ,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions (user_id);
        -- Hot path for the entitlement gate: a user's active subscriptions.
        CREATE INDEX IF NOT EXISTS idx_subscriptions_user_active
          ON subscriptions (user_id) WHERE status = 'active';
      `);

      // Enum integrity (NOT VALID so the migration can't fail on existing rows;
      // still enforced on every write going forward). Mirrors the v2 pattern.
      const checks: Array<[string, string, string]> = [
        ['subscriptions', 'chk_subscriptions_plan', `plan IN ('yearly','lifetime')`],
        ['subscriptions', 'chk_subscriptions_status', `status IN ('active','canceled','past_due')`],
      ];
      for (const [table, name, expr] of checks) {
        await db.exec(`
          DO $$
          BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = '${name}') THEN
              ALTER TABLE ${table} ADD CONSTRAINT ${name} CHECK (${expr}) NOT VALID;
            END IF;
          END $$;
        `);
      }

      await db.exec(`
        DO $$
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_update_updated_at_subscriptions') THEN
            CREATE TRIGGER trg_update_updated_at_subscriptions
            BEFORE UPDATE ON subscriptions
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
          END IF;
        END $$;
      `);
    },
  },
  {
    version: 6,
    name: 'subscriptions_provider_columns',
    up: async (db) => {
      // Reconcile databases that applied an EARLIER v5 (when the columns were
      // named dodo_*). v5 was later edited to the provider-agnostic names, but
      // CREATE TABLE IF NOT EXISTS won't rename columns on a table that already
      // exists — so any DB that ran the old v5 is left with dodo_* columns and
      // no `provider`. Rename/add them idempotently here. On a fresh DB (v5
      // already created provider_*), every guard is false and this is a no-op.
      await db.exec(`
        DO $$
        BEGIN
          IF EXISTS (SELECT 1 FROM information_schema.columns
                     WHERE table_name='subscriptions' AND column_name='dodo_subscription_id') THEN
            ALTER TABLE subscriptions RENAME COLUMN dodo_subscription_id TO provider_subscription_id;
          END IF;
          IF EXISTS (SELECT 1 FROM information_schema.columns
                     WHERE table_name='subscriptions' AND column_name='dodo_customer_id') THEN
            ALTER TABLE subscriptions RENAME COLUMN dodo_customer_id TO provider_customer_id;
          END IF;
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                         WHERE table_name='subscriptions' AND column_name='provider') THEN
            ALTER TABLE subscriptions ADD COLUMN provider TEXT NOT NULL DEFAULT 'dodo';
          END IF;
        END $$;
      `);
    },
  },
  {
    version: 7,
    name: 'billing_events',
    up: async (db) => {
      // Append-only audit of payment outcomes from the provider webhook: every
      // verified success or failure, regardless of whether it changed the
      // subscription state. The `subscriptions` table holds current state; this
      // holds the history (what happened, when, for whom). Provider-agnostic,
      // same as subscriptions. provider_event_id is the provider's stable event
      // id (Standard Webhooks `webhook-id`) and is UNIQUE so webhook retries are
      // idempotent (INSERT ... ON CONFLICT DO NOTHING). user_id is nullable —
      // some events may arrive without our metadata — and SET NULL on user
      // delete so the financial record survives account deletion.
      await db.exec(`
        CREATE TABLE IF NOT EXISTS billing_events (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID REFERENCES users(id) ON DELETE SET NULL,
          provider TEXT NOT NULL DEFAULT 'dodo',
          provider_event_id TEXT UNIQUE,
          event_type TEXT NOT NULL,
          outcome TEXT NOT NULL,
          plan TEXT,
          provider_payment_id TEXT,
          provider_subscription_id TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_billing_events_user ON billing_events (user_id);
        CREATE INDEX IF NOT EXISTS idx_billing_events_created ON billing_events (created_at DESC);
      `);

      // Enum integrity (NOT VALID so it can't fail on existing rows; enforced on
      // every write going forward). Mirrors the v5 pattern.
      await db.exec(`
        DO $$
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_billing_events_outcome') THEN
            ALTER TABLE billing_events
              ADD CONSTRAINT chk_billing_events_outcome CHECK (outcome IN ('succeeded','failed')) NOT VALID;
          END IF;
        END $$;
      `);
    },
  },
  {
    version: 8,
    name: 'billing_events_amount',
    up: async (db) => {
      // Revenue data on each payment outcome, straight off the provider webhook.
      // amount_cents is the integer smallest-currency-unit (Dodo `total_amount`,
      // e.g. cents) to avoid float rounding; currency is the ISO code (e.g. USD).
      // Nullable: present on payment events, absent on pure subscription-state
      // events (the matching payment.succeeded row carries the money).
      await db.exec(`
        ALTER TABLE billing_events ADD COLUMN IF NOT EXISTS amount_cents INTEGER;
        ALTER TABLE billing_events ADD COLUMN IF NOT EXISTS currency TEXT;
      `);
    },
  },
  {
    version: 9,
    name: 'subscriptions_cancel_at_period_end',
    up: async (db) => {
      // Tracks a cancel-at-period-end request on a recurring (yearly) plan: the
      // user (or a lifetime upgrade) has asked Dodo to stop renewing, but access
      // runs out the already-paid term. The row stays status='active' with its
      // current_period_end until subscription.expired flips it to 'canceled', so
      // entitlement is unaffected — this flag only lets the UI say "Cancels on X"
      // instead of "Next billing on X". Lifetime never sets it.
      await db.exec(`
        ALTER TABLE subscriptions
          ADD COLUMN IF NOT EXISTS cancel_at_period_end BOOLEAN NOT NULL DEFAULT false;
      `);
    },
  },
];

export async function migrate(db: Db) {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  const appliedRows = await db.query<{ version: number }>(`SELECT version FROM schema_migrations`);
  const applied = new Set(appliedRows.map((r) => r.version));

  const pending = migrations
    .filter((m) => !applied.has(m.version))
    .sort((a, b) => a.version - b.version);

  if (pending.length === 0) return;

  for (const m of pending) {
    await db.transaction(async (tx) => {
      await m.up(tx);
      await tx.query(`INSERT INTO schema_migrations (version, name) VALUES ($1, $2)`, [
        m.version,
        m.name,
      ]);
    });
    console.log(`[migrate] applied #${m.version} ${m.name}`);
  }
}
