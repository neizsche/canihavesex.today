import { Db } from '../db.js';

export interface Cycle {
  id: string; // UUID
  user_id: string; // UUID
  start_date: string;
  end_date: string | null;
  ovulation_prediction: string | null;
  ovulation_confirmed_date: string | null;
  length: number | null;
  period_length: number | null;
  analysis_flags: string[]; // JSONB
}

export class CycleRepository {
  constructor(private db: Db) {}

  async upsertCycles(cycles: Cycle[]): Promise<void> {
    if (!cycles.length) return;

    await this.db.transaction(async (txDb) => {
      // The engine produces the authoritative, complete set of cycles for
      // this user. When a cycle boundary shifts (e.g. period detected on
      // a different day), the rebuilt cycle gets a new UUID while the old
      // active cycle still sits in the DB. A plain ON CONFLICT (id) upsert
      // would try to INSERT a second active cycle, violating the partial
      // unique index idx_cycles_user_active (user_id WHERE end_date IS NULL).
      // Fix: delete any of this user's cycles whose ids are NOT in the
      // incoming batch before inserting, so stale rows are cleared first.
      const userId = cycles[0].user_id;
      const incomingIds = cycles.map((c) => c.id);
      const idPlaceholders = incomingIds.map((_, i) => `$${i + 2}`).join(', ');
      await txDb.query(`DELETE FROM cycles WHERE user_id = $1 AND id NOT IN (${idPlaceholders})`, [
        userId,
        ...incomingIds,
      ]);

      const values: any[] = [];
      const placeholders = cycles
        .map((c, idx) => {
          const base = idx * 9;
          values.push(
            c.id,
            c.user_id,
            c.start_date,
            c.end_date,
            c.ovulation_prediction,
            c.ovulation_confirmed_date,
            c.length,
            c.period_length,
            JSON.stringify(c.analysis_flags)
          );
          return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7}, $${base + 8}, $${base + 9})`;
        })
        .join(', ');

      await txDb.query(
        `INSERT INTO cycles (id, user_id, start_date, end_date, ovulation_prediction, ovulation_confirmed_date, length, period_length, analysis_flags)
                 VALUES ${placeholders}
                 ON CONFLICT (id) DO UPDATE SET
                   start_date = EXCLUDED.start_date,
                   end_date = EXCLUDED.end_date,
                   ovulation_prediction = EXCLUDED.ovulation_prediction,
                   ovulation_confirmed_date = EXCLUDED.ovulation_confirmed_date,
                   length = EXCLUDED.length,
                   period_length = EXCLUDED.period_length,
                   analysis_flags = EXCLUDED.analysis_flags
                `,
        values
      );
    });
  }

  async getCycleHistory(userId: string): Promise<Cycle[]> {
    const rows = await this.db.query<any>(
      `SELECT * FROM cycles WHERE user_id = $1 ORDER BY start_date DESC`,
      [userId]
    );
    return rows.map(mapCycle);
  }

  async getEarliestCycleStartDate(userId: string): Promise<string | null> {
    const rows = await this.db.query<any>(
      `SELECT MIN(start_date) AS min_start FROM cycles WHERE user_id = $1`,
      [userId]
    );
    const value = rows[0]?.min_start;
    return value ? String(value) : null;
  }

  async deleteCyclesByUserId(userId: string): Promise<void> {
    await this.db.query(`DELETE FROM cycles WHERE user_id = $1`, [userId]);
  }
}

function mapCycle(r: any): Cycle {
  return {
    ...r,
    // DATE columns arrive as 'YYYY-MM-DD' strings and analysis_flags (jsonb)
    // as a parsed array via the pg type config (see db.ts).
    analysis_flags: Array.isArray(r.analysis_flags) ? r.analysis_flags : [],
  };
}
