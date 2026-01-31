import type { Db } from '../db.js';

export interface UserPreferences {
    user_id: string;
    theme: 'light' | 'dark';
    intent?: 'avoid_pregnancy' | 'conceive' | 'understand_cycle' | null;
    cycle_regularity?: 'regular' | 'irregular' | 'unsure' | null;
    context_flags?: string | null; // JSON array
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

export interface OnboardingData {
    intent: 'avoid_pregnancy' | 'conceive' | 'understand_cycle';
    cycle_regularity: 'regular' | 'irregular' | 'unsure';
    context_flags: string[];
    last_period_start: string;
    typical_cycle_length?: number | null;
}

export class PreferencesRepository {
    constructor(private db: Db) { }

    async findByUserId(userId: string): Promise<UserPreferences | undefined> {
        const rows = await this.db.query<UserPreferences>(
            'select * from user_preferences where user_id = $1',
            [userId]
        );
        return rows[0];
    }

    async createDefault(userId: string): Promise<UserPreferences> {
        const now = new Date().toISOString();
        const prefs: UserPreferences = {
            user_id: userId,
            theme: 'dark', // Default to dark mode
            updated_at: now
        };

        await this.db.query(
            'insert into user_preferences (user_id, theme, updated_at) values ($1, $2, $3)',
            [prefs.user_id, prefs.theme, prefs.updated_at]
        );

        return prefs;
    }

    async updateTheme(userId: string, theme: 'light' | 'dark'): Promise<void> {
        const now = new Date().toISOString();
        await this.db.query(
            'update user_preferences set theme = $1, updated_at = $2 where user_id = $3',
            [theme, now, userId]
        );
    }

    async deleteByUserId(userId: string): Promise<void> {
        await this.db.query('delete from user_preferences where user_id = $1', [userId]);
    }

    async deletePreferencesByUserId(userId: string): Promise<void> {
        await this.deleteByUserId(userId);
    }

    async completeOnboarding(userId: string, data: { intent: string; cycle_regularity: string; context_flags: string[] }): Promise<void> {
        const now = new Date().toISOString();
        const contextFlagsJson = JSON.stringify(data.context_flags);

        await this.db.query(
            `update user_preferences 
             set intent = $1, cycle_regularity = $2, context_flags = $3, 
                 onboarding_completed_at = $4, 
                 education_global_shown_at = $4,
                 education_mucus_shown_at = $4,
                 education_bbt_shown_at = $4,
                 education_lh_shown_at = $4,
                 updated_at = $5 
             where user_id = $6`,
            [data.intent, data.cycle_regularity, contextFlagsJson, now, now, userId]
        );
    }

    async hasCompletedOnboarding(userId: string): Promise<boolean> {
        const rows = await this.db.query<{ onboarding_completed_at: string | null }>(
            'select onboarding_completed_at from user_preferences where user_id = $1',
            [userId]
        );
        return !!(rows[0]?.onboarding_completed_at);
    }

    async getOnboardingData(userId: string): Promise<{ intent: string | null; cycle_regularity: string | null; context_flags: string[] }> {
        const rows = await this.db.query<UserPreferences>(
            'select intent, cycle_regularity, context_flags from user_preferences where user_id = $1',
            [userId]
        );

        const prefs = rows[0];
        return {
            intent: prefs?.intent ?? null,
            cycle_regularity: prefs?.cycle_regularity ?? null,
            context_flags: prefs?.context_flags ? JSON.parse(prefs.context_flags) : []
        };
    }

    async getEducationState(userId: string): Promise<EducationState> {
        const rows = await this.db.query<UserPreferences>(
            `select education_global_shown_at, education_mucus_shown_at, 
                    education_bbt_shown_at, education_lh_shown_at 
             from user_preferences where user_id = $1`,
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

    async markEducationShown(userId: string, type: 'global' | 'mucus' | 'bbt' | 'lh'): Promise<void> {
        const now = new Date().toISOString();
        const columnMap = {
            global: 'education_global_shown_at',
            mucus: 'education_mucus_shown_at',
            bbt: 'education_bbt_shown_at',
            lh: 'education_lh_shown_at'
        };

        const column = columnMap[type];
        await this.db.query(
            `update user_preferences set ${column} = $1, updated_at = $2 where user_id = $3`,
            [now, now, userId]
        );
    }
}
