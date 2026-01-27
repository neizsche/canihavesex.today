import { FastifyInstance } from 'fastify';
import { UserRepository } from '../repositories/UserRepository.js';
import { LogRepository } from '../repositories/LogRepository.js';
import { CycleRepository } from '../repositories/CycleRepository.js';
import { DailyStatusRepository } from '../repositories/DailyStatusRepository.js';

export async function userRoutes(app: FastifyInstance, opts: { db: any }) {
    const logRepo = new LogRepository(opts.db);
    const cycleRepo = new CycleRepository(opts.db);
    const statusRepo = new DailyStatusRepository(opts.db);

    const deleteAllData = async (userId: string) => {
        await logRepo.deleteLogsByUserId(userId);
        await statusRepo.deleteStatusByUserId(userId);
        await cycleRepo.deleteCyclesByUserId(userId);
    }

    // POST /api/user/data/delete (Delete All Data)
    app.post('/api/user/data/delete', async (req, reply) => {
        const userId = (req as any).userId;
        await deleteAllData(userId);
        return { ok: true, message: 'All data deleted' };
    });

    // POST /api/user/account/delete (Full Account Delete)
    app.post('/api/user/account/delete', async (req, reply) => {
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
}
