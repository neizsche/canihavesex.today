
import { createDb } from '../db.js';
import { loadEnv } from '../env.js';
import { LogRepository, LogV2 } from '../repositories/LogRepository.js';
import { UserRepository } from '../repositories/UserRepository.js';
import { CycleRepository } from '../repositories/CycleRepository.js';
import { DailyStatusRepository } from '../repositories/DailyStatusRepository.js';
import { PreferencesRepository } from '../repositories/PreferencesRepository.js';
import { UserMetaRepository } from '../repositories/UserMetaRepository.js';
import { runFusionEngine } from '../engine.js';
import { randomUUID } from 'node:crypto';

loadEnv();

// Simulation Configuration
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
    const dailyStatusRepo = new DailyStatusRepository(db);
    const prefRepo = new PreferencesRepository(db);
    const metaRepo = new UserMetaRepository(db);

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

    // Ensure User Meta Exists
    console.log('Ensuring user meta...');
    await metaRepo.upsertMeta({
        user_id: userId,
        app_mode: 'prevent', // Default, could be 'conceive'
        baseline_temp_avg: 36.5,
        avg_cycle_length: CYCLE_LENGTH
    });

    // 2. Wipe Data
    console.log('Wiping existing data for clean simulation...');
    await dailyStatusRepo.deleteStatusByUserId(userId);
    await logRepo.deleteLogsByUserId(userId);
    await cycleRepo.deleteCyclesByUserId(userId);

    // 3. Generate Cycles
    const today = new Date();

    // Anchor: Make "Today" be Day 22 of the current (last) cycle.
    const CURRENT_CYCLE_DAY = 22;
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - ((cyclesToGenerate - 1) * CYCLE_LENGTH) - CURRENT_CYCLE_DAY);

    console.log(`Generating logs starting from ${startDate.toISOString().slice(0, 10)} (Today is Day ${CURRENT_CYCLE_DAY} of Cycle ${cyclesToGenerate})...`);

    let currentDate = new Date(startDate);

    // Loop through cycles
    for (let c = 0; c < cyclesToGenerate; c++) {
        const cycleStartIso = currentDate.toISOString().slice(0, 10);
        console.log(`  Cycle ${c + 1}: Starts ${cycleStartIso}`);

        // Loop through days
        for (let day = 1; day <= CYCLE_LENGTH; day++) {
            const dateIso = currentDate.toISOString().slice(0, 10);
            if (dateIso > today.toISOString().slice(0, 10)) break; // Don't log future

            let bleeding: LogV2['bleeding'] = 'none';
            let mucus: LogV2['mucus'] = null;
            let temperature: number | null = null;

            // Menstruation
            if (day <= MENSTRUATION_LENGTH) {
                bleeding = day <= 2 ? 'heavy' : (day <= 4 ? 'medium' : 'light');
                mucus = null;
                temperature = 36.3 + (Math.random() * 0.2);
            }
            // Follicular (Dry -> Creamy)
            else if (day < FOLLICULAR_PEAK_DAY) {
                bleeding = 'none';
                temperature = 36.3 + (Math.random() * 0.2);
                if (day < 10) mucus = 'dry';
                else if (day < 12) mucus = 'sticky';
                else mucus = 'creamy';
            }
            // Ovulation (Peak)
            else if (day === FOLLICULAR_PEAK_DAY) {
                bleeding = 'none';
                mucus = 'eggwhite';
                temperature = 36.2; // Dip
            }
            // Luteal (Dry, High Temp)
            else {
                bleeding = 'none';
                mucus = 'dry';
                temperature = 36.8 + (Math.random() * 0.3); // High shift
            }

            // Write Log
            await logRepo.upsertLog({
                id: randomUUID(),
                user_id: userId,
                date: dateIso,
                bleeding: bleeding === 'none' ? null : bleeding,
                temperature: Number(temperature.toFixed(2)),
                mucus: mucus,
                lh_test: null,
                disturbances: [],
                symptoms: [],
                notes: null
            });

            currentDate.setDate(currentDate.getDate() + 1);
        }
    }

    // 4. Run Engine to Update State
    console.log('Running engine for today...');

    // Fetch data for engine
    const logs = await logRepo.getAllLogs(userId);
    const meta = await metaRepo.getUserMeta(userId);
    const existingCycles = await cycleRepo.getCycleHistory(userId);

    const result = runFusionEngine(userId, {
        logs,
        meta,
        existingCycles
    });

    // Save Results
    await dailyStatusRepo.saveDailyStatuses(result.statuses);
    await cycleRepo.upsertCycles(result.cycles);

    console.log('Simulation complete!');

    const todayIso = today.toISOString().slice(0, 10);
    const todayStatus = result.statuses.find(s => s.date === todayIso);
    console.log(`Risk Today: ${todayStatus?.fertility_status ?? 'Unknown'}`);

    // Validating Persistence
    const activeStatus = await dailyStatusRepo.getTodayStatus(userId, todayIso);
    if (!activeStatus) {
        console.error('CRITICAL: No daily status persisted for today!');
    } else {
        console.log(`DEBUG: Found status for today: ${activeStatus.fertility_status}`);
    }

    process.exit(0);
}

main().catch(console.error);
