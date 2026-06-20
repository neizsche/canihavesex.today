import type { Db } from '../db.js';
import type { EngineMeta } from '../engine.js';

export type Theme = 'light' | 'dark';
export type Intent = 'avoid_pregnancy' | 'conceive' | 'understand_cycle';
export type CycleRegularity = 'regular' | 'irregular' | 'unsure';

// One row per user. Merges the former `user_preferences` (UI/onboarding) and
// `user_metadata` (engine baselines) tables — they were both 1:1 with users and
// always read together.
export interface UserSettings {
  user_id: string;
  theme: Theme;
  intent: Intent | null;
  cycle_regularity: CycleRegularity | null;
  context_flags: string[];
  show_branding: boolean;
  education_seen: Record<string, boolean>;
  avg_cycle_length: number;
  onboarding_completed_at: string | null;
  updated_at: string;
}

const DEFAULT_AVG_CYCLE_LENGTH = 28;

export class SettingsRepository {
  constructor(private db: Db) {}

  async getSettings(userId: string): Promise<UserSettings> {
    const rows = await this.db.query<any>(
      'SELECT * FROM user_settings WHERE user_id = $1',
      [userId]
    );
    return mapSettings(userId, rows[0]);
  }

  /** Only the fields the fertility engine consumes. */
  async getEngineMeta(userId: string): Promise<EngineMeta> {
    const rows = await this.db.query<{
      avg_cycle_length: number;
      cycle_regularity: CycleRegularity | null;
      context_flags: unknown;
    }>(
      'SELECT avg_cycle_length, cycle_regularity, context_flags FROM user_settings WHERE user_id = $1',
      [userId]
    );
    const row = rows[0];
    return {
      avg_cycle_length: row?.avg_cycle_length ?? DEFAULT_AVG_CYCLE_LENGTH,
      cycle_regularity: row?.cycle_regularity ?? null,
      context_flags: Array.isArray(row?.context_flags) ? (row!.context_flags as string[]) : [],
    };
  }

  async hasCompletedOnboarding(userId: string): Promise<boolean> {
    const rows = await this.db.query<{ onboarding_completed_at: string | null }>(
      'SELECT onboarding_completed_at FROM user_settings WHERE user_id = $1',
      [userId]
    );
    return !!rows[0]?.onboarding_completed_at;
  }

  /** Create the default settings row. Idempotent (OAuth re-link, retries, resets). */
  async createDefault(userId: string): Promise<void> {
    await this.db.query(
      `INSERT INTO user_settings (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING`,
      [userId]
    );
  }

  /**
   * Persist onboarding answers in a single upsert. Idempotent so a client retry
   * after a perceived failure cannot duplicate or corrupt state.
   */
  async completeOnboarding(
    userId: string,
    data: { intent: string; cycle_regularity: string; context_flags: string[]; avgCycleLength: number }
  ): Promise<void> {
    await this.db.query(
      `INSERT INTO user_settings
         (user_id, intent, cycle_regularity, context_flags, avg_cycle_length, onboarding_completed_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       ON CONFLICT (user_id) DO UPDATE SET
         intent = EXCLUDED.intent,
         cycle_regularity = EXCLUDED.cycle_regularity,
         context_flags = EXCLUDED.context_flags,
         avg_cycle_length = EXCLUDED.avg_cycle_length,
         onboarding_completed_at = EXCLUDED.onboarding_completed_at`,
      [userId, data.intent, data.cycle_regularity, JSON.stringify(data.context_flags), data.avgCycleLength]
    );
  }

  /** Partial profile update from the settings screen. updated_at is set by trigger. */
  async updateProfile(
    userId: string,
    data: { cycle_regularity?: string; context_flags?: string[]; avg_cycle_length?: number }
  ): Promise<void> {
    const setClauses: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (data.cycle_regularity !== undefined) {
      setClauses.push(`cycle_regularity = $${idx++}`);
      values.push(data.cycle_regularity);
    }
    if (data.context_flags !== undefined) {
      setClauses.push(`context_flags = $${idx++}`);
      values.push(JSON.stringify(data.context_flags));
    }
    if (data.avg_cycle_length !== undefined) {
      setClauses.push(`avg_cycle_length = $${idx++}`);
      values.push(data.avg_cycle_length);
    }

    if (setClauses.length === 0) return;

    values.push(userId);
    await this.db.query(
      `UPDATE user_settings SET ${setClauses.join(', ')} WHERE user_id = $${idx}`,
      values
    );
  }

  async updateShowBranding(userId: string, showBranding: boolean): Promise<void> {
    await this.db.query(
      'UPDATE user_settings SET show_branding = $1 WHERE user_id = $2',
      [showBranding, userId]
    );
  }

  async updateTheme(userId: string, theme: Theme): Promise<void> {
    await this.db.query(
      'UPDATE user_settings SET theme = $1 WHERE user_id = $2',
      [theme, userId]
    );
  }

  async deleteByUserId(userId: string): Promise<void> {
    await this.db.query('DELETE FROM user_settings WHERE user_id = $1', [userId]);
  }
}

function mapSettings(userId: string, row: any): UserSettings {
  const toIso = (v: any) => (v instanceof Date ? v.toISOString() : (v ?? null));
  if (!row) {
    return {
      user_id: userId,
      theme: 'dark',
      intent: null,
      cycle_regularity: null,
      context_flags: [],
      show_branding: true,
      education_seen: {},
      avg_cycle_length: DEFAULT_AVG_CYCLE_LENGTH,
      onboarding_completed_at: null,
      updated_at: new Date().toISOString(),
    };
  }
  return {
    user_id: row.user_id,
    theme: row.theme === 'light' ? 'light' : 'dark',
    intent: row.intent ?? null,
    cycle_regularity: row.cycle_regularity ?? null,
    // jsonb columns are returned already-parsed by pg.
    context_flags: Array.isArray(row.context_flags) ? row.context_flags : [],
    show_branding: row.show_branding ?? true,
    education_seen:
      row.education_seen && typeof row.education_seen === 'object' && !Array.isArray(row.education_seen)
        ? row.education_seen
        : {},
    avg_cycle_length: row.avg_cycle_length != null ? Number(row.avg_cycle_length) : DEFAULT_AVG_CYCLE_LENGTH,
    onboarding_completed_at: toIso(row.onboarding_completed_at),
    updated_at: toIso(row.updated_at) ?? new Date().toISOString(),
  };
}
