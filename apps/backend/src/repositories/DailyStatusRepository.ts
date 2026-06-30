import { Db } from '../db.js';

export interface DailyStatus {
  id: string; // UUID
  user_id: string; // UUID
  date: string;
  fertility_status: 'fertile' | 'unsure' | 'not_fertile' | 'period';
  phase: string;
  is_predicted: boolean;
  insights_payload: any; // JSONB
  engine_version: string;
  updated_at: string;
}

export class DailyStatusRepository {
  constructor(private db: Db) {}

  async saveDailyStatuses(statuses: DailyStatus[]): Promise<void> {
    if (!statuses.length) return;

    const chunkSize = 500;

    await this.db.transaction(async (txDb) => {
      for (let i = 0; i < statuses.length; i += chunkSize) {
        const chunk = statuses.slice(i, i + chunkSize);
        const values: any[] = [];
        const placeholders = chunk
          .map((s, idx) => {
            const base = idx * 8;
            values.push(
              s.id,
              s.user_id,
              s.date,
              s.fertility_status,
              s.phase,
              s.is_predicted,
              JSON.stringify(s.insights_payload),
              s.engine_version
            );
            return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7}, $${base + 8})`;
          })
          .join(', ');

        await txDb.query(
          `INSERT INTO daily_status (id, user_id, date, fertility_status, phase, is_predicted, insights_payload, engine_version)
                     VALUES ${placeholders}
                     ON CONFLICT (user_id, date) DO UPDATE SET
                       fertility_status = EXCLUDED.fertility_status,
                       phase = EXCLUDED.phase,
                       is_predicted = EXCLUDED.is_predicted,
                       insights_payload = EXCLUDED.insights_payload,
                       engine_version = EXCLUDED.engine_version
                    `,
          values
        );
      }
    });
  }

  async getRangeStatus(userId: string, startDate: string, endDate: string): Promise<DailyStatus[]> {
    const rows = await this.db.query<any>(
      `SELECT * FROM daily_status WHERE user_id = $1 AND date >= $2 AND date <= $3 ORDER BY date ASC`,
      [userId, startDate, endDate]
    );
    return rows.map(mapStatus);
  }

  async getTodayStatus(userId: string, date: string): Promise<DailyStatus | null> {
    const rows = await this.db.query<any>(
      `SELECT * FROM daily_status WHERE user_id = $1 AND date = $2`,
      [userId, date]
    );
    if (!rows[0]) return null;
    return mapStatus(rows[0]);
  }

  async deleteStatusByUserId(userId: string): Promise<void> {
    await this.db.query(`DELETE FROM daily_status WHERE user_id = $1`, [userId]);
  }
}

function mapStatus(r: any): DailyStatus {
  return {
    ...r,
    // date is a 'YYYY-MM-DD' string and insights_payload (jsonb) is parsed by
    // pg (see db.ts); only the timestamptz needs normalizing to an ISO string.
    updated_at: r.updated_at instanceof Date ? r.updated_at.toISOString() : r.updated_at,
  };
}
