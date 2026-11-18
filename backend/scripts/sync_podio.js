/**
 * Runs one full Podio synchronisation on demand: npm run sync:podio
 * (The API server also does this on a schedule when PODIO_SYNC_INTERVAL_MIN is set.)
 */
import { pool } from '../src/store/pgClient.js';
import { db } from '../src/store/database.js';
import { PodioSyncService } from '../src/services/podioSyncService.js';

try {
    await db.load();
    const result = await PodioSyncService.syncAll();
    console.log(JSON.stringify(result, null, 2));
    await db.flush();
    process.exitCode = result.ok ? 0 : 1;
} catch (error) {
    console.error('Podio sync failed:', error.message);
    process.exitCode = 1;
} finally {
    await pool.end();
}
