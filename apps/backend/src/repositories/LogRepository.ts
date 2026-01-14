import type { Db } from '../db.js';

export interface DailyLog {
    id: string;
    user_id: string;
    cycle_id: string;
    date: string;
    mucus_type: string;
    sensation: string;
    bleeding: string;
    temperature: number | null;
    lh_test: string;
    sick: number;
    bad_sleep: number;
    alcohol: number;
    created_at: string;
}

export interface RawLog {
    id: string;
    user_id: string;
    date: string;
    payload_json: string;
    source: string;
    created_at: string;
}

export class LogRepository {
    constructor(private db: Db) { }

    // Daily Logs
    async createDailyLog(log: DailyLog): Promise<void> {
        await this.db.query(
            `insert into daily_logs (
        id, user_id, cycle_id, date, mucus_type, sensation, bleeding, 
        temperature, lh_test, sick, bad_sleep, alcohol, created_at
      ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      on conflict(user_id, date) do update set
        cycle_id=excluded.cycle_id,
        mucus_type=excluded.mucus_type,
        sensation=excluded.sensation,
        bleeding=excluded.bleeding,
        temperature=excluded.temperature,
        lh_test=excluded.lh_test,
        sick=excluded.sick,
        bad_sleep=excluded.bad_sleep,
        alcohol=excluded.alcohol,
        created_at=excluded.created_at
      `,
            [
                log.id, log.user_id, log.cycle_id, log.date, log.mucus_type, log.sensation, log.bleeding,
                log.temperature, log.lh_test, log.sick, log.bad_sleep, log.alcohol, log.created_at
            ]
        );
    }

    async findDailyLogs(userId: string): Promise<DailyLog[]> {
        return await this.db.query<DailyLog>(
            'select * from daily_logs where user_id = $1 order by date desc',
            [userId]
        );
    }

    async findDailyLogsByCycleId(cycleId: string): Promise<DailyLog[]> {
        return await this.db.query<DailyLog>(
            'select * from daily_logs where cycle_id = $1 order by date asc',
            [cycleId]
        );
    }

    async deleteDailyLogsByUserId(userId: string): Promise<void> {
        await this.db.query('delete from daily_logs where user_id = $1', [userId]);
    }

    // Raw Logs
    async createRawLog(log: RawLog): Promise<void> {
        await this.db.query(
            'insert into raw_logs (id, user_id, date, payload_json, source, created_at) values ($1, $2, $3, $4, $5, $6)',
            [log.id, log.user_id, log.date, log.payload_json, log.source, log.created_at]
        );
    }

    async findRawLogs(userId: string): Promise<RawLog[]> {
        return await this.db.query<RawLog>(
            'select * from raw_logs where user_id = $1 order by date asc, created_at asc',
            [userId]
        );
    }

    async deleteRawLogsByUserId(userId: string): Promise<void> {
        await this.db.query('delete from raw_logs where user_id = $1', [userId]);
    }

    async deleteRawLogsBySource(userId: string, source: string): Promise<void> {
        await this.db.query('delete from raw_logs where user_id = $1 and source = $2', [userId, source]);
    }

    async deleteRawLogsFromDate(userId: string, fromDate: string): Promise<void> {
        await this.db.query('delete from raw_logs where user_id = $1 and date >= $2', [userId, fromDate]);
    }
}
