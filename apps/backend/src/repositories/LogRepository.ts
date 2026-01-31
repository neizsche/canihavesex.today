import { Db } from '../db.js';
import { randomUUID } from 'node:crypto';

export interface LogV2 {
    id: string;
    user_id: string;
    date: string; // YYYY-MM-DD
    bleeding: 'none' | 'spotting' | 'light' | 'medium' | 'heavy' | null;
    temperature: number | null;
    mucus: 'dry' | 'sticky' | 'creamy' | 'watery' | 'eggwhite' | null;
    lh_test: 'positive' | 'negative' | null;
    disturbances: string[]; // JSONB
    symptoms: string[];     // JSONB
    notes: string | null;
    created_at: string;
}

export class LogRepository {
    constructor(private db: Db) { }

    async upsertLog(log: Omit<LogV2, 'created_at'>): Promise<void> {
        const now = new Date().toISOString();
        await this.db.query(
            `INSERT INTO logs_v2 (id, user_id, date, bleeding, temperature, mucus, lh_test, disturbances, symptoms, notes, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $11)
       ON CONFLICT (user_id, date) DO UPDATE SET
         bleeding = EXCLUDED.bleeding,
         temperature = EXCLUDED.temperature,
         mucus = EXCLUDED.mucus,
         lh_test = EXCLUDED.lh_test,
         disturbances = EXCLUDED.disturbances,
         symptoms = EXCLUDED.symptoms,
         notes = EXCLUDED.notes,
         updated_at = EXCLUDED.updated_at
      `,
            [
                log.id || randomUUID(),
                log.user_id,
                log.date,
                log.bleeding ?? null,
                log.temperature ?? null,
                log.mucus ?? null,
                log.lh_test ?? null,
                JSON.stringify(log.disturbances || []),
                JSON.stringify(log.symptoms || []),
                log.notes ?? null,
                now
            ]
        );
    }

    async getLog(userId: string, date: string): Promise<LogV2 | null> {
        const rows = await this.db.query<any>(
            `SELECT * FROM logs_v2 WHERE user_id = $1 AND date = $2`,
            [userId, date]
        );
        if (!rows[0]) return null;
        return this.mapLog(rows[0]);
    }

    async getAllLogs(userId: string): Promise<LogV2[]> {
        const rows = await this.db.query<any>(
            `SELECT * FROM logs_v2 WHERE user_id = $1 ORDER BY date ASC`,
            [userId]
        );
        return rows.map(this.mapLog);
    }

    async getLatestUpdateTimestamp(userId: string): Promise<string | null> {
        const rows = await this.db.query<any>(
            `SELECT updated_at FROM logs_v2 WHERE user_id = $1 ORDER BY updated_at DESC LIMIT 1`,
            [userId]
        );
        const value = rows[0]?.updated_at;
        if (!value) return null;
        if (value instanceof Date) return value.toISOString();
        return String(value);
    }

    async deleteLogsByUserId(userId: string): Promise<void> {
        await this.db.query(`DELETE FROM logs_v2 WHERE user_id = $1`, [userId]);
    }

    private mapLog(row: any): LogV2 {
        return {
            ...row,
            date: row.date instanceof Date ? (() => {
                const d = row.date;
                const year = d.getFullYear();
                const month = String(d.getMonth() + 1).padStart(2, '0');
                const day = String(d.getDate()).padStart(2, '0');
                return `${year}-${month}-${day}`;
            })() : row.date,
            disturbances: typeof row.disturbances === 'string' ? JSON.parse(row.disturbances) : row.disturbances,
            symptoms: typeof row.symptoms === 'string' ? JSON.parse(row.symptoms) : row.symptoms,
            temperature: row.temperature != null ? Number(row.temperature) : null
        };
    }
}
