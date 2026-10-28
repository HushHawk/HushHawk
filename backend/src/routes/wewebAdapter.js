import { Router } from 'express';
import { db } from '../store/database.js';
import { pool } from '../store/pgClient.js';

export const wwRouter = Router();

// Fallback in-memory lists (active if DB is unreachable)
let savedTasks = [
    {
        id: 'task-101',
        title: 'Call James R. Carter · 1234 Oak Ridge Dr (Foreclosure review)',
        category: 'Acquisitions',
        due_time: '2026-10-24',
        priority: 'High',
        is_completed: false,
    },
    {
        id: 'task-102',
        title: 'Send purchase contract to Maria Gonzalez · 5678 Pine Crest Ln',
        category: 'Contracts',
        due_time: '2026-10-25',
        priority: 'High',
        is_completed: false,
    },
];

const sellerContacts = [
    {
        id: 'sel-1',
        seller_name: 'James R. Carter',
        phone: '(904) 555-0198',
        email: 'jcarter@email.com',
        property_address: '1234 Oak Ridge Dr, Jacksonville, FL 32277',
        lead_status: 'New',
        lead_score: 94,
    },
];

const buyerContacts = [
    {
        id: 'buy-1',
        full_name: 'Marcus Vance',
        phone: '(904) 555-9101',
        email: 'marcus@vancecapitalinvestments.com',
        company: 'Vance Capital Holdings',
        status: 'Active VIP Buyer',
        buy_box: 'Duval County SFH $80K-$220K',
    },
];

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
            console.error('[PostgreSQL Tasks Fetch Error]', err.message);
            return res.json({
                data: savedTasks,
                metadata: { total: savedTasks.length, limit: 50, offset: 0, hasMore: false },
            });
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
            console.error('[PostgreSQL Sellers Fetch Error]', err.message);
            return res.json({
                data: sellerContacts,
                metadata: { total: sellerContacts.length, limit: 50, offset: 0, hasMore: false },
            });
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
            console.error('[PostgreSQL Buyers Fetch Error]', err.message);
            return res.json({
                data: buyerContacts,
                metadata: { total: buyerContacts.length, limit: 50, offset: 0, hasMore: false },
            });
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
            return res.json({ data: [], metadata: { total: 0, limit: 20, offset: 0, hasMore: false } });
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
        const title = p.title || 'Untitled task';
        const category = p.category || 'General';
        const dueTime = p.due_time || new Date().toISOString().slice(0, 10);
        const priority = p.priority || 'Medium';
        const isCompleted = Boolean(p.is_completed);

        try {
            const insertRes = await pool.query(`
                INSERT INTO core.tasks (task_id, title, category, due_time, priority, is_completed, status)
                VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6)
                RETURNING task_id as id, title, category, due_time, priority, is_completed;
            `, [title, category, dueTime, priority, isCompleted, isCompleted ? 'COMPLETED' : 'PENDING']);
            const newTask = insertRes.rows[0];
            console.log('[AWS RDS Tasks] Created new task:', newTask.title, 'Due:', newTask.due_time);
            return res.json({ success: true, message: 'Task saved.', task: newTask });
        } catch (err) {
            console.error('[AWS RDS Task Create Error]', err.message);
            const fallbackTask = { id: 'task-' + Date.now(), title, category, due_time: dueTime, priority, is_completed: isCompleted };
            savedTasks.unshift(fallbackTask);
            return res.json({ success: true, message: 'Task saved.', task: fallbackTask });
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
            `, [rowId]);

            if (updateRes.rows.length > 0) {
                const task = updateRes.rows[0];
                console.log('[AWS RDS Tasks] Toggled task completion:', task.title, 'Now:', task.is_completed);
                return res.json({ success: true, message: 'Task updated.', task });
            }
        } catch (err) {
            console.error('[AWS RDS Task Toggle Error]', err.message);
        }

        const fallbackTask = savedTasks.find(t => t.id === rowId);
        if (fallbackTask) {
            fallbackTask.is_completed = !fallbackTask.is_completed;
            return res.json({ success: true, message: 'Task updated.', task: fallbackTask });
        }
        return res.json({ success: true, message: 'Task updated.' });
    }

    // Generic fallback for any other workflows
    res.json({ success: true, message: 'Workflow executed.' });
}

wwRouter.post('/workflows/:id', handleWorkflow);
wwRouter.put('/workflows/:id', handleWorkflow);

// ----------------------------------------------------------------------------
// 3. Fallback for CMS datasets
// ----------------------------------------------------------------------------
wwRouter.all('/cms_data_sets/:id/fetch', (req, res) => {
    res.json({ records: [], total: 0 });
});
