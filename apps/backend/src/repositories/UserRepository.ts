import type { Db } from '../db.js';

export interface User {
    id: string; // UUID
    email: string;
    password_hash?: string | null;
    created_at: string;
}

export interface UserIdentity {
    id: string; // UUID
    user_id: string; // UUID
    provider: string;
    provider_user_id: string;
    email: string | null;
    created_at: string;
}

export class UserRepository {
    constructor(private db: Db) { }

    async findById(id: string): Promise<User | undefined> {
        const rows = await this.db.query<User>('SELECT * FROM users WHERE id = $1', [id]);
        return rows[0];
    }

    async findByEmail(email: string): Promise<User | undefined> {
        const rows = await this.db.query<User>('SELECT * FROM users WHERE email = $1', [email]);
        return rows[0];
    }

    async create(user: User): Promise<void> {
        await this.db.query(
            'INSERT INTO users (id, email, created_at) VALUES ($1, $2, $3)',
            [user.id, user.email, user.created_at || new Date().toISOString()]
        );
    }

    async setPassword(userId: string, passwordHash: string): Promise<void> {
        await this.db.query('UPDATE users SET password_hash = $1 WHERE id = $2', [passwordHash, userId]);
    }

    async delete(id: string): Promise<void> {
        await this.db.query('DELETE FROM users WHERE id = $1', [id]);
    }

    // Identity methods
    async findIdentityByProvider(provider: string, providerUserId: string): Promise<UserIdentity | undefined> {
        const rows = await this.db.query<UserIdentity>(
            'SELECT * FROM user_identities WHERE provider = $1 AND provider_user_id = $2',
            [provider, providerUserId]
        );
        return rows[0];
    }

    async createIdentity(identity: UserIdentity): Promise<void> {
        await this.db.query(
            'INSERT INTO user_identities (id, user_id, provider, provider_user_id, email, created_at) VALUES ($1, $2, $3, $4, $5, $6)',
            [identity.id, identity.user_id, identity.provider, identity.provider_user_id, identity.email, identity.created_at || new Date().toISOString()]
        );
    }

    async deleteIdentitiesByUserId(userId: string): Promise<void> {
        await this.db.query('DELETE FROM user_identities WHERE user_id = $1', [userId]);
    }
}
