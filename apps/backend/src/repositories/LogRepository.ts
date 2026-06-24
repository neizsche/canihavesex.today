import { Db } from '../db.js';
import { randomUUID } from 'node:crypto';

export interface Log {
    id: string; // UUID
    user_id: string; // UUID
    date: string; // YYYY-MM-DD
    bleeding: 'none' | 'spotting' | 'light' | 'medium' | 'heavy' | null;
    temperature: number | null;
    mucus: 'dry' | 'sticky' | 'creamy' | 'watery' | 'eggwhite' | null;
    lh_test: 'positive' | 'negative' | null;
    disturbances: string[]; // JSONB
    symptoms: string[];     // JSONB
    notes: string | null;
    // Optional user-set period-start markers (migration #2). Absent/false → the
    // engine infers cycle starts from bleeding instead.
    cycle_start?: boolean;
    is_uncertain?: boolean;
    created_at: string;
}

export function logHasMeaningfulData(log: Pick<Log, 'bleeding' | 'temperature' | 'mucus' | 'lh_test' | 'disturbances' | 'symptoms' | 'notes'> | null | undefined): boolean {
    if (!log) return false;

    return (
        (!!log.bleeding && log.bleeding !== 'none') ||
        log.temperature != null ||
        !!log.mucus ||
        (!!log.lh_test && String(log.lh_test) !== 'notTaken') ||
        (Array.isArray(log.disturbances) && log.disturbances.length > 0) ||
        (Array.isArray(log.symptoms) && log.symptoms.length > 0) ||
        !!log.notes?.trim()
    );
}

export class LogRepository {
    constructor(private db: Db) { }

    async upsertLog(log: Omit<Log, 'created_at'>): Promise<void> {
        await this.db.query(
            `INSERT INTO logs (id, user_id, date, bleeding, temperature, mucus, lh_test, disturbances, symptoms, notes)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
             ON CONFLICT (user_id, date) DO UPDATE SET
               bleeding = EXCLUDED.bleeding,
               temperature = EXCLUDED.temperature,
               mucus = EXCLUDED.mucus,
               lh_test = EXCLUDED.lh_test,
               disturbances = EXCLUDED.disturbances,
               symptoms = EXCLUDED.symptoms,
               notes = EXCLUDED.notes
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
                log.notes ?? null
            ]
        );
    }

    async getLog(userId: string, date: string): Promise<Log | null> {
        const rows = await this.db.query<any>(
            `SELECT * FROM logs WHERE user_id = $1 AND date = $2`,
            [userId, date]
        );
        if (!rows[0]) return null;
        return mapLog(rows[0]);
    }

    async getAllLogs(userId: string): Promise<Log[]> {
        const rows = await this.db.query<any>(
            `SELECT * FROM logs WHERE user_id = $1 ORDER BY date ASC`,
            [userId]
        );
        return rows.map(mapLog);
    }

    async getRecentLogs(userId: string, limitDays: number = 90): Promise<Log[]> {
        const rows = await this.db.query<any>(
            `SELECT * FROM logs 
             WHERE user_id = $1 
             AND date >= CURRENT_DATE - (interval '1 day' * $2)
             ORDER BY date ASC`,
            [userId, limitDays]
        );
        return rows.map(mapLog);
    }

    async getLogsInRange(userId: string, start: string, end: string): Promise<Log[]> {
        const rows = await this.db.query<any>(
            `SELECT * FROM logs
             WHERE user_id = $1
             AND date >= $2 AND date <= $3
             ORDER BY date ASC`,
            [userId, start, end]
        );
        return rows.map(mapLog);
    }

    async getLogsSince(userId: string, date: string): Promise<Log[]> {
        const rows = await this.db.query<any>(
            `SELECT * FROM logs 
             WHERE user_id = $1 
             AND date >= $2
             ORDER BY date ASC`,
            [userId, date]
        );
        return rows.map(mapLog);
    }

    async getLatestUpdateTimestamp(userId: string): Promise<string | null> {
        const rows = await this.db.query<any>(
            `SELECT updated_at FROM logs WHERE user_id = $1 ORDER BY updated_at DESC LIMIT 1`,
            [userId]
        );
        const value = rows[0]?.updated_at;
        if (!value) return null;
        if (value instanceof Date) return value.toISOString();
        return String(value);
    }

    async deleteLogsByUserId(userId: string): Promise<void> {
        await this.db.query(`DELETE FROM logs WHERE user_id = $1`, [userId]);
    }

    async deleteLogByDate(userId: string, date: string): Promise<void> {
        await this.db.query(`DELETE FROM logs WHERE user_id = $1 AND date = $2`, [userId, date]);
    }

}

function mapLog(row: any): Log {
    return {
        ...row,
        // DATE → 'YYYY-MM-DD' string and NUMERIC → number are handled globally by
        // the pg type parsers (see db.ts); jsonb columns arrive already parsed.
        disturbances: Array.isArray(row.disturbances) ? row.disturbances : [],
        symptoms: Array.isArray(row.symptoms) ? row.symptoms : [],
        created_at: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
    };
}
