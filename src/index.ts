import '@/env';

import app from '@/api';
import { registerCommands } from '@/commands';
import { startPolling } from '@/prusa';
import { initDatabase } from '@/store';

const PORT = (() => {
    const port = process.env.PORT || 3000;

    if (typeof port === 'string') {
        return parseInt(port, 10);
    }

    return port;
})();
const HTTP_HOST = process.env.HTTP_HOST || 'localhost';

async function main(): Promise<void> {
    initDatabase();

    await registerCommands();

    startPolling();

    app.listen(PORT, HTTP_HOST, () => {
        console.log(`Server is running on http://${HTTP_HOST}:${PORT}`);
    });

    console.info('Bot is running');
}

main().catch(error => {
    console.error(error);
    process.exit(1);
});
