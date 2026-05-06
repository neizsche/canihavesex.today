import { FastifyInstance } from 'fastify';
import { randomUUID } from 'node:crypto';
import { UserRepository } from '../repositories/UserRepository.js';
import { LogRepository } from '../repositories/LogRepository.js';
import { CycleRepository } from '../repositories/CycleRepository.js';
import { DailyStatusRepository } from '../repositories/DailyStatusRepository.js';
import { PreferencesRepository } from '../repositories/PreferencesRepository.js';
import { UserMetaRepository } from '../repositories/UserMetaRepository.js';
import { ApiKeyRepository } from '../repositories/ApiKeyRepository.js';
import { generateApiKey } from '../apiKeys.js';

import { z } from 'zod';
import { ZodTypeProvider } from 'fastify-type-provider-zod';

export async function userRoutes(fastify: FastifyInstance, opts: { db: any }) {
    const app = fastify.withTypeProvider<ZodTypeProvider>();
    const logRepo = new LogRepository(opts.db);
    const cycleRepo = new CycleRepository(opts.db);
    const statusRepo = new DailyStatusRepository(opts.db);
    const prefRepo = new PreferencesRepository(opts.db);
    const apiKeyRepo = new ApiKeyRepository(opts.db);

    // PATCH /api/v1/user/preferences
    app.patch('/api/v1/user/preferences', {
        schema: {
            body: z.object({
                intent: z.string(),
                cycle_regularity: z.string(),
                context_flags: z.array(z.string()).optional(),
                last_period_start: z.string(),
                cycle_length_min: z.number().optional(),
                cycle_length_max: z.number().optional()
            })
        }
    }, async (req, reply) => {
        const userId = (req as any).userId;
        const body = req.body;

        const { intent, cycle_regularity, context_flags, last_period_start, cycle_length_min, cycle_length_max } = body;

        if (!intent || !cycle_regularity || !last_period_start) {
            return reply.status(400).send({ error: 'Missing required fields' });
        }

        // 1. Save Preferences
        await prefRepo.completeOnboarding(userId, {
            intent,
            cycle_regularity,
            context_flags: context_flags || []
        });

        // 2. Update User Meta (Avg Cycle Length)
        // Calculate average if range provided, else default to 28
        let avgLength = 28;
        if (cycle_length_min && cycle_length_max) {
            avgLength = (cycle_length_min + cycle_length_max) / 2;
        }

        const metaRepo = new UserMetaRepository(opts.db);
        await metaRepo.upsertMeta({
            user_id: userId,
            app_mode: intent === 'conceive' ? 'conceive' : 'prevent',
            baseline_temp_avg: 36.5,
            avg_cycle_length: avgLength
        });

        // 3. Create Initial Active Cycle
        // We assume the last period start is the start of the current cycle
        const cycleId = randomUUID();
        await cycleRepo.upsertCycles([{
            id: cycleId,
            user_id: userId,
            start_date: last_period_start,
            end_date: null, // Active
            ovulation_prediction: null, // Engine will fill
            ovulation_confirmed_date: null,
            length: null,
            period_length: null,
            analysis_flags: []
        }]);

        return { ok: true };
    });

    const deleteAllData = async (userId: string) => {
        await logRepo.deleteLogsByUserId(userId);
        await statusRepo.deleteStatusByUserId(userId);
        await cycleRepo.deleteCyclesByUserId(userId);

        // Reset Onboarding & Preferences
        await prefRepo.deletePreferencesByUserId(userId);
        await prefRepo.createDefault(userId);

        // Reset User Meta
        const metaRepo = new UserMetaRepository(opts.db);
        await metaRepo.upsertMeta({
            user_id: userId,
            app_mode: 'prevent',
            baseline_temp_avg: 36.5,
            avg_cycle_length: 28.0
        });
    }

    // DELETE /api/v1/user/data (Delete All Data)
    app.delete('/api/v1/user/data', async (req, reply) => {
        const userId = (req as any).userId;
        await deleteAllData(userId);
        return { ok: true, message: 'All data deleted' };
    });

    // DELETE /api/v1/user/account (Full Account Delete)
    app.delete('/api/v1/user/account', async (req, reply) => {
        const userId = (req as any).userId;

        // 1. Delete all application data (logs, cycles, status)
        await deleteAllData(userId);

        // 2. Delete User Identity & Account
        const userRepo = new UserRepository(opts.db);

        await userRepo.deleteIdentitiesByUserId(userId);
        await userRepo.delete(userId);

        // 3. Logout (Clear Cookie)
        reply.clearCookie('uid', { path: '/' });

        return { ok: true, message: 'Account deleted' };
    });

    // GET /api/v1/keys (List API keys)
    app.get('/api/v1/keys', async (req, reply) => {
        const userId = (req as any).userId;
        const keys = await apiKeyRepo.listByUserId(userId);
        return {
            keys: keys.map((key) => ({
                id: key.id,
                name: key.name,
                keyPrefix: key.key_prefix,
                createdAt: key.created_at,
                lastUsedAt: key.last_used_at,
                revokedAt: key.revoked_at
            }))
        };
    });

    // POST /api/v1/keys (Create API key)
    app.post('/api/v1/keys', {
        schema: {
            body: z.object({
                name: z.string().nullable().optional(),
                regenerate: z.boolean().optional()
            }).optional().default({})
        }
    }, async (req, reply) => {
        const userId = (req as any).userId;
        const body = req.body;
        const nameRaw = typeof body.name === 'string' ? body.name.trim() : '';
        const name = nameRaw || `Apple Shortcut ${new Date().toISOString().slice(0, 10)}`;

        if (body.regenerate) {
            await apiKeyRepo.revokeAllByUserId(userId);
        }

        const { token, hash, prefix } = generateApiKey();
        const id = randomUUID();
        const createdAt = new Date().toISOString();

        await apiKeyRepo.create({
            id,
            user_id: userId,
            name,
            key_hash: hash,
            key_prefix: prefix,
            created_at: createdAt
        });

        return {
            key: token,
            keyId: id,
            keyPrefix: prefix,
            name,
            createdAt
        };
    });

    // DELETE /api/v1/keys/:id (Revoke API key)
    app.delete('/api/v1/keys/:id', {
        schema: {
            params: z.object({
                id: z.string()
            })
        }
    }, async (req, reply) => {
        const userId = (req as any).userId;
        const keyId = req.params.id;
        await apiKeyRepo.revokeById(userId, keyId);
        return { ok: true };
    });
}
