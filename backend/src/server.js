import express from 'express';
import cors from 'cors';
import { apiRouter } from './routes/api.js';
import { wwRouter } from './routes/wewebAdapter.js';
import { RbacService } from './services/rbacService.js';
import { db } from './store/database.js';
import { pool } from './store/pgClient.js';
import { PodioSyncService } from './services/podioSyncService.js';
import { LeadLinkService } from './services/leadLinkService.js';
import { LeadClassifierService } from './services/leadClassifierService.js';
import { CountyRollService } from './services/countyRollService.js';
import { BackupService } from './services/backupService.js';
import { ConnectorService } from './services/connectorService.js';
import { GraphService } from './services/graphService.js';
import { requireSession, bearerToken, loginRateLimit } from './middleware/auth.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Browsers may only call the API from the configured origins. Same-origin requests (the bundled app) need no CORS.
const allowedOrigins = (process.env.CORS_ORIGINS || '').split(',').map(o => o.trim()).filter(Boolean);
app.use(cors({ origin: (origin, cb) => cb(null, !origin || allowedOrigins.includes(origin)) }));
app.disable('x-powered-by');
app.use(express.json({ limit: '10mb', verify: (req, res, buf) => { req.rawBody = buf; } })); // the raw body is needed to check Meta's webhook signature
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logger
app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        if (!req.url.startsWith('/favicon')) {
            console.log(`[API] ${req.method} ${req.url} -> ${res.statusCode} (${duration}ms)`);
        }
    });
    next();
});

// Root ping
app.get('/', (req, res) => {
    res.json({ service: 'HushHawk API', health: '/api/v1/health' });
});

// Mount /api/v1 and /api for seamless webhook and API compatibility
app.use('/api/v1', apiRouter);
app.use('/api', apiRouter);

// Auth login endpoint
app.post('/api/auth/login', (req, res, next) => loginRateLimit(req, res, next), async (req, res) => {
    try {
        const { email, password } = req.body;
        const result = await RbacService.authenticate({ email, password });
        res.json({ ok: true, ...result });
    } catch (err) {
        res.status(401).json({ ok: false, error: err.message });
    }
});

app.get('/api/auth/get-session', async (req, res, next) => {
    res.set('Cache-Control', 'no-store');
    try {
        const token = bearerToken(req);
        const session = await RbacService.getSession(token);
        if (!session) return res.json(null);
        res.json({ user: session.user, session: { userId: session.user.id, expiresAt: session.expiresAt } });
    } catch (error) {
        next(error);
    }
});

// Mount /ww and /api/ww adapter for WeWeb frontend table-views and workflows
app.use('/ww', requireSession, wwRouter);
app.use('/api/ww', requireSession, wwRouter);

// Error handler
app.use((err, req, res, next) => {
    console.error('[API Error]', err);
    res.status(500).json({ error: err.message || 'Internal Server Error' });
});

// ---------------------------------------------------------------------------
// Background automation: keep data current without anyone clicking Sync.
// Each job is guarded against overlapping runs and logs failures instead of hiding them.
// ---------------------------------------------------------------------------
const running = new Set();
function schedule(name, intervalMs, job) {
    const tick = async () => {
        if (running.has(name)) return;
        running.add(name);
        try { await job(); } catch (error) { console.error(`[Scheduler:${name}] failed:`, error.message); } finally { running.delete(name); }
    };
    setTimeout(tick, 15_000);
    return setInterval(tick, intervalMs).unref();
}

function startScheduler() {
    const minutes = name => Math.max(1, Number.parseInt(process.env[name] ?? '', 10) || 0);
    const podioEvery = minutes('PODIO_SYNC_INTERVAL_MIN');
    if (podioEvery && process.env.PODIO_CLIENT_ID && process.env.PODIO_APP_TOKEN) {
        schedule('podio-sync', podioEvery * 60_000, async () => {
            const result = await PodioSyncService.syncAll();
            console.log(`[Scheduler:podio-sync] ${JSON.stringify(result.counts)}`);
            await LeadClassifierService.classifyAll().catch(error => console.error('[Scheduler:lead-classify]', error.message));
            const linked = await LeadLinkService.linkFromConversations().catch(error => ({ error: error.message }));
            console.log(`[Scheduler:lead-link] ${JSON.stringify({ ...linked, notFound: linked.notFound?.length })}`);
        });
    }
    // The county roll changes slowly; check the registered properties twice a day.
    schedule('county-roll', 12 * 60 * 60_000, async () => {
        const result = await CountyRollService.refreshAll();
        console.log(`[Scheduler:county-roll] ${JSON.stringify({ ...result, failed: result.failed.length })}`);
    });
    // A compressed copy of the whole database goes to the private S3 bucket once a day (only when storage is configured).
    if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
        schedule('db-backup', 60 * 60_000, async () => {
            const result = await BackupService.runIfDue();
            if (result) console.log(`[Scheduler:db-backup] ${result.key} ${result.bytes} bytes, ${result.rows} rows, pruned ${result.pruned}`);
        });
    }
    schedule('connectors', 5 * 60_000, async () => {
        const results = await ConnectorService.runDue();
        if (results.length) console.log(`[Scheduler:connectors] ran ${results.length} connector(s)`);
    });
    if (GraphService.isConfigured()) {
        schedule('graph-outbox', 30_000, async () => {
            const result = await GraphService.syncOutbox();
            if (result.published || result.failed) console.log(`[Scheduler:graph-outbox] published=${result.published} failed=${result.failed}`);
        });
    }
}

async function main() {
    await pool.query('SELECT 1'); // fail fast when the database is unreachable
    await db.load();
    const server = app.listen(PORT, () => {
        console.log(`HushHawk API listening on :${PORT}`);
        startScheduler();
    });
    const shutdown = async () => {
        server.close();
        try { await db.flush(); } finally { await pool.end().catch(() => {}); process.exit(0); }
    };
    process.once('SIGTERM', shutdown);
}

main().catch(error => {
    console.error('Failed to start HushHawk API:', error.message);
    process.exit(1);
});

export default app;
