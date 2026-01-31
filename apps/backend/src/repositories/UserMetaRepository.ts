import { Db } from '../db.js';

export interface UserMetaV2 {
    user_id: string;
    app_mode: 'prevent' | 'conceive';
    baseline_temp_avg: number;
    avg_cycle_length: number;
}

export class UserMetaRepository {
    constructor(private db: Db) { }

    async getUserMeta(userId: string): Promise<UserMetaV2> {
        const rows = await this.db.query<UserMetaV2>(`SELECT * FROM user_meta_v2 WHERE user_id = $1`, [userId]);
        if (rows[0]) return rows[0];
        return { user_id: userId, app_mode: 'prevent', baseline_temp_avg: 36.5, avg_cycle_length: 28.0 };
    }

    async upsertMeta(meta: UserMetaV2): Promise<void> {
        await this.db.query(
            `INSERT INTO user_meta_v2 (user_id, app_mode, baseline_temp_avg, avg_cycle_length)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (user_id) DO UPDATE SET
               app_mode = EXCLUDED.app_mode,
               baseline_temp_avg = EXCLUDED.baseline_temp_avg,
               avg_cycle_length = EXCLUDED.avg_cycle_length
            `,
            [meta.user_id, meta.app_mode, meta.baseline_temp_avg, meta.avg_cycle_length]
        );
    }

    async bootstrap(): Promise<void> {
        const queries = [
            `CREATE TABLE IF NOT EXISTS logs_v2 (
        id UUID PRIMARY KEY,
        user_id UUID NOT NULL,
        date DATE NOT NULL,
        bleeding TEXT,
        temperature DECIMAL(5,2),
        mucus TEXT,
        lh_test TEXT,
        disturbances JSONB DEFAULT '[]',
        symptoms JSONB DEFAULT '[]',
        notes TEXT,
        created_at TIMESTAMP,
        updated_at TIMESTAMP,
        UNIQUE(user_id, date)
      );`,
            `CREATE TABLE IF NOT EXISTS cycles_v2 (
        id UUID PRIMARY KEY,
        user_id UUID NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL, -- Completed cycles MUST have end_date
        ovulation_prediction DATE,
        ovulation_confirmed_date DATE,
        length INTEGER,
        period_length INTEGER,
        analysis_flags JSONB DEFAULT '[]'
      );`,
            `CREATE TABLE IF NOT EXISTS active_cycles_v2 (
        id UUID PRIMARY KEY,
        user_id UUID NOT NULL UNIQUE, -- Only one active cycle per user
        start_date DATE NOT NULL,
        end_date DATE, -- Can be null here
        ovulation_prediction DATE,
        ovulation_confirmed_date DATE,
        length INTEGER,
        period_length INTEGER,
        analysis_flags JSONB DEFAULT '[]'
      );`,
            `CREATE TABLE IF NOT EXISTS daily_status_v2 (
        id UUID PRIMARY KEY,
        user_id UUID NOT NULL,
        date DATE NOT NULL,
        fertility_status TEXT NOT NULL,
        phase TEXT NOT NULL,
        is_predicted BOOLEAN NOT NULL,
        insights_payload JSONB NOT NULL,
        engine_version TEXT NOT NULL,
        updated_at TIMESTAMP,
        UNIQUE(user_id, date)
      );`,
            `CREATE TABLE IF NOT EXISTS user_meta_v2 (
        user_id UUID PRIMARY KEY,
        app_mode TEXT DEFAULT 'prevent',
        baseline_temp_avg DECIMAL(5,2) DEFAULT 36.5,
        avg_cycle_length DECIMAL(5,2) DEFAULT 28.0
      );`
        ];

        for (const q of queries) {
            await this.db.exec(q);
        }
        console.log('[Schema] V5 Tables Bootstrapped.');
    }
}
