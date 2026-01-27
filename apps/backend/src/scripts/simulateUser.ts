
import { createDb } from '../db.js';
import { loadEnv } from '../env.js';

loadEnv();

import { LogRepository } from '../repositories/LogRepository.js';
import { UserRepository } from '../repositories/UserRepository.js';
import { CycleRepository } from '../repositories/CycleRepository.js';
import { EngineRepository } from '../repositories/EngineRepository.js';
import { PreferencesRepository } from '../repositories/PreferencesRepository.js';
import { runEngineV2, appendRawLog } from '../engineV2.js';
import { randomUUID } from 'node:crypto';

// Simulation Configuration
const CYCLES_TO_GENERATE = 3;
const CYCLE_LENGTH = 28;
const MENSTRUATION_LENGTH = 5;
const FOLLICULAR_PEAK_DAY = 14;

async function main() {
    const email = process.argv[2];
    const cyclesArg = process.argv[3];
    const cyclesToGenerate = cyclesArg ? parseInt(cyclesArg) : 13; // Default to 13 cycles (~1 year) if not specified

    if (!email) {
        console.error('Usage: npm run simulate:normal <email> [cycles]');
        process.exit(1);
    }

    console.log(`Starting simulation for ${email}...`);

    const db = await createDb();
    const userRepo = new UserRepository(db);
    const logRepo = new LogRepository(db);
    const cycleRepo = new CycleRepository(db);
    const engineRepo = new EngineRepository(db);
    const prefRepo = new PreferencesRepository(db);

    // 1. Find or Create User
    let user = await userRepo.findByEmail(email);
    let userId = user?.id;

    if (!user) {
        console.log('User not found. Creating...');
        userId = randomUUID();
        await userRepo.create({
            id: userId,
            email,
            created_at: new Date().toISOString()
        });
        // Create default prefs
        await prefRepo.createDefault(userId);
    } else {
        console.log('User found.');
    }

    if (!userId) throw new Error("Failed to get userId");

    // 2. Wipe Data
    console.log('Wiping existing data...');
    await engineRepo.deleteResultsByUserId(userId);
    await engineRepo.deleteTracesByUserId(userId);
    await engineRepo.deleteNormalizedDaysByUserId(userId);
    // await logRepo.deleteDailyLogsByUserId(userId);
    await logRepo.deleteRawLogsByUserId(userId);
    await cycleRepo.deleteByUserId(userId);

    // 3. Generate Cycles
    // We want the last cycle to end "today" or contain "today".
    // Let's say today is Day 20 of the current cycle.
    const today = new Date();

    // Start of the first cycle:
    // Today is roughly (Cycles * Length) days after the start.
    // Let's anchor: Cycle 1 Start = Today - (2 * 28) - 20 days.
    const anchorDate = new Date(today);
    anchorDate.setDate(anchorDate.getDate() - (cyclesToGenerate - 1) * CYCLE_LENGTH - 10); // Start 10 days into current cycle? 

    // Easier: Generate full cycles backwards from "Today".
    // Let's just generate linear forward from some start date.
    // Start Date = Today - (2.5 * 28) days.
    // Anchor: Make "Today" be Day 22 of the current (last) cycle.
    // This ensures we have a current active cycle with data.
    const CURRENT_CYCLE_DAY = 22;
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - ((cyclesToGenerate - 1) * CYCLE_LENGTH) - CURRENT_CYCLE_DAY);

    console.log(`Generating logs starting from ${startDate.toISOString().slice(0, 10)} (Today is Day ${CURRENT_CYCLE_DAY} of Cycle ${cyclesToGenerate})...`);

    let currentDate = new Date(startDate);

    // Loop through cycles
    for (let c = 0; c < cyclesToGenerate; c++) {
        // Create Cycle
        const cycleStartIso = currentDate.toISOString().slice(0, 10);
        const cycleId = randomUUID();
        console.log(`  Cycle ${c + 1}: Starts ${cycleStartIso}`);

        await cycleRepo.create({
            id: cycleId,
            user_id: userId,
            start_date: cycleStartIso,
            state: 'INFERTILE_PRE', // Engine will update
            peak_date: null,
            temp_shift_confirmed_date: null,
            created_at: new Date().toISOString()
        });

        // Loop through days
        for (let day = 1; day <= CYCLE_LENGTH; day++) {
            const dateIso = currentDate.toISOString().slice(0, 10);
            if (dateIso > today.toISOString().slice(0, 10)) break; // Don't log future

            let payload: any = {};

            // Menstruation
            if (day <= MENSTRUATION_LENGTH) {
                payload.bleeding = day <= 2 ? 'heavy' : (day <= 4 ? 'medium' : 'light');
                payload.mucusType = null;
                payload.temperature = 36.3 + (Math.random() * 0.2);
            }
            // Follicular (Dry -> Creamy)
            else if (day < FOLLICULAR_PEAK_DAY) {
                payload.bleeding = 'none';
                payload.temperature = 36.3 + (Math.random() * 0.2);
                if (day < 10) payload.mucusType = 'dry';
                else if (day < 12) payload.mucusType = 'sticky';
                else payload.mucusType = 'creamy';
            }
            // Ovulation (Peak)
            else if (day === FOLLICULAR_PEAK_DAY) {
                payload.bleeding = 'none';
                payload.mucusType = 'eggwhite';
                payload.sensation = 'slippery';
                payload.temperature = 36.2; // Dip
            }
            // Luteal (Dry, High Temp)
            else {
                payload.bleeding = 'none';
                payload.mucusType = 'dry';
                payload.temperature = 36.8 + (Math.random() * 0.3); // High
            }

            // Write Log
            await appendRawLog(logRepo, {
                userId,
                date: dateIso,
                payload,
                source: 'simulation'
            });

            currentDate.setDate(currentDate.getDate() + 1);
        }
    }

    // 4. Run Engine to Update State
    console.log('Running engine for today...');
    const result = await runEngineV2(
        { logRepo, engineRepo, cycleRepo },
        { userId, asOfDate: today.toISOString().slice(0, 10) }
    );

    console.log('Simulation complete!');
    console.log(`Risk Today: ${result.publicToday.risk}`);

    // Validating Persistence via EngineRepo (normalized_days)
    const normalizedDays = await engineRepo.findNormalizedDays(userId);
    console.log(`DEBUG: Total normalized_days found in DB: ${normalizedDays.length}`);
    if (normalizedDays.length === 0) {
        console.error('CRITICAL: No normalized_days persisted! Chart will be empty.');
    } else {
        console.log(`DEBUG: Sample normalized day date: ${normalizedDays[0].date}`);
    }

    process.exit(0);
}

main().catch(console.error);
