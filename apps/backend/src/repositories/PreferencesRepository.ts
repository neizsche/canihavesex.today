import type { Db } from '../db.js';

export interface UserPreferences {
    user_id: string; // UUID
    theme: 'light' | 'dark';
    intent?: 'avoid_pregnancy' | 'conceive' | 'understand_cycle' | null;
    cycle_regularity?: 'regular' | 'irregular' | 'unsure' | null;
    context_flags?: string[] | null; // Now handled as array/JSONB
    onboarding_completed_at?: string | null;
    education_global_shown_at?: string | null;
    education_mucus_shown_at?: string | null;
    education_bbt_shown_at?: string | null;
    education_lh_shown_at?: string | null;
    updated_at: string;
}

export interface EducationState {
    global_shown: boolean;
    mucus_shown: boolean;
    bbt_shown: boolean;
    lh_shown: boolean;
}

export class PreferencesRepository {
    constructor(private db: Db) { }

    async findByUserId(userId: string): Promise<UserPreferences | undefined> {
        const rows = await this.db.query<any>(
            'SELECT * FROM user_preferences WHERE user_id = $1',
            [userId]
        );
        if (!rows[0]) return undefined;
        return this.mapPreferences(rows[0]);
    }

    async createDefault(userId: string): Promise<UserPreferences> {
        const now = new Date().toISOString();
        await this.db.query(
            'INSERT INTO user_preferences (user_id, theme, updated_at) VALUES ($1, $2, $3)',
            [userId, 'dark', now]
        );

        return {
            user_id: userId,
            theme: 'dark',
            updated_at: now
        };
    }

    async updateTheme(userId: string, theme: 'light' | 'dark'): Promise<void> {
        await this.db.query(
            'UPDATE user_preferences SET theme = $1 WHERE user_id = $2',
            [theme, userId]
        );
    }

    async deleteByUserId(userId: string): Promise<void> {
        await this.db.query('DELETE FROM user_preferences WHERE user_id = $1', [userId]);
    }

    async deletePreferencesByUserId(userId: string): Promise<void> {
        await this.deleteByUserId(userId);
    }

    async completeOnboarding(userId: string, data: { intent: string; cycle_regularity: string; context_flags: string[] }): Promise<void> {
        const now = new Date().toISOString();
        const contextFlagsJson = JSON.stringify(data.context_flags);

        await this.db.query(
            `UPDATE user_preferences 
             SET intent = $1, cycle_regularity = $2, context_flags = $3, 
                 onboarding_completed_at = $4, 
                 education_global_shown_at = $4,
                 education_mucus_shown_at = $4,
                 education_bbt_shown_at = $4,
                 education_lh_shown_at = $4
             WHERE user_id = $5`,
            [data.intent, data.cycle_regularity, contextFlagsJson, now, userId]
        );
    }

    async hasCompletedOnboarding(userId: string): Promise<boolean> {
        const rows = await this.db.query<{ onboarding_completed_at: string | null }>(
            'SELECT onboarding_completed_at FROM user_preferences WHERE user_id = $1',
            [userId]
        );
        return !!(rows[0]?.onboarding_completed_at);
    }

    async getOnboardingData(userId: string): Promise<{ intent: string | null; cycle_regularity: string | null; context_flags: string[] }> {
        const rows = await this.db.query<any>(
            'SELECT intent, cycle_regularity, context_flags FROM user_preferences WHERE user_id = $1',
            [userId]
        );

        const prefs = rows[0];
        return {
            intent: prefs?.intent ?? null,
            cycle_regularity: prefs?.cycle_regularity ?? null,
            context_flags: Array.isArray(prefs?.context_flags) 
                ? prefs.context_flags 
                : (prefs?.context_flags ? JSON.parse(prefs.context_flags) : [])
        };
    }

    async getEducationState(userId: string): Promise<EducationState> {
        const rows = await this.db.query<any>(
            `SELECT education_global_shown_at, education_mucus_shown_at, 
                    education_bbt_shown_at, education_lh_shown_at 
             FROM user_preferences WHERE user_id = $1`,
            [userId]
        );

        const prefs = rows[0];
        return {
            global_shown: !!(prefs?.education_global_shown_at),
            mucus_shown: !!(prefs?.education_mucus_shown_at),
            bbt_shown: !!(prefs?.education_bbt_shown_at),
            lh_shown: !!(prefs?.education_lh_shown_at)
        };
    }

    async updateProfile(userId: string, data: { cycle_regularity?: string; context_flags?: string[] }): Promise<void> {
        const setClauses: string[] = [];
        const values: any[] = [];
        let idx = 1;

        if (data.cycle_regularity !== undefined) {
            setClauses.push(`cycle_regularity = $${idx++}`);
            values.push(data.cycle_regularity);
        }
        if (data.context_flags !== undefined) {
            setClauses.push(`context_flags = $${idx++}`);
            values.push(JSON.stringify(data.context_flags));
        }

        if (setClauses.length === 0) return;

        values.push(userId);
        await this.db.query(
            `UPDATE user_preferences SET ${setClauses.join(', ')} WHERE user_id = $${idx}`,
            values
        );
    }

    async markEducationShown(userId: string, type: 'global' | 'mucus' | 'bbt' | 'lh'): Promise<void> {
        const columnMap = {
            global: 'education_global_shown_at',
            mucus: 'education_mucus_shown_at',
            bbt: 'education_bbt_shown_at',
            lh: 'education_lh_shown_at'
        };

        const column = columnMap[type];
        await this.db.query(
            `UPDATE user_preferences SET ${column} = NOW() WHERE user_id = $1`,
            [userId]
        );
    }

    private mapPreferences(row: any): UserPreferences {
        return {
            ...row,
            context_flags: Array.isArray(row.context_flags) 
                ? row.context_flags 
                : (row.context_flags ? JSON.parse(row.context_flags) : []),
            updated_at: row.updated_at instanceof Date ? row.updated_at.toISOString() : row.updated_at
        };
    }
}
