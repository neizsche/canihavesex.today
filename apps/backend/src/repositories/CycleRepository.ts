import { Db } from '../db.js';
import { formatIsoDateLocal } from '../utils/dates.js';

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
    constructor(private db: Db) { }

    async upsertCycles(cycles: Cycle[]): Promise<void> {
        if (!cycles.length) return;

        const completed = cycles.filter((c) => c.end_date);
        const active = cycles.filter((c) => !c.end_date);

        await this.db.transaction(async (txDb) => {
            if (completed.length) {
                const values: any[] = [];
                const placeholders = completed
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
                       end_date = EXCLUDED.end_date,
                       ovulation_prediction = EXCLUDED.ovulation_prediction,
                       ovulation_confirmed_date = EXCLUDED.ovulation_confirmed_date,
                       length = EXCLUDED.length,
                       analysis_flags = EXCLUDED.analysis_flags
                    `,
                    values
                );

                const deleteIds = completed.map((c) => c.id);
                const deletePlaceholders = deleteIds.map((_, idx) => `$${idx + 1}`).join(', ');
                await txDb.query(
                    `DELETE FROM active_cycles WHERE id IN (${deletePlaceholders})`,
                    deleteIds
                );
            }

            if (active.length) {
                const values: any[] = [];
                const placeholders = active
                    .map((c, idx) => {
                        const base = idx * 9;
                        values.push(
                            c.id,
                            c.user_id,
                            c.start_date,
                            null,
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
                    `INSERT INTO active_cycles (id, user_id, start_date, end_date, ovulation_prediction, ovulation_confirmed_date, length, period_length, analysis_flags)
                     VALUES ${placeholders}
                     ON CONFLICT (user_id) DO UPDATE SET
                       id = EXCLUDED.id,
                       start_date = EXCLUDED.start_date,
                       end_date = EXCLUDED.end_date,
                       ovulation_prediction = EXCLUDED.ovulation_prediction,
                       ovulation_confirmed_date = EXCLUDED.ovulation_confirmed_date,
                       length = EXCLUDED.length,
                       analysis_flags = EXCLUDED.analysis_flags
                    `,
                    values
                );
            }
        });
    }

    async getCycleHistory(userId: string): Promise<Cycle[]> {
        const historyRows = await this.db.query<any>(`SELECT * FROM cycles WHERE user_id = $1 ORDER BY start_date DESC`, [userId]);
        const history = historyRows.map(this.mapCycle);

        const activeRows = await this.db.query<any>(`SELECT * FROM active_cycles WHERE user_id = $1`, [userId]);
        const active = activeRows.map(this.mapCycle);

        return [...active, ...history].sort((a, b) => b.start_date.localeCompare(a.start_date));
    }

    async getEarliestCycleStartDate(userId: string): Promise<string | null> {
        const rows = await this.db.query<any>(
            `SELECT MIN(start_date) AS min_start
             FROM (
               SELECT start_date FROM cycles WHERE user_id = $1
               UNION ALL
               SELECT start_date FROM active_cycles WHERE user_id = $1
             ) AS cycle_dates`,
            [userId]
        );
        const value = rows[0]?.min_start;
        if (!value) return null;
        return value instanceof Date ? formatIsoDateLocal(value) : String(value);
    }

    async deleteCyclesByUserId(userId: string): Promise<void> {
        await this.db.query(`DELETE FROM cycles WHERE user_id = $1`, [userId]);
        await this.db.query(`DELETE FROM active_cycles WHERE user_id = $1`, [userId]);
    }

    private mapCycle(r: any): Cycle {
        const toIso = (d: any) => (d instanceof Date ? formatIsoDateLocal(d) : d);
        return {
            ...r,
            start_date: toIso(r.start_date),
            end_date: toIso(r.end_date),
            ovulation_prediction: toIso(r.ovulation_prediction),
            ovulation_confirmed_date: toIso(r.ovulation_confirmed_date),
            analysis_flags: Array.isArray(r.analysis_flags) ? r.analysis_flags : (r.analysis_flags ? JSON.parse(r.analysis_flags) : [])
        };
    }
}
