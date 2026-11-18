import { Router } from 'express';
import { db } from '../store/database.js';
import { pool } from '../store/pgClient.js';

export const wwRouter = Router();

// ----------------------------------------------------------------------------
// 1. Table-Views Endpoint (used by Tasks, Calendar, Contacts, Leads)
// ----------------------------------------------------------------------------
wwRouter.get('/table-views/:id', async (req, res) => {
    const { id } = req.params;

    // 1. Tasks & Calendar
    if (id === 'eedfb6bb-2d89-45f8-a956-c5cfb6405d9e') {
        try {
            const { rows } = await pool.query(`
                SELECT 
                    task_id as id,
                    title,
                    COALESCE(category, 'General') as category,
                    COALESCE(due_time, to_char(due_date, 'YYYY-MM-DD'), to_char(created_at, 'YYYY-MM-DD')) as due_time,
                    COALESCE(priority, 'Medium') as priority,
                    COALESCE(is_completed, false) as is_completed
                FROM core.tasks
                ORDER BY created_at DESC;
            `);
            return res.json({
                data: rows,
                metadata: {
                    total: rows.length,
                    limit: 50,
                    offset: 0,
                    hasMore: false,
                },
            });
        } catch (err) {
            console.error('[Tasks Fetch Error]', err.message);
            return res.status(500).json({ error: 'Tasks are temporarily unavailable.' });
        }
    }

    // 2. Seller Contacts & Leads
    if (id === '5fc4b493-1e9e-4de8-8102-668c1e8a00aa') {
        try {
            const { rows } = await pool.query(`
                SELECT id, seller_name, phone, email, property_address, lead_status, lead_score
                FROM crm.seller_contacts
                ORDER BY lead_score DESC;
            `);
            return res.json({
                data: rows,
                metadata: {
                    total: rows.length,
                    limit: 50,
                    offset: 0,
                    hasMore: false,
                },
            });
        } catch (err) {
            console.error('[Sellers Fetch Error]', err.message);
            return res.status(500).json({ error: 'Seller contacts are temporarily unavailable.' });
        }
    }

    // 3. Cash Buyer Contacts
    if (id === 'ca272979-bb2b-4aa6-8386-e24b42b62b8b') {
        try {
            const { rows } = await pool.query(`
                SELECT id, full_name, phone, email, company, status, buy_box
                FROM crm.cash_buyers
                ORDER BY created_at ASC;
            `);
            return res.json({
                data: rows,
                metadata: {
                    total: rows.length,
                    limit: 50,
                    offset: 0,
                    hasMore: false,
                },
            });
        } catch (err) {
            console.error('[Buyers Fetch Error]', err.message);
            return res.status(500).json({ error: 'Buyers are temporarily unavailable.' });
        }
    }

    // 4. Deal Stage Overrides
    if (id === '7a5110e6-060d-442b-80f9-19843cd8b197') {
        try {
            const { rows } = await pool.query(`
                SELECT id, deal_id, stage_key, stage_state, updated_at as "updatedAt"
                FROM crm.stage_overrides
                ORDER BY updated_at ASC;
            `);
            return res.json({
                data: rows,
                metadata: {
                    total: rows.length,
                    limit: 50,
                    offset: 0,
                    hasMore: false,
                },
            });
        } catch (err) {
            console.error('[Stage overrides Fetch Error]', err.message);
            return res.status(500).json({ error: 'Stage overrides are temporarily unavailable.' });
        }
    }

    // Default empty array
    res.json({
        data: [],
        metadata: { total: 0, limit: 20, offset: 0, hasMore: false },
    });
});

// ----------------------------------------------------------------------------
// 2. Backend Workflows Endpoint (Create Task, Complete Task)
// ----------------------------------------------------------------------------
async function handleWorkflow(req, res) {
    const { id } = req.params;
    const body = req.body || {};
    const params = body.parameters || body || {};

    // Workflow: Create dated task (966c595d-ddeb-4090-80d8-0c79703152b6)
    if (id === '966c595d-ddeb-4090-80d8-0c79703152b6') {
        const p = params['table:priorities'] || params.rowData || params;
        if (!p.title || !String(p.title).trim()) return res.status(400).json({ error: 'A task title is required.' });
        const isCompleted = Boolean(p.is_completed);
        try {
            const insertRes = await pool.query(`
                INSERT INTO core.tasks (title, category, due_time, priority, is_completed, status, owner_id)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                RETURNING task_id as id, title, category, due_time, priority, is_completed;
            `, [String(p.title).trim(), p.category || 'General', p.due_time || null, p.priority || 'Medium', isCompleted, isCompleted ? 'COMPLETED' : 'PENDING', req.user?.name || null]);
            return res.json({ success: true, message: 'Task saved.', task: insertRes.rows[0] });
        } catch (err) {
            console.error('[Task Create Error]', err.message);
            return res.status(500).json({ error: 'The task could not be saved.' });
        }
    }

    // Workflow: Toggle complete (dc65bd76-0e32-4eb7-8776-ffb5a37fd32f)
    if (id === 'dc65bd76-0e32-4eb7-8776-ffb5a37fd32f') {
        const rowId = params['Row ID'] || params.rowId || params.id;
        try {
            const updateRes = await pool.query(`
                UPDATE core.tasks
                SET is_completed = NOT is_completed,
                    status = CASE WHEN is_completed THEN 'PENDING' ELSE 'COMPLETED' END,
                    completed_at = CASE WHEN is_completed THEN NULL ELSE now() END
                WHERE task_id::text = $1
                RETURNING task_id as id, title, category, due_time, priority, is_completed;
            `, [String(rowId)]);
            if (!updateRes.rows.length) return res.status(404).json({ error: 'Task not found.' });
            return res.json({ success: true, message: 'Task updated.', task: updateRes.rows[0] });
        } catch (err) {
            console.error('[Task Toggle Error]', err.message);
            return res.status(500).json({ error: 'The task could not be updated.' });
        }
    }

    res.status(404).json({ error: `Unknown workflow '${id}'.` });
}

wwRouter.post('/workflows/:id', handleWorkflow);
wwRouter.put('/workflows/:id', handleWorkflow);

// ----------------------------------------------------------------------------
// 3. Fallback for CMS datasets
// ----------------------------------------------------------------------------
wwRouter.all('/cms_data_sets/:id/fetch', (req, res) => {
    res.json({ records: [], total: 0 });
});
