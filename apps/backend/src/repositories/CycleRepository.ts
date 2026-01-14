import type { Db } from '../db.js';

export interface Cycle {
    id: string;
    user_id: string;
    start_date: string;
    state: string; // e.g., 'INFERTILE_PRE', 'FERTILE_OPEN', etc.
    peak_date: string | null;
    temp_shift_confirmed_date: string | null;
    created_at: string;
}

export class CycleRepository {
    constructor(private db: Db) { }

    async create(cycle: Cycle): Promise<void> {
        await this.db.query(
            'insert into cycles (id, user_id, start_date, state, peak_date, temp_shift_confirmed_date, created_at) values ($1, $2, $3, $4, $5, $6, $7)',
            [cycle.id, cycle.user_id, cycle.start_date, cycle.state, cycle.peak_date, cycle.temp_shift_confirmed_date, cycle.created_at]
        );
    }

    async findByUserId(userId: string): Promise<Cycle[]> {
        return await this.db.query<Cycle>(
            'select * from cycles where user_id = $1 order by start_date desc',
            [userId]
        );
    }

    async findById(id: string): Promise<Cycle | undefined> {
        const rows = await this.db.query<Cycle>(
            'select * from cycles where id = $1',
            [id]
        );
        return rows[0];
    }

    async findCurrent(userId: string): Promise<Cycle | undefined> {
        const rows = await this.db.query<Cycle>(
            'select * from cycles where user_id = $1 order by start_date desc limit 1',
            [userId]
        );
        return rows[0];
    }

    async update(id: string, updates: Partial<Cycle>): Promise<void> {
        // Helper to dynamically build update query is not really needed for simple cases,
        // but here we might only update specific fields.
        // For now, let's implement specific update methods or a simple dynamic one if needed.
        // Since we primarily update state/dates, let's allow updating those.

        // Simple implementation for specific known fields updates could be better for safety.
        // But let's support general updates for typical fields.

        const fields: string[] = [];
        const values: any[] = [];
        let idx = 1;

        if (updates.state !== undefined) {
            fields.push(`state = $${idx++}`);
            values.push(updates.state);
        }
        if (updates.peak_date !== undefined) {
            fields.push(`peak_date = $${idx++}`);
            values.push(updates.peak_date);
        }
        if (updates.temp_shift_confirmed_date !== undefined) {
            fields.push(`temp_shift_confirmed_date = $${idx++}`);
            values.push(updates.temp_shift_confirmed_date);
        }

        if (fields.length === 0) return;

        values.push(id);
        await this.db.query(
            `update cycles set ${fields.join(', ')} where id = $${idx}`,
            values
        );
    }

    async deleteByUserId(userId: string): Promise<void> {
        await this.db.query('delete from cycles where user_id = $1', [userId]);
    }
}
