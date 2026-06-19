import { FastifyInstance } from 'fastify';
import { randomUUID } from 'node:crypto';
import { UserRepository } from '../repositories/UserRepository.js';
import { LogRepository } from '../repositories/LogRepository.js';
import { CycleRepository } from '../repositories/CycleRepository.js';
import { DailyStatusRepository } from '../repositories/DailyStatusRepository.js';
import { SettingsRepository } from '../repositories/SettingsRepository.js';
import { ApiKeyRepository } from '../repositories/ApiKeyRepository.js';
import { EngineService } from '../services/EngineService.js';
import { generateApiKey } from '../apiKeys.js';
import { cacheService } from '../services/CacheService.js';
import { addDaysIso, isoToday } from '../utils/dates.js';

import { z } from 'zod';
import { ZodTypeProvider } from 'fastify-type-provider-zod';

export async function userRoutes(fastify: FastifyInstance, opts: { db: any }) {
    const app = fastify.withTypeProvider<ZodTypeProvider>();
    const logRepo = new LogRepository(opts.db);
    const cycleRepo = new CycleRepository(opts.db);
    const statusRepo = new DailyStatusRepository(opts.db);
    const settingsRepo = new SettingsRepository(opts.db);
    const apiKeyRepo = new ApiKeyRepository(opts.db);
    const engineService = new EngineService(opts.db);

    // PATCH /api/v1/user/preferences — completes onboarding
    app.patch('/api/v1/user/preferences', {
        schema: {
            body: z.object({
                intent: z.enum(['avoid_pregnancy', 'conceive', 'understand_cycle']),
                cycle_regularity: z.enum(['regular', 'irregular', 'unsure']),
                context_flags: z.array(z.string()).max(20).optional(),
                last_period_start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD'),
                cycle_length_min: z.number().int().min(18).max(45).optional(),
                cycle_length_max: z.number().int().min(18).max(45).optional()
            })
        }
    }, async (req, reply) => {
        const userId = req.userId!;
        const body = req.body;

        const { intent, cycle_regularity, context_flags } = body;
        let { last_period_start, cycle_length_min, cycle_length_max } = body;

        // Normalize: last_period_start cannot be in the future (clamp to today).
        const today = isoToday();
        if (last_period_start > today) {
            last_period_start = today;
        }

        // Normalize: ensure min <= max when both supplied.
        if (cycle_length_min && cycle_length_max && cycle_length_min > cycle_length_max) {
            [cycle_length_min, cycle_length_max] = [cycle_length_max, cycle_length_min];
        }

        let avgLength = 28;
        if (cycle_length_min && cycle_length_max) {
            avgLength = (cycle_length_min + cycle_length_max) / 2;
        }

        // Use transaction for atomic onboarding. Idempotent: re-running onboarding
        // (e.g. a client retry after a perceived failure) must not duplicate state.
        const sessionData = await opts.db.transaction(async (txDb: any) => {
            const txSettings = new SettingsRepository(txDb);
            const txCycle = new CycleRepository(txDb);
            const txUser = new UserRepository(txDb);

            // 1. Persist onboarding answers + avg cycle length in a single upsert
            // (previously two writes across user_preferences and user_metadata).
            await txSettings.completeOnboarding(userId, {
                intent,
                cycle_regularity,
                context_flags: context_flags || [],
                avgCycleLength: avgLength,
            });

            // 2. Create/Update Initial Active Cycle.
            // Reuse the existing active cycle (no end_date) instead of always
            // inserting a fresh UUID — otherwise a retry leaves duplicate active cycles.
            const existingCycles = await txCycle.getCycleHistory(userId);
            const activeCycle = existingCycles.find((c) => !c.end_date);
            const cycleId = activeCycle?.id ?? randomUUID();

            await txCycle.upsertCycles([{
                id: cycleId,
                user_id: userId,
                start_date: last_period_start,
                end_date: null,
                ovulation_prediction: null,
                ovulation_confirmed_date: null,
                length: null,
                period_length: activeCycle?.period_length ?? null,
                analysis_flags: []
            }]);

            // 3. Get User data for session update
            const user = await txUser.findById(userId);

            return {
                userId,
                email: user?.email ?? null,
                onboardingCompleted: true
            };
        });

        cacheService.invalidateUser(userId);
        return sessionData;
    });

    // GET /api/v1/user/profile — Load full profile for settings screen
    app.get('/api/v1/user/profile', async (req, reply) => {
        const userId = req.userId!;

        const [settings, cycles] = await Promise.all([
            settingsRepo.getSettings(userId),
            cycleRepo.getCycleHistory(userId)
        ]);

        // Find the active cycle (no end_date) for last_period_start
        const activeCycle = cycles.find(c => !c.end_date);
        // Find latest completed cycle for period_length
        const latestCompleted = cycles.find(c => c.end_date && c.period_length);

        return {
            cycle_regularity: settings.cycle_regularity,
            context_flags: settings.context_flags,
            intent: settings.intent,
            avg_cycle_length: Number(settings.avg_cycle_length),
            last_period_start: activeCycle?.start_date ?? null,
            period_length: activeCycle?.period_length ?? latestCompleted?.period_length ?? 5,
            show_branding: settings.show_branding ?? true,
            theme: settings.theme ?? 'dark',
        };
    });

    // PATCH /api/v1/user/profile — Partial updates from settings
    app.patch('/api/v1/user/profile', {
        schema: {
            body: z.object({
                cycle_regularity: z.enum(['regular', 'irregular', 'unsure']).optional(),
                context_flags: z.array(z.string()).optional(),
                avg_cycle_length: z.number().min(18).max(45).optional(),
                last_period_start: z.string().optional(),
                period_length: z.number().min(1).max(10).optional(),
                show_branding: z.boolean().optional(),
                theme: z.enum(['light', 'dark']).optional(),
            })
        }
    }, async (req, reply) => {
        const userId = req.userId!;
        const body = req.body;

        let engineTriggerNeeded = false;

        // 1. Settings updates (regularity, context_flags, avg_cycle_length).
        const profilePatch: { cycle_regularity?: string; context_flags?: string[]; avg_cycle_length?: number } = {};
        if (body.cycle_regularity !== undefined) profilePatch.cycle_regularity = body.cycle_regularity;
        if (body.context_flags !== undefined) profilePatch.context_flags = body.context_flags;
        if (body.avg_cycle_length !== undefined) {
            profilePatch.avg_cycle_length = body.avg_cycle_length;
            engineTriggerNeeded = true;
        }
        if (Object.keys(profilePatch).length > 0) {
            await settingsRepo.updateProfile(userId, profilePatch);
        }

        // 1b. Update show_branding (discreet mode)
        if (body.show_branding !== undefined) {
            await settingsRepo.updateShowBranding(userId, body.show_branding);
        }

        // 1c. Update theme (light/dark)
        if (body.theme !== undefined) {
            await settingsRepo.updateTheme(userId, body.theme);
        }

        // 2. Cycle edits (last_period_start, period_length). Read the history
        // once, mutate in memory, and write once — this previously re-read the
        // full cycle history up to three times in a single request.
        if (body.last_period_start !== undefined || body.period_length !== undefined) {
            const cycles = await cycleRepo.getCycleHistory(userId);
            const activeCycle = cycles.find(c => !c.end_date);
            if (activeCycle) {
                const cyclesToUpsert = [activeCycle];

                if (body.last_period_start !== undefined) {
                    const activeCycleIdx = cycles.indexOf(activeCycle);
                    const prevCycle = cycles[activeCycleIdx + 1];
                    activeCycle.start_date = body.last_period_start;
                    if (prevCycle) {
                        prevCycle.end_date = addDaysIso(body.last_period_start, -1);
                        cyclesToUpsert.push(prevCycle);
                    }
                }

                if (body.period_length !== undefined) {
                    activeCycle.period_length = body.period_length;
                }

                await cycleRepo.upsertCycles(cyclesToUpsert);
                engineTriggerNeeded = true;
            }
        }

        // 3. Recompute so cached statuses don't go stale.
        if (engineTriggerNeeded) {
            try {
                await engineService.recompute(userId, isoToday());
            } catch (err) {
                app.log.error(err, '[userRoute] Profile update engine trigger error');
            }
        }

        cacheService.invalidateUser(userId);
        return { ok: true };
    });

    const deleteAllData = async (userId: string) => {
        await logRepo.deleteLogsByUserId(userId);
        await statusRepo.deleteStatusByUserId(userId);
        await cycleRepo.deleteCyclesByUserId(userId);

        // Reset settings (preferences + engine baselines) back to defaults.
        await settingsRepo.deleteByUserId(userId);
        await settingsRepo.createDefault(userId);
    }

    // DELETE /api/v1/user/data (Delete All Data)
    app.delete('/api/v1/user/data', async (req, reply) => {
        const userId = req.userId!;
        await deleteAllData(userId);
        cacheService.invalidateUser(userId);
        return { ok: true, message: 'All data deleted' };
    });

    // DELETE /api/v1/user/account (Full Account Delete)
    app.delete('/api/v1/user/account', async (req, reply) => {
        const userId = req.userId!;

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
        const userId = req.userId!;
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
        const userId = req.userId!;
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
        const userId = req.userId!;
        const keyId = req.params.id;
        await apiKeyRepo.revokeById(userId, keyId);
        return { ok: true };
    });
}
