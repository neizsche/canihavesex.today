import type { Db } from '../db.js';

export interface User {
    id: string;
    email: string;
    created_at: string;
}

export interface UserIdentity {
    id: string;
    user_id: string;
    provider: string;
    provider_user_id: string;
    email: string | null;
    created_at: string;
}

export class UserRepository {
    constructor(private db: Db) { }

    async findById(id: string): Promise<User | undefined> {
        const rows = await this.db.query<User>('select * from users where id = $1', [id]);
        return rows[0];
    }

    async findByEmail(email: string): Promise<User | undefined> {
        const rows = await this.db.query<User>('select * from users where email = $1', [email]);
        return rows[0];
    }

    async create(user: User): Promise<void> {
        await this.db.query(
            'insert into users (id, email, created_at) values ($1, $2, $3)',
            [user.id, user.email, user.created_at]
        );
    }

    async delete(id: string): Promise<void> {
        await this.db.query('delete from users where id = $1', [id]);
    }

    // Identity methods
    async findIdentityByProvider(provider: string, providerUserId: string): Promise<UserIdentity | undefined> {
        const rows = await this.db.query<UserIdentity>(
            'select * from user_identities where provider = $1 and provider_user_id = $2',
            [provider, providerUserId]
        );
        return rows[0];
    }

    async createIdentity(identity: UserIdentity): Promise<void> {
        await this.db.query(
            'insert into user_identities (id, user_id, provider, provider_user_id, email, created_at) values ($1, $2, $3, $4, $5, $6)',
            [identity.id, identity.user_id, identity.provider, identity.provider_user_id, identity.email, identity.created_at]
        );
    }

    async deleteIdentitiesByUserId(userId: string): Promise<void> {
        await this.db.query('delete from user_identities where user_id = $1', [userId]);
    }
}
