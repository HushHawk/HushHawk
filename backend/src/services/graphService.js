import { pool } from '../store/pgClient.js';
import { renderCrownKey } from '../../../packages/crownkey/index.js';

const neo4jConfigured = () => Boolean(process.env.NEO4J_HTTP_URL && process.env.NEO4J_USER && process.env.NEO4J_PASSWORD);

/** Runs Cypher statements through Neo4j's transactional HTTP endpoint. */
async function neo4j(statements) {
    const base = process.env.NEO4J_HTTP_URL.replace(/\/$/, '');
    const db = process.env.NEO4J_DATABASE || 'neo4j';
    const auth = Buffer.from(`${process.env.NEO4J_USER}:${process.env.NEO4J_PASSWORD}`).toString('base64');
    const response = await fetch(`${base}/db/${db}/tx/commit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Basic ${auth}` },
        body: JSON.stringify({ statements }),
        signal: AbortSignal.timeout(30_000)
    });
    if (!response.ok) throw new Error(`Neo4j returned HTTP ${response.status}.`);
    const body = await response.json();
    if (body.errors?.length) throw new Error(body.errors.map(e => e.message).join('; '));
    return body.results;
}

/** Idempotent MERGE statements keyed on the SQL UUID: Neo4j never mints its own identity. */
async function statementsFor(row) {
    const { aggregate_type: type, aggregate_id: id } = row;
    if (type === 'PILLAR_EVENT') {
        const { rows: [e] } = await pool.query(
            `SELECT e.*, p.parcel_raw, c.county_code FROM core.pillar_events e JOIN core.properties p USING (property_id) JOIN ref.counties c ON c.county_id = p.county_id WHERE e.event_id = $1`, [id]);
        if (!e) return [];
        return [{
            statement: `MERGE (p:Property {id: $propertyId}) SET p.parcel_raw = $parcel, p.county_code = $county
                        MERGE (e:PillarEvent {id: $id}) SET e.pillar_code = $pillar, e.event_number = $number, e.event_status = $status, e.verification_status = $verification
                        MERGE (p)-[:HAS_EVENT]->(e)`,
            parameters: { id, propertyId: e.property_id, parcel: e.parcel_raw, county: e.county_code, pillar: e.pillar_code, number: Number(e.event_number), status: e.event_status, verification: e.verification_status }
        }];
    }
    if (type === 'LEAD') {
        const { rows: [l] } = await pool.query(`SELECT l.*, (SELECT array_agg(event_id) FROM core.lead_event_links WHERE lead_id = l.lead_id AND verification_status <> 'REJECTED') AS event_ids FROM core.leads l WHERE lead_id = $1`, [id]);
        if (!l) return [];
        const stmts = [{ statement: `MERGE (l:Lead {id: $id}) SET l.first_source_code = $source, l.status = $status`, parameters: { id, source: l.first_source_code, status: l.status } }];
        if (l.property_id) stmts.push({ statement: `MATCH (l:Lead {id: $id}) MERGE (p:Property {id: $propertyId}) MERGE (l)-[:CONCERNS]->(p)`, parameters: { id, propertyId: l.property_id } });
        for (const eventId of l.event_ids || []) stmts.push({ statement: `MATCH (l:Lead {id: $id}) MERGE (e:PillarEvent {id: $eventId}) MERGE (l)-[:RELATES_TO]->(e)`, parameters: { id, eventId } });
        return stmts;
    }
    if (type === 'PROPERTY') {
        const { rows: [p] } = await pool.query(`SELECT p.*, c.county_code FROM core.properties p JOIN ref.counties c USING (county_id) WHERE property_id = $1`, [id]);
        return p ? [{ statement: `MERGE (p:Property {id: $id}) SET p.parcel_raw = $parcel, p.county_code = $county`, parameters: { id, parcel: p.parcel_raw, county: p.county_code } }] : [];
    }
    if (type === 'SOURCE_RECORD_EVIDENCE') return []; // SUPPORTS edges are created from rel.event_evidence by reconciliation
    return []; // aggregate types without a graph projection are acknowledged only
}

export class GraphService {
    static isConfigured() { return neo4jConfigured(); }

    /** Outbox worker: publishes pending messages to Neo4j; failures are retried with the error recorded. */
    static async syncOutbox({ batchSize = 50 } = {}) {
        if (!neo4jConfigured()) return { configured: false, published: 0, failed: 0 };
        const client = await pool.connect();
        let published = 0; let failed = 0;
        try {
            await client.query('BEGIN');
            const { rows } = await client.query(
                `SELECT * FROM ops.outbox_events WHERE published_at IS NULL AND attempts < 10 ORDER BY created_at LIMIT $1 FOR UPDATE SKIP LOCKED`, [batchSize]);
            for (const row of rows) {
                try {
                    const statements = await statementsFor(row);
                    if (statements.length) await neo4j(statements);
                    await client.query('UPDATE ops.outbox_events SET published_at = now(), attempts = attempts + 1, last_error = NULL WHERE outbox_id = $1', [row.outbox_id]);
                    published++;
                } catch (error) {
                    await client.query('UPDATE ops.outbox_events SET attempts = attempts + 1, last_error = $2 WHERE outbox_id = $1', [row.outbox_id, error.message.slice(0, 500)]);
                    failed++;
                }
            }
            await client.query('COMMIT');
        } catch (error) {
            await client.query('ROLLBACK').catch(() => {});
            throw error;
        } finally {
            client.release();
        }
        return { configured: true, published, failed };
    }

    /** Relationship view built from Postgres, the authoritative source. */
    static async getGraphProjection({ filterEntityId = null, limit = 300 } = {}) {
        const cap = Math.min(Number(limit) || 300, 1000);
        const nodes = []; const edges = [];
        const focus = filterEntityId && /^[0-9a-f-]{36}$/i.test(filterEntityId) ? filterEntityId : null;

        const { rows: props } = await pool.query(
            `SELECT p.property_id, p.parcel_raw, p.address_line1, p.assessed_value, c.county_code
             FROM core.properties p JOIN ref.counties c USING (county_id)
             WHERE ($1::uuid IS NULL OR p.property_id = $1
                    OR p.property_id IN (SELECT property_id FROM core.leads WHERE lead_id = $1)
                    OR p.property_id IN (SELECT property_id FROM core.pillar_events WHERE event_id = $1))
             ORDER BY p.updated_at DESC LIMIT $2`, [focus, cap]);
        const propIds = props.map(p => p.property_id);
        for (const p of props) {
            nodes.push({ id: p.property_id, label: 'Property', name: renderCrownKey({ countyCode: p.county_code, parcelRaw: p.parcel_raw }), subtext: p.address_line1, countyCode: p.county_code, type: 'PROPERTY' });
        }
        if (!propIds.length) return { nodes, edges };

        const [{ rows: events }, { rows: leads }, { rows: leadEvents }, { rows: evidence }] = await Promise.all([
            pool.query(`SELECT e.*, p.parcel_raw, c.county_code FROM core.pillar_events e JOIN core.properties p USING (property_id) JOIN ref.counties c ON c.county_id = p.county_id WHERE e.property_id = ANY($1::uuid[])`, [propIds]),
            pool.query(`SELECT l.lead_id, l.property_id, l.person_id, l.first_source_code, l.status, pe.full_name FROM core.leads l LEFT JOIN core.people pe USING (person_id) WHERE l.property_id = ANY($1::uuid[])`, [propIds]),
            pool.query(`SELECT le.lead_id, le.event_id, le.verification_status FROM core.lead_event_links le JOIN core.leads l USING (lead_id) WHERE l.property_id = ANY($1::uuid[])`, [propIds]),
            pool.query(`SELECT ee.event_id, ee.source_record_id, ee.verification_status, sr.source_system FROM rel.event_evidence ee JOIN core.pillar_events e USING (event_id) JOIN raw.source_records sr USING (source_record_id) WHERE e.property_id = ANY($1::uuid[])`, [propIds])
        ]);
        for (const e of events) {
            nodes.push({ id: e.event_id, label: 'PillarEvent', name: renderCrownKey({ countyCode: e.county_code, parcelRaw: e.parcel_raw, pillarCode: e.pillar_code, eventNumber: e.event_number }), subtext: `${e.event_status} · ${e.verification_status}`, type: 'EVENT' });
            edges.push({ from: e.property_id, to: e.event_id, type: 'HAS_EVENT', verification: e.verification_status });
        }
        for (const l of leads) {
            nodes.push({ id: l.lead_id, label: 'Lead', name: l.full_name || 'Lead', subtext: `${l.first_source_code || 'UNKNOWN'} · ${l.status}`, type: 'LEAD' });
            edges.push({ from: l.lead_id, to: l.property_id, type: 'CONCERNS' });
        }
        for (const le of leadEvents) edges.push({ from: le.lead_id, to: le.event_id, type: 'RELATES_TO', verification: le.verification_status });
        const seenSources = new Set();
        for (const ev of evidence) {
            if (!seenSources.has(ev.source_record_id)) {
                seenSources.add(ev.source_record_id);
                nodes.push({ id: ev.source_record_id, label: 'SourceRecord', name: ev.source_system, type: 'SOURCE' });
            }
            edges.push({ from: ev.source_record_id, to: ev.event_id, type: 'SUPPORTS', verification: ev.verification_status });
        }
        return { nodes, edges };
    }

    /** Compares SQL counts with Neo4j and reports real outbox lag. */
    static async runReconciliation() {
        const [{ rows: [sql] }, { rows: [outbox] }] = await Promise.all([
            pool.query(`SELECT (SELECT count(*) FROM core.properties)::int AS properties, (SELECT count(*) FROM core.pillar_events)::int AS events, (SELECT count(*) FROM core.leads)::int AS leads`),
            pool.query(`SELECT count(*) FILTER (WHERE published_at IS NULL)::int AS pending,
                               count(*) FILTER (WHERE published_at IS NULL AND attempts >= 10)::int AS dead,
                               coalesce(extract(epoch FROM now() - min(created_at) FILTER (WHERE published_at IS NULL)), 0)::int AS oldest_pending_seconds
                        FROM ops.outbox_events`)
        ]);
        const report = { configured: neo4jConfigured(), sql, outbox, graph: null, status: 'NOT_CONFIGURED' };
        if (!report.configured) return report;
        try {
            const [r] = await neo4j([
                { statement: 'MATCH (n:Property) RETURN count(n) AS c' },
                { statement: 'MATCH (n:PillarEvent) RETURN count(n) AS c' },
                { statement: 'MATCH (n:Lead) RETURN count(n) AS c' }
            ]).then(res => [res.map(x => x.data[0].row[0])]);
            report.graph = { properties: r[0], events: r[1], leads: r[2] };
            const inSync = r[0] === sql.properties && r[1] === sql.events && r[2] === sql.leads && outbox.pending === 0;
            report.status = outbox.dead > 0 ? 'DEGRADED' : inSync ? 'IN_SYNC' : 'SYNCING';
        } catch (error) {
            report.status = 'UNREACHABLE';
            report.error = error.message;
        }
        return report;
    }
}
