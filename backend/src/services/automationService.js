import { randomUUID } from 'node:crypto';
import { pool } from '../store/pgClient.js';

export const automationTriggers = {
    manual: 'Manual only',
    batchleads_lead: 'BatchLeads lead saved',
    podio_lead: 'Podio lead saved'
};
export const automationActions = {
    notification: 'Create an in-app alert',
    task: 'Create a follow-up task'
};

function ruleText(value, label, maxLength, required = true) {
    const result = typeof value === 'string' ? value.trim() : '';
    if ((required && !result) || result.length > maxLength) {
        throw Object.assign(new Error(`${label} must be ${required ? '1–' : 'at most '}${maxLength} characters.`), { status: 400 });
    }
    return result;
}

function validateRule(rule) {
    if (!Object.hasOwn(automationTriggers, rule.trigger_code) || !Object.hasOwn(automationActions, rule.action_code)) {
        throw Object.assign(new Error('Choose a supported trigger and action.'), { status: 400 });
    }
    if (typeof rule.enabled !== 'boolean') {
        throw Object.assign(new Error('Enabled must be true or false.'), { status: 400 });
    }
    return [
        ruleText(rule.name, 'Name', 100),
        ruleText(rule.description, 'Description', 500, false),
        rule.trigger_code,
        rule.action_code,
        ruleText(rule.action_text, 'Action text', 180),
        rule.enabled
    ];
}

const notFound = () => Object.assign(new Error('Automation rule not found.'), { status: 404 });

async function execute(rule, event) {
    const client = await pool.connect();
    const start = performance.now();
    try {
        await client.query('BEGIN');
        const { rows: [current] } = await client.query(
            'SELECT * FROM ops.automation_rules WHERE rule_id = $1 AND archived_at IS NULL FOR SHARE',
            [rule.rule_id]
        );
        if (!current || !current.enabled || (event.trigger !== 'manual' && current.trigger_code !== event.trigger)) {
            await client.query('ROLLBACK');
            return null;
        }
        const { rows: [run] } = await client.query(
            `INSERT INTO ops.automation_runs (rule_id, rule_name, trigger_code, action_code, event_key,
                 target, actor, status, duration_ms)
             VALUES ($1, $2, $3, $4, $5, $6, $7, 'failed', 0)
             ON CONFLICT (rule_id, event_key) DO NOTHING RETURNING run_id`,
            [current.rule_id, current.name, event.trigger, current.action_code, event.key, event.target, event.actor]
        );
        if (!run) {
            await client.query('COMMIT');
            return null;
        }

        const resultId = randomUUID();
        let error = null;
        await client.query('SAVEPOINT automation_action');
        try {
            const text = event.target ? `${current.action_text} — ${event.target}` : current.action_text;
            if (current.action_code === 'notification') {
                await client.query(
                    `INSERT INTO ops.notifications (notification_id, title, body, category, icon, color, action_url, metadata)
                     VALUES ($1, $2, $3, 'AUTOMATION', 'zap', 'gold', $4, $5)`,
                    [resultId, current.name, text, event.leadId ? '/seller-leads' : '/automations',
                        JSON.stringify({ runId: run.run_id, leadId: event.leadId })]
                );
            } else {
                await client.query(
                    `INSERT INTO core.tasks (task_id, title, status, category, priority, is_completed, due_date,
                         linked_entity_type, linked_entity_id)
                     VALUES ($1, $2, 'PENDING', 'Follow-Up', 'Medium', false, now() + interval '1 day', $3, $4)`,
                    [resultId, text, event.leadId ? 'LEAD' : null, event.leadId ?? null]
                );
            }
        } catch (err) {
            await client.query('ROLLBACK TO SAVEPOINT automation_action');
            console.error('[Automation action failed]', run.run_id, err.message);
            error = current.action_code === 'notification' ? 'Could not create the alert.' : 'Could not create the follow-up task.';
        }
        const { rows: [result] } = await client.query(
            `UPDATE ops.automation_runs SET status = $2, result_id = $3, error = $4, duration_ms = $5
             WHERE run_id = $1 RETURNING *`,
            [run.run_id, error ? 'failed' : 'succeeded', error ? null : resultId, error, Math.round(performance.now() - start)]
        );
        await client.query('COMMIT');
        return result;
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}

export const AutomationService = {
    async list() {
        const [rules, runs, summary] = await Promise.all([
            pool.query(`SELECT a.*, count(r.run_id)::int AS runs_count,
                count(r.run_id) FILTER (WHERE r.status = 'succeeded')::int AS succeeded_count,
                max(r.created_at) AS last_run
                FROM ops.automation_rules a LEFT JOIN ops.automation_runs r USING (rule_id)
                WHERE a.archived_at IS NULL GROUP BY a.rule_id ORDER BY a.created_at DESC`),
            pool.query('SELECT * FROM ops.automation_runs ORDER BY created_at DESC, run_id DESC LIMIT 50'),
            pool.query(`SELECT count(*)::int AS executions,
                count(*) FILTER (WHERE status = 'succeeded')::int AS succeeded,
                round(avg(duration_ms))::int AS avg_duration
                FROM ops.automation_runs WHERE created_at >= now() - interval '24 hours'`)
        ]);
        return { automations: rules.rows, runs: runs.rows, metrics: summary.rows[0],
            triggers: automationTriggers, actions: automationActions };
    },

    async create(input) {
        const { rows: [rule] } = await pool.query(
            `INSERT INTO ops.automation_rules (name, description, trigger_code, action_code, action_text, enabled)
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
            validateRule({ ...input, enabled: input.enabled ?? true })
        );
        return rule;
    },

    async update(id, changes) {
        const { rows: [before] } = await pool.query(
            'SELECT * FROM ops.automation_rules WHERE rule_id::text = $1 AND archived_at IS NULL', [id]);
        if (!before) throw notFound();
        const values = validateRule({ ...before, ...changes });
        const { rows: [rule] } = await pool.query(
            `UPDATE ops.automation_rules SET name = $2, description = $3, trigger_code = $4,
                action_code = $5, action_text = $6, enabled = $7
             WHERE rule_id = $1 AND archived_at IS NULL RETURNING *`, [before.rule_id, ...values]);
        if (!rule) throw notFound();
        return rule;
    },

    async archive(id) {
        const result = await pool.query(
            'UPDATE ops.automation_rules SET archived_at = now(), enabled = false WHERE rule_id::text = $1 AND archived_at IS NULL',
            [id]);
        if (!result.rowCount) throw notFound();
    },

    async runManual(id, actor) {
        const { rows: [rule] } = await pool.query(
            'SELECT rule_id FROM ops.automation_rules WHERE rule_id::text = $1 AND archived_at IS NULL', [id]);
        if (!rule) throw notFound();
        const result = await execute(rule, { trigger: 'manual', key: randomUUID(), actor, target: null });
        if (!result) throw Object.assign(new Error('Enable the rule before running it.'), { status: 409 });
        return result;
    },

    async onLeadSaved(trigger, { leadId, eventId, target }) {
        try {
            const { rows } = await pool.query(
                'SELECT rule_id FROM ops.automation_rules WHERE trigger_code = $1 AND enabled AND archived_at IS NULL',
                [trigger]);
            const event = { trigger, key: `${trigger}:${eventId || leadId}`, leadId, target, actor: 'Automation engine' };
            const results = await Promise.allSettled(rows.map(rule => execute(rule, event)));
            for (const result of results) {
                if (result.status === 'rejected') console.error('[Automation event failed]', trigger, result.reason.message);
            }
        } catch (error) {
            // The imported lead is already committed and remains available for review.
            console.error('[Automation dispatch failed]', trigger, error.message);
        }
    }
};
