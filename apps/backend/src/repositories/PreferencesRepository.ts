import type { Db } from '../db.js';

export interface UserPreferences {
    user_id: string;
    theme: 'light' | 'dark';
    updated_at: string;
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
}
