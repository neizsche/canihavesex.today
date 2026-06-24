import type { Db } from '../db.js';
import type { EngineMeta } from '../engine.js';

export type Theme = 'light' | 'dark';
export type CycleRegularity = 'regular' | 'irregular' | 'unsure';
export type ReanchorKind = 'late' | 'skipped';

// Drift correction state from the Today screen. `kind`/`cycleStart` are a
// cycle-scoped acknowledgment ("still no period") that auto-expires when a new
// cycle starts (compare cycleStart to the active cycle's start_date). `paused`
// is a sticky break/pregnant flag cleared by an explicit resume or a period log.
export interface ReanchorState {
  kind: ReanchorKind | null;
  cycleStart: string | null;
  paused: boolean;
}

// One row per user. Merges the former `user_preferences` (UI/onboarding) and
// `user_metadata` (engine baselines) tables — they were both 1:1 with users and
// always read together.
export interface UserSettings {
  user_id: string;
  theme: Theme;
  cycle_regularity: CycleRegularity | null;
  show_branding: boolean;
  education_seen: Record<string, boolean>;
  avg_cycle_length: number;
  onboarding_completed_at: string | null;
  reanchor_kind: ReanchorKind | null;
  reanchor_cycle_start: string | null;
  tracking_paused: boolean;
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
    }>(
      'SELECT avg_cycle_length, cycle_regularity FROM user_settings WHERE user_id = $1',
      [userId]
    );
    const row = rows[0];
    return {
      avg_cycle_length: row?.avg_cycle_length ?? DEFAULT_AVG_CYCLE_LENGTH,
      cycle_regularity: row?.cycle_regularity ?? null,
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
    data: { cycle_regularity: string; avgCycleLength: number }
  ): Promise<void> {
    await this.db.query(
      `INSERT INTO user_settings
         (user_id, cycle_regularity, avg_cycle_length, onboarding_completed_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (user_id) DO UPDATE SET
         cycle_regularity = EXCLUDED.cycle_regularity,
         avg_cycle_length = EXCLUDED.avg_cycle_length,
         onboarding_completed_at = EXCLUDED.onboarding_completed_at`,
      [userId, data.cycle_regularity, data.avgCycleLength]
    );
  }

  /** Partial profile update from the settings screen. updated_at is set by trigger. */
  async updateProfile(
    userId: string,
    data: { cycle_regularity?: string; avg_cycle_length?: number }
  ): Promise<void> {
    const setClauses: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (data.cycle_regularity !== undefined) {
      setClauses.push(`cycle_regularity = $${idx++}`);
      values.push(data.cycle_regularity);
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

  /** Drift re-anchor state for the Today screen. */
  async getReanchorState(userId: string): Promise<ReanchorState> {
    const rows = await this.db.query<{
      reanchor_kind: ReanchorKind | null;
      reanchor_cycle_start: string | Date | null;
      tracking_paused: boolean | null;
    }>(
      'SELECT reanchor_kind, reanchor_cycle_start, tracking_paused FROM user_settings WHERE user_id = $1',
      [userId]
    );
    const row = rows[0];
    return {
      kind: row?.reanchor_kind ?? null,
      cycleStart: toIsoDate(row?.reanchor_cycle_start),
      paused: row?.tracking_paused ?? false,
    };
  }

  /**
   * Partial update of the re-anchor state. Pass only the fields you want to
   * change (e.g. `{ paused: true }`, or `{ kind, cycleStart }` for an ack, or
   * `{ paused: false, kind: null, cycleStart: null }` to fully clear).
   */
  async setReanchorState(
    userId: string,
    data: { kind?: ReanchorKind | null; cycleStart?: string | null; paused?: boolean }
  ): Promise<void> {
    const setClauses: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (data.kind !== undefined) {
      setClauses.push(`reanchor_kind = $${idx++}`);
      values.push(data.kind);
    }
    if (data.cycleStart !== undefined) {
      setClauses.push(`reanchor_cycle_start = $${idx++}`);
      values.push(data.cycleStart);
    }
    if (data.paused !== undefined) {
      setClauses.push(`tracking_paused = $${idx++}`);
      values.push(data.paused);
    }

    if (setClauses.length === 0) return;

    values.push(userId);
    await this.db.query(
      `UPDATE user_settings SET ${setClauses.join(', ')} WHERE user_id = $${idx}`,
      values
    );
  }

  async deleteByUserId(userId: string): Promise<void> {
    await this.db.query('DELETE FROM user_settings WHERE user_id = $1', [userId]);
  }
}

// DATE columns may arrive as a 'YYYY-MM-DD' string (pg type config) or a Date;
// normalize to the ISO date string the rest of the app uses.
function toIsoDate(v: any): string | null {
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return v ?? null;
}

function mapSettings(userId: string, row: any): UserSettings {
  const toIso = (v: any) => (v instanceof Date ? v.toISOString() : (v ?? null));
  if (!row) {
    return {
      user_id: userId,
      theme: 'dark',
      cycle_regularity: null,
      show_branding: true,
      education_seen: {},
      avg_cycle_length: DEFAULT_AVG_CYCLE_LENGTH,
      onboarding_completed_at: null,
      reanchor_kind: null,
      reanchor_cycle_start: null,
      tracking_paused: false,
      updated_at: new Date().toISOString(),
    };
  }
  return {
    user_id: row.user_id,
    theme: row.theme === 'light' ? 'light' : 'dark',
    cycle_regularity: row.cycle_regularity ?? null,
    show_branding: row.show_branding ?? true,
    education_seen:
      row.education_seen && typeof row.education_seen === 'object' && !Array.isArray(row.education_seen)
        ? row.education_seen
        : {},
    avg_cycle_length: row.avg_cycle_length != null ? Number(row.avg_cycle_length) : DEFAULT_AVG_CYCLE_LENGTH,
    onboarding_completed_at: toIso(row.onboarding_completed_at),
    reanchor_kind: row.reanchor_kind ?? null,
    reanchor_cycle_start: toIsoDate(row.reanchor_cycle_start),
    tracking_paused: row.tracking_paused ?? false,
    updated_at: toIso(row.updated_at) ?? new Date().toISOString(),
  };
}
