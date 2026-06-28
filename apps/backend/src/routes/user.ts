import { FastifyInstance } from 'fastify';
import { randomUUID } from 'node:crypto';
import { UserRepository } from '../repositories/UserRepository.js';
import { LogRepository } from '../repositories/LogRepository.js';
import { CycleRepository } from '../repositories/CycleRepository.js';
import { DailyStatusRepository } from '../repositories/DailyStatusRepository.js';
import { SettingsRepository } from '../repositories/SettingsRepository.js';
import { EngineService } from '../services/EngineService.js';
import { cacheService } from '../services/CacheService.js';
import { isoToday } from '../utils/dates.js';

import { z } from 'zod';
import { ZodTypeProvider } from 'fastify-type-provider-zod';

export async function userRoutes(fastify: FastifyInstance, opts: { db: any }) {
    const app = fastify.withTypeProvider<ZodTypeProvider>();
    const logRepo = new LogRepository(opts.db);
    const cycleRepo = new CycleRepository(opts.db);
    const statusRepo = new DailyStatusRepository(opts.db);
    const settingsRepo = new SettingsRepository(opts.db);
    const engineService = new EngineService(opts.db);

    // PATCH /api/v1/user/preferences — completes onboarding.
    // Captures only the two engine inputs that matter for a cold start:
    // cycle regularity and typical cycle length. The cycle anchor is no longer
    // collected here — the user back-logs her last period from the calendar
    // (within the 56-day window), and the engine derives the cycle from that log.
    app.patch('/api/v1/user/preferences', {
        schema: {
            body: z.object({
                cycle_regularity: z.enum(['regular', 'irregular', 'unsure']),
                cycle_length_min: z.number().int().min(18).max(45).optional(),
                cycle_length_max: z.number().int().min(18).max(45).optional(),
                // Auto-detected from the client locale (US → fahrenheit). Optional
                // so older clients that don't send it keep the 'celsius' default.
                temperature_unit: z.enum(['celsius', 'fahrenheit']).optional()
            })
        }
    }, async (req, reply) => {
        const userId = req.userId!;
        const body = req.body;

        const { cycle_regularity } = body;
        let { cycle_length_min, cycle_length_max } = body;

        // Normalize: ensure min <= max when both supplied.
        if (cycle_length_min && cycle_length_max && cycle_length_min > cycle_length_max) {
            [cycle_length_min, cycle_length_max] = [cycle_length_max, cycle_length_min];
        }

        let avgLength = 28;
        if (cycle_length_min && cycle_length_max) {
            avgLength = (cycle_length_min + cycle_length_max) / 2;
        }

        // Idempotent: re-running onboarding (e.g. a client retry after a perceived
        // failure) is a single settings upsert, so it cannot duplicate state.
        await settingsRepo.completeOnboarding(userId, {
            cycle_regularity,
            avgCycleLength: avgLength,
            temperature_unit: body.temperature_unit,
        });

        const user = await new UserRepository(opts.db).findById(userId);

        cacheService.invalidateUser(userId);
        return {
            userId,
            email: user?.email ?? null,
            onboardingCompleted: true
        };
    });

    // GET /api/v1/user/profile — Load full profile for settings screen
    app.get('/api/v1/user/profile', async (req, reply) => {
        const userId = req.userId!;

        const [settings, cycles] = await Promise.all([
            settingsRepo.getSettings(userId),
            cycleRepo.getCycleHistory(userId)
        ]);

        // Active cycle (no end_date) then latest completed cycle, for period_length.
        const activeCycle = cycles.find(c => !c.end_date);
        const latestCompleted = cycles.find(c => c.end_date && c.period_length);

        return {
            cycle_regularity: settings.cycle_regularity,
            avg_cycle_length: Number(settings.avg_cycle_length),
            period_length: activeCycle?.period_length ?? latestCompleted?.period_length ?? 5,
            show_branding: settings.show_branding ?? true,
            theme: settings.theme ?? 'dark',
            temperature_unit: settings.temperature_unit ?? 'celsius',
        };
    });

    // PATCH /api/v1/user/profile — Partial updates from settings
    app.patch('/api/v1/user/profile', {
        schema: {
            body: z.object({
                cycle_regularity: z.enum(['regular', 'irregular', 'unsure']).optional(),
                avg_cycle_length: z.number().min(18).max(45).optional(),
                period_length: z.number().min(1).max(10).optional(),
                show_branding: z.boolean().optional(),
                theme: z.enum(['light', 'dark']).optional(),
                temperature_unit: z.enum(['celsius', 'fahrenheit']).optional(),
            })
        }
    }, async (req, reply) => {
        const userId = req.userId!;
        const body = req.body;

        let engineTriggerNeeded = false;

        // 1. Settings updates (regularity, avg_cycle_length, temperature_unit).
        const profilePatch: { cycle_regularity?: string; avg_cycle_length?: number; temperature_unit?: 'celsius' | 'fahrenheit' } = {};
        if (body.cycle_regularity !== undefined) profilePatch.cycle_regularity = body.cycle_regularity;
        if (body.avg_cycle_length !== undefined) {
            profilePatch.avg_cycle_length = body.avg_cycle_length;
            engineTriggerNeeded = true;
        }
        // Display-only preference — no engine recompute needed (storage stays Celsius).
        if (body.temperature_unit !== undefined) profilePatch.temperature_unit = body.temperature_unit;
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

        // 2. Period-length edit on the active cycle. The cycle anchor itself is
        // no longer editable here — it's derived from logged bleeding (see the
        // back-log window), so there's no last_period_start override path.
        if (body.period_length !== undefined) {
            const cycles = await cycleRepo.getCycleHistory(userId);
            const activeCycle = cycles.find(c => !c.end_date);
            if (activeCycle) {
                activeCycle.period_length = body.period_length;
                await cycleRepo.upsertCycles([activeCycle]);
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

    // POST /api/v1/cycle/reanchor — drift correction from the Today screen.
    // Shown when the engine is past predicted length with no signals (lostTrack).
    //  - late/skipped: a cycle-scoped acknowledgment that the period is genuinely
    //    overdue. The status stays unsure/assume-fertile (engine output is
    //    unchanged in v1); this only stops the daily nag and records the signal.
    //    Scoped to the active cycle's start so it auto-expires when a new period
    //    starts.
    //  - paused: sticky break/pregnant flag. There is no explicit "resume" — a
    //    logged period auto-clears pause + ack in LogService.
    // No recompute needed (engine output unchanged) — just invalidate the cache
    // so the next Today read reflects the new state.
    app.post('/api/v1/cycle/reanchor', {
        schema: {
            body: z.object({
                kind: z.enum(['late', 'skipped', 'paused']),
            })
        }
    }, async (req, reply) => {
        const userId = req.userId!;
        const { kind } = req.body;

        if (kind === 'paused') {
            await settingsRepo.setReanchorState(userId, { paused: true });
        } else {
            const cycles = await cycleRepo.getCycleHistory(userId);
            const activeCycle = cycles.find((c) => !c.end_date);
            if (!activeCycle) {
                return reply.code(409).send({ error: 'no_active_cycle' });
            }
            await settingsRepo.setReanchorState(userId, { kind, cycleStart: activeCycle.start_date });
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
}
