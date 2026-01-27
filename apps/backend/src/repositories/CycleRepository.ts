import { Db } from '../db.js';

export interface CycleV2 {
    id: string;
    user_id: string;
    start_date: string;
    end_date: string | null;
    ovulation_prediction: string | null;
    ovulation_confirmed_date: string | null;
    length: number | null;
    period_length: number | null;
    analysis_flags: string[]; // JSONB
}

export class CycleRepository {
    constructor(private db: Db) { }

    async upsertCycles(cycles: CycleV2[]): Promise<void> {
        for (const c of cycles) {
            if (c.end_date) {
                // COMPLETED CHOOSE HISTORY
                await this.db.query(
                    `INSERT INTO cycles_v2 (id, user_id, start_date, end_date, ovulation_prediction, ovulation_confirmed_date, length, period_length, analysis_flags)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
             ON CONFLICT (id) DO UPDATE SET
               end_date = EXCLUDED.end_date,
               ovulation_prediction = EXCLUDED.ovulation_prediction,
               ovulation_confirmed_date = EXCLUDED.ovulation_confirmed_date,
               length = EXCLUDED.length,
               analysis_flags = EXCLUDED.analysis_flags
             `,
                    [c.id, c.user_id, c.start_date, c.end_date, c.ovulation_prediction, c.ovulation_confirmed_date, c.length, c.period_length, JSON.stringify(c.analysis_flags)]
                );
                // Remove from active
                await this.db.query(`DELETE FROM active_cycles_v2 WHERE id = $1`, [c.id]);
            } else {
                // ACTIVE CHOOSE ACTIVE
                await this.db.query(
                    `INSERT INTO active_cycles_v2 (id, user_id, start_date, end_date, ovulation_prediction, ovulation_confirmed_date, length, period_length, analysis_flags)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
             ON CONFLICT (user_id) DO UPDATE SET
               id = EXCLUDED.id,
               start_date = EXCLUDED.start_date,
               end_date = EXCLUDED.end_date,
               ovulation_prediction = EXCLUDED.ovulation_prediction,
               ovulation_confirmed_date = EXCLUDED.ovulation_confirmed_date,
               length = EXCLUDED.length,
               analysis_flags = EXCLUDED.analysis_flags
             `,
                    [c.id, c.user_id, c.start_date, null, c.ovulation_prediction, c.ovulation_confirmed_date, c.length, c.period_length, JSON.stringify(c.analysis_flags)]
                );
            }
        }
    }

    async getCycleHistory(userId: string): Promise<CycleV2[]> {
        const historyRows = await this.db.query<any>(`SELECT * FROM cycles_v2 WHERE user_id = $1 ORDER BY start_date DESC`, [userId]);
        const history = historyRows.map(this.mapCycle);

        const activeRows = await this.db.query<any>(`SELECT * FROM active_cycles_v2 WHERE user_id = $1`, [userId]);
        const active = activeRows.map(this.mapCycle);

        // Combine (Active first for safety in filters, but logic uses date)
        return [...active, ...history].sort((a, b) => b.start_date.localeCompare(a.start_date));
    }

    async deleteCyclesByUserId(userId: string): Promise<void> {
        await this.db.query(`DELETE FROM cycles_v2 WHERE user_id = $1`, [userId]);
        await this.db.query(`DELETE FROM active_cycles_v2 WHERE user_id = $1`, [userId]);
    }

    private mapCycle(r: any): CycleV2 {
        const toIso = (d: any) => (d instanceof Date ? d.toISOString().split('T')[0] : d);
        return {
            ...r,
            start_date: toIso(r.start_date),
            end_date: toIso(r.end_date),
            ovulation_prediction: toIso(r.ovulation_prediction),
            ovulation_confirmed_date: toIso(r.ovulation_confirmed_date),
            analysis_flags: typeof r.analysis_flags === 'string' ? JSON.parse(r.analysis_flags) : r.analysis_flags
        };
    }
}
