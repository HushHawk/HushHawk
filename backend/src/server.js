import express from 'express';
import cors from 'cors';
import { apiRouter } from './routes/api.js';
import { wwRouter } from './routes/wewebAdapter.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

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
    res.json({
        service: 'HushHawk Primary API Backend',
        version: '1.0.0',
        documentation: '/api/v1/health',
        canonicalStore: 'PostgreSQL-Canonical v1.0',
    });
});

// Mount /api/v1
app.use('/api/v1', apiRouter);

// Auth session endpoint for frontend WeWeb auth checks
const mockAuthPayload = {
    session: {
        id: 's-admin-1',
        userId: 'u-admin-1',
        token: 'hushhawk-token-admin',
        expiresAt: new Date(Date.now() + 86400000 * 30).toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    },
    user: {
        id: 'u-admin-1',
        name: 'HushHawk Acquisitions Admin',
        email: 'admin@hushhawk.com',
        role: 'admin',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    },
    authenticated: true,
};

app.use('/api/auth', (req, res) => {
    res.json(mockAuthPayload);
});

// Mount /ww and /api/ww adapter for WeWeb frontend table-views and workflows
app.use('/ww', wwRouter);
app.use('/api/ww', wwRouter);

// Error handler
app.use((err, req, res, next) => {
    console.error('[API Error]', err);
    res.status(500).json({ error: err.message || 'Internal Server Error' });
});

app.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(`🦅 HUSHHAWK Primary API Backend Running on :${PORT}`);
    console.log(`   Canonical DB: PostgreSQL schemas (ref, raw, core, rel, crm, ops, audit)`);
    console.log(`   Health Check: http://localhost:${PORT}/api/v1/health`);
    console.log(`=======================================================`);
});

export default app;
