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
import { cacheService } from '../services/CacheService.js';
import { addDaysIso, isoToday } from '../utils/dates.js';
import { runFusionEngine } from '../engine.js';

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

        // Use transaction for atomic onboarding. Idempotent: re-running onboarding
        // (e.g. a client retry after a perceived failure) must not duplicate state.
        const sessionData = await opts.db.transaction(async (txDb: any) => {
            const txPrefRepo = new PreferencesRepository(txDb);
            const txMetaRepo = new UserMetaRepository(txDb);
            const txCycleRepo = new CycleRepository(txDb);
            const txUserRepo = new UserRepository(txDb);

            // 1. Save Preferences
            await txPrefRepo.completeOnboarding(userId, {
                intent,
                cycle_regularity,
                context_flags: context_flags || []
            });

            // 2. Update User Meta (Avg Cycle Length)
            let avgLength = 28;
            if (cycle_length_min && cycle_length_max) {
                avgLength = (cycle_length_min + cycle_length_max) / 2;
            }

            await txMetaRepo.upsertMeta({
                user_id: userId,
                app_mode: intent === 'conceive' ? 'conceive' : 'prevent',
                baseline_temp_avg: 36.5,
                avg_cycle_length: avgLength
            });

            // 3. Create/Update Initial Active Cycle.
            // Reuse the existing active cycle (no end_date) instead of always
            // inserting a fresh UUID — otherwise a retry leaves duplicate active cycles.
            const existingCycles = await txCycleRepo.getCycleHistory(userId);
            const activeCycle = existingCycles.find((c) => !c.end_date);
            const cycleId = activeCycle?.id ?? randomUUID();

            await txCycleRepo.upsertCycles([{
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

            // 4. Get User data for session update
            const user = await txUserRepo.findById(userId);

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

        const metaRepo = new UserMetaRepository(opts.db);
        const [prefs, meta, cycles] = await Promise.all([
            prefRepo.getOnboardingData(userId),
            metaRepo.getUserMeta(userId),
            cycleRepo.getCycleHistory(userId)
        ]);

        // Find the active cycle (no end_date) for last_period_start
        const activeCycle = cycles.find(c => !c.end_date);
        // Find latest completed cycle for period_length
        const latestCompleted = cycles.find(c => c.end_date && c.period_length);

        return {
            cycle_regularity: prefs.cycle_regularity,
            context_flags: prefs.context_flags,
            intent: prefs.intent,
            avg_cycle_length: Number(meta.avg_cycle_length),
            last_period_start: activeCycle?.start_date ?? null,
            period_length: activeCycle?.period_length ?? latestCompleted?.period_length ?? 5,
            show_branding: prefs.show_branding ?? true,
            theme: prefs.theme ?? 'dark',
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

        // 1. Update preferences (regularity, context_flags)
        if (body.cycle_regularity !== undefined || body.context_flags !== undefined) {
            await prefRepo.updateProfile(userId, {
                cycle_regularity: body.cycle_regularity,
                context_flags: body.context_flags
            });
        }

        // 1b. Update show_branding (discreet mode)
        if (body.show_branding !== undefined) {
            await prefRepo.updateShowBranding(userId, body.show_branding);
        }

        // 1c. Update theme (light/dark)
        if (body.theme !== undefined) {
            await prefRepo.updateTheme(userId, body.theme);
        }

        // 2. Update user_metadata (avg_cycle_length)
        if (body.avg_cycle_length !== undefined) {
            const metaRepo = new UserMetaRepository(opts.db);
            const existing = await metaRepo.getUserMeta(userId);
            await metaRepo.upsertMeta({
                ...existing,
                avg_cycle_length: body.avg_cycle_length
            });
            engineTriggerNeeded = true;
        }

        // 3. Update active cycle start_date (last_period_start)
        if (body.last_period_start !== undefined) {
            const cycles = await cycleRepo.getCycleHistory(userId);
            const activeCycle = cycles.find(c => !c.end_date);
            if (activeCycle) {
                const activeCycleIdx = cycles.indexOf(activeCycle);
                const prevCycle = cycles[activeCycleIdx + 1];
                activeCycle.start_date = body.last_period_start;
                const cyclesToUpsert = [activeCycle];

                if (prevCycle) {
                    prevCycle.end_date = addDaysIso(body.last_period_start, -1);
                    cyclesToUpsert.push(prevCycle);
                }

                await cycleRepo.upsertCycles(cyclesToUpsert);
                engineTriggerNeeded = true;
            }
        }

        // 4. Update period_length on active cycle
        if (body.period_length !== undefined) {
            const cycles = await cycleRepo.getCycleHistory(userId);
            const activeCycle = cycles.find(c => !c.end_date);
            if (activeCycle) {
                activeCycle.period_length = body.period_length;
                await cycleRepo.upsertCycles([activeCycle]);
                engineTriggerNeeded = true;
            }
        }

        // Trigger Engine recalculation if required to prevent stale data
        if (engineTriggerNeeded) {
            try {
                const today = isoToday();
                const existingCycles = await cycleRepo.getCycleHistory(userId);

                let lookbackDate = addDaysIso(today, -120);
                if (existingCycles.length >= 3) {
                    lookbackDate = existingCycles[2].start_date;
                } else if (existingCycles.length > 0) {
                    lookbackDate = existingCycles[existingCycles.length - 1].start_date;
                }

                const metaRepo = new UserMetaRepository(opts.db);
                const [logs, meta] = await Promise.all([
                    logRepo.getLogsSince(userId, lookbackDate),
                    metaRepo.getUserMeta(userId)
                ]);

                const { statuses, cycles } = runFusionEngine(userId, {
                    logs,
                    meta,
                    existingCycles,
                    today
                });

                await statusRepo.saveDailyStatuses(statuses);
                await cycleRepo.upsertCycles(cycles);
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
