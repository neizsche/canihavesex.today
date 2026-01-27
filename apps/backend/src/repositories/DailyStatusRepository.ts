import { Db } from '../db.js';

export interface DailyStatusV2 {
    id: string;
    user_id: string;
    date: string;
    fertility_status: 'fertile' | 'unsure' | 'not_fertile' | 'period';
    phase: string;
    is_predicted: boolean;
    insights_payload: any; // JSONB
    engine_version: string;
    updated_at: string;
}

export class DailyStatusRepository {
    constructor(private db: Db) { }

    async saveDailyStatuses(statuses: DailyStatusV2[]): Promise<void> {
        const now = new Date().toISOString();
        for (const s of statuses) {
            await this.db.query(
                `INSERT INTO daily_status_v2 (id, user_id, date, fertility_status, phase, is_predicted, insights_payload, engine_version, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (user_id, date) DO UPDATE SET
           fertility_status = EXCLUDED.fertility_status,
           phase = EXCLUDED.phase,
           is_predicted = EXCLUDED.is_predicted,
           insights_payload = EXCLUDED.insights_payload,
           engine_version = EXCLUDED.engine_version,
           updated_at = EXCLUDED.updated_at
        `,
                [
                    s.id, s.user_id, s.date, s.fertility_status, s.phase, s.is_predicted,
                    JSON.stringify(s.insights_payload), s.engine_version, now
                ]
            );
        }
    }

    async getRangeStatus(userId: string, startDate: string, endDate: string): Promise<DailyStatusV2[]> {
        const rows = await this.db.query<any>(
            `SELECT * FROM daily_status_v2 WHERE user_id = $1 AND date >= $2 AND date <= $3 ORDER BY date ASC`,
            [userId, startDate, endDate]
        );
        return rows.map(this.mapStatus);
    }

    async getTodayStatus(userId: string, date: string): Promise<DailyStatusV2 | null> {
        const rows = await this.db.query<any>(
            `SELECT * FROM daily_status_v2 WHERE user_id = $1 AND date = $2`,
            [userId, date]
        );
        if (!rows[0]) return null;
        return this.mapStatus(rows[0]);
    }

    async deleteStatusByUserId(userId: string): Promise<void> {
        await this.db.query(`DELETE FROM daily_status_v2 WHERE user_id = $1`, [userId]);
    }

    private mapStatus(r: any): DailyStatusV2 {
        const toIso = (d: any) => {
            if (d instanceof Date) {
                const year = d.getFullYear();
                const month = String(d.getMonth() + 1).padStart(2, '0');
                const day = String(d.getDate()).padStart(2, '0');
                return `${year}-${month}-${day}`;
            }
            return d;
        };
        return {
            ...r,
            date: toIso(r.date),
            insights_payload: typeof r.insights_payload === 'string' ? JSON.parse(r.insights_payload) : r.insights_payload
        };
    }
}
