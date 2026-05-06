import { Db } from '../db.js';

export interface UserMeta {
    user_id: string; // UUID
    app_mode: 'prevent' | 'conceive';
    baseline_temp_avg: number;
    avg_cycle_length: number;
}

export class UserMetaRepository {
    constructor(private db: Db) { }

    async getUserMeta(userId: string): Promise<UserMeta> {
        const rows = await this.db.query<UserMeta>(`SELECT * FROM user_metadata WHERE user_id = $1`, [userId]);
        if (rows[0]) return rows[0];
        return { user_id: userId, app_mode: 'prevent', baseline_temp_avg: 36.5, avg_cycle_length: 28.0 };
    }

    async upsertMeta(meta: UserMeta): Promise<void> {
        await this.db.query(
            `INSERT INTO user_metadata (user_id, app_mode, baseline_temp_avg, avg_cycle_length)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (user_id) DO UPDATE SET
               app_mode = EXCLUDED.app_mode,
               baseline_temp_avg = EXCLUDED.baseline_temp_avg,
               avg_cycle_length = EXCLUDED.avg_cycle_length
            `,
            [meta.user_id, meta.app_mode, meta.baseline_temp_avg, meta.avg_cycle_length]
        );
    }

    /**
     * @deprecated Use migrate.ts for schema management.
     */
    async bootstrap(): Promise<void> {
        console.log('[Schema] UserMetaRepository.bootstrap is deprecated. Use migrate.ts');
    }
}
