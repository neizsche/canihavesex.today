import type { Db } from '../db.js';

export interface NormalizedDay {
    id: string;
    user_id: string;
    date: string;
    cycle_start_date: string;
    cycle_day_index: number;
    has_log: number;
    bleeding: string | null;
    mucus_type: string | null;
    sensation: string | null;
    temperature: number | null;
    lh_test: string | null;
    sex: number | null;
    sleep_hours: number | null;
    illness: number | null;
    stress: number | null;
    notes: string | null;
    updated_at: string;
}

export interface EngineResult {
    id: string;
    user_id: string;
    cycle_id: string;
    cycle_start_date: string;
    as_of_date: string;
    engine_version: string;
    parameter_version: string;
    input_hash: string;
    output_json: string;
    created_at: string;
}

export interface EngineTrace {
    id: string;
    engine_result_id: string;
    trace_json: string;
    created_at: string;
}

export class EngineRepository {
    constructor(private db: Db) { }

    // Normalized Days
    async saveNormalizedDay(day: NormalizedDay): Promise<void> {
        await this.db.query(
            `insert into normalized_days (
        id, user_id, date, cycle_start_date, cycle_day_index, has_log,
        bleeding, mucus_type, sensation, temperature, lh_test,
        sex, sleep_hours, illness, stress, notes, updated_at
      ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
      on conflict(user_id, date) do update set
        cycle_start_date=excluded.cycle_start_date,
        cycle_day_index=excluded.cycle_day_index,
        has_log=excluded.has_log,
        bleeding=excluded.bleeding,
        mucus_type=excluded.mucus_type,
        sensation=excluded.sensation,
        temperature=excluded.temperature,
        lh_test=excluded.lh_test,
        sex=excluded.sex,
        sleep_hours=excluded.sleep_hours,
        illness=excluded.illness,
        stress=excluded.stress,
        notes=excluded.notes,
        updated_at=excluded.updated_at
      `,
            [
                day.id, day.user_id, day.date, day.cycle_start_date, day.cycle_day_index, day.has_log,
                day.bleeding, day.mucus_type, day.sensation, day.temperature, day.lh_test,
                day.sex, day.sleep_hours, day.illness, day.stress, day.notes, day.updated_at
            ]
        );
    }

    async findNormalizedDays(userId: string): Promise<NormalizedDay[]> {
        return await this.db.query<NormalizedDay>(
            'select * from normalized_days where user_id = $1 order by date asc',
            [userId]
        );
    }

    async deleteNormalizedDaysByUserId(userId: string): Promise<void> {
        await this.db.query('delete from normalized_days where user_id=$1', [userId]);
    }

    // Engine Results
    async saveResult(result: EngineResult): Promise<void> {
        await this.db.query(
            `insert into engine_results (
        id, user_id, cycle_id, cycle_start_date, as_of_date,
        engine_version, parameter_version, input_hash, output_json, created_at
      ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
            [
                result.id, result.user_id, result.cycle_id, result.cycle_start_date, result.as_of_date,
                result.engine_version, result.parameter_version, result.input_hash, result.output_json, result.created_at
            ]
        );
    }

    async getLatestResult(userId: string): Promise<EngineResult | undefined> {
        const rows = await this.db.query<EngineResult>(
            'select * from engine_results where user_id = $1 order by created_at desc limit 1',
            [userId]
        );
        return rows[0];
    }

    async deleteResultsByUserId(userId: string): Promise<void> {
        await this.db.query('delete from engine_results where user_id=$1', [userId]);
    }

    // Engine Traces
    async saveTrace(trace: EngineTrace): Promise<void> {
        await this.db.query(
            'insert into engine_traces (id, engine_result_id, trace_json, created_at) values ($1,$2,$3,$4)',
            [trace.id, trace.engine_result_id, trace.trace_json, trace.created_at]
        );
    }

    async deleteTracesByUserId(userId: string): Promise<void> {
        await this.db.query(
            'delete from engine_traces where engine_result_id in (select id from engine_results where user_id=$1)',
            [userId]
        );
    }

    // Personal Model
    async getPersonalModel(userId: string): Promise<{ meanLutealLength: number; meanCycleLength: number }> {
        const rows = await this.db.query<any>(
            'select mean_luteal_length as "meanLutealLength" from user_personal_model where user_id=$1',
            [userId]
        );
        const meanLutealLength = typeof rows[0]?.meanLutealLength === 'number' ? Number(rows[0].meanLutealLength) : 14;
        // phase 1: compute mean cycle length from history of cycle starts (from normalized days later); default 28
        const meanCycleLength = 28;
        return { meanLutealLength, meanCycleLength };
    }

    async savePersonalModel(userId: string, model: { meanOvulationDay: number; meanLutealLength: number; updatedAt: string }): Promise<void> {
        await this.db.query(
            `insert into user_personal_model (user_id, mean_ovulation_day, mean_luteal_length, updated_at)
       values ($1, $2, $3, $4)
       on conflict (user_id) do update set
         mean_ovulation_day=excluded.mean_ovulation_day,
         mean_luteal_length=excluded.mean_luteal_length,
         updated_at=excluded.updated_at`,
            [userId, model.meanOvulationDay, model.meanLutealLength, model.updatedAt]
        );
    }
}
