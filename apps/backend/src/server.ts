import './instrument.js';
import { createApp } from './index.js';

const port = process.env.PORT ? parseInt(process.env.PORT) : 1299;
const host = '0.0.0.0';

try {
    const { app } = await createApp();
    await app.listen({ port, host });
    console.log(`Core Backend listening on ${host}:${port}`);
} catch (err) {
    console.error(err);
    process.exit(1);
}
