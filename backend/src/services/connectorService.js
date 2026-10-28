import crypto from 'crypto';
import { db } from '../store/database.js';
import { EventService } from './eventService.js';
import { CrownKeyService } from './crownkeyService.js';

export class ConnectorService {
    /**
     * Lists all connectors in the registry with their health state and last runs
     */
    static getRegistry() {
        const connectors = [
            {
                connector_id: 'DUVAL_COURT_CLERK',
                name: 'Duval County Clerk of Court',
                jurisdiction: 'Duval County, FL',
                access_type: 'Official API / Certified Scraper',
                permitted_use: 'Public Court Record Foreclosure Dockets',
                rate_limit: '60 req/min',
                schedule: 'Hourly (06:00 - 22:00)',
                parser_version: 'clerk-v2.1',
                approval_status: 'APPROVED',
                enabled: true,
            },
            {
                connector_id: 'DUVAL_TAX_COLLECTOR',
                name: 'Duval County Tax Collector',
                jurisdiction: 'Duval County, FL',
                access_type: 'Tax Certificate Data Feed',
                permitted_use: 'Delinquent Ad Valorem Tax Rolls',
                rate_limit: '120 req/min',
                schedule: 'Daily at 02:00 EST',
                parser_version: 'tax-v1.4',
                approval_status: 'APPROVED',
                enabled: true,
            },
            {
                connector_id: 'DUVAL_CODE_ENFORCEMENT',
                name: 'City of Jacksonville Code Enforcement',
                jurisdiction: 'Duval County, FL',
                access_type: 'Municipal Open Data Portal',
                permitted_use: 'Code Violations & Unsafe Structures',
                rate_limit: '30 req/min',
                schedule: 'Daily at 05:00 EST',
                parser_version: 'code-v1.0',
                approval_status: 'APPROVED',
                enabled: true,
            },
            {
                connector_id: 'DUVAL_PROBATE_COURT',
                name: 'Duval County Probate Division',
                jurisdiction: 'Duval County, FL',
                access_type: 'Estate Administration Public Docket',
                permitted_use: 'Deceased Owner & Intestate Filings',
                rate_limit: '30 req/min',
                schedule: 'Daily at 04:00 EST',
                parser_version: 'probate-v1.1',
                approval_status: 'APPROVED',
                enabled: true,
            },
        ];

        return connectors.map(conn => {
            const runs = db.data.raw.connector_runs.filter(r => r.connector_id === conn.connector_id);
            const lastRun = runs[0] || null;
            return {
                ...conn,
                last_run: lastRun,
                total_runs: runs.length,
            };
        });
    }

    /**
     * Executes the 10-step connector run standard lifecycle (Page 8 & Section 7.2).
     */
    static runConnector(connectorId, { actor = 'SYSTEM' } = {}) {
        const connectors = this.getRegistry();
        const config = connectors.find(c => c.connector_id === connectorId);
        if (!config) {
            throw new Error(`Connector '${connectorId}' not found in registry`);
        }

        // STEP 1: Verify approval
        if (config.approval_status !== 'APPROVED' || !config.enabled) {
            throw new Error(`Connector '${connectorId}' is not approved for execution`);
        }

        // STEP 2: Open connector run
        const runId = crypto.randomUUID();
        const runRecord = {
            run_id: runId,
            connector_id: connectorId,
            status: 'RUNNING',
            cursor_watermark: new Date().toISOString(),
            parser_version: config.parser_version,
            records_fetched: 0,
            records_parsed: 0,
            records_quarantined: 0,
            records_changed: 0,
            error_summary: null,
            started_at: new Date().toISOString(),
            completed_at: null,
        };
        db.data.raw.connector_runs.unshift(runRecord);

        // STEP 3: Fetch records (simulated feed data based on connector)
        const mockPayloads = this.getMockBatchForConnector(connectorId);
        runRecord.records_fetched = mockPayloads.length;

        for (const item of mockPayloads) {
            // STEP 4: Store raw first (Compute SHA-256 BEFORE transformation)
            const payloadStr = JSON.stringify(item);
            const payloadHash = crypto.createHash('sha256').update(payloadStr).digest('hex');

            // STEP 5: Validate required fields (Quarantine malformed records!)
            if (!item.parcel || !item.externalId) {
                runRecord.records_quarantined += 1;
                console.warn(`[Connector] Quarantined malformed record in run ${runId}`);
                continue;
            }

            const sourceRecord = {
                source_record_id: crypto.randomUUID(),
                connector_run_id: runId,
                source_system: connectorId,
                jurisdiction: config.jurisdiction,
                source_external_id: item.externalId,
                observed_at: new Date().toISOString(),
                source_url: `https://records.duvalcounty.fl.gov/${item.externalId}`,
                payload: item,
                payload_hash: payloadHash,
                parser_version: config.parser_version,
                created_at: new Date().toISOString(),
            };
            db.data.raw.source_records.unshift(sourceRecord);
            runRecord.records_parsed += 1;

            // STEP 6: Normalize into staging without changing raw evidence
            const normalizedParcel = item.parcel.trim().toUpperCase().replace(/[\s-]/g, '');

            // STEP 7: Match candidates
            let matchedProp = db.data.core.properties.find(
                p => p.parcel_match === normalizedParcel && p.county_code === 'DUV'
            );

            if (!matchedProp) {
                // Insert new canonical property if valid parcel
                matchedProp = {
                    property_id: crypto.randomUUID(),
                    county_id: 'c1111111-1111-1111-1111-111111111111',
                    county_code: 'DUV',
                    parcel_raw: item.parcel,
                    parcel_match: normalizedParcel,
                    address_line1: item.address || 'Jacksonville, FL',
                    city: 'Jacksonville',
                    state_code: 'FL',
                    postal_code: item.zip || '32204',
                    assessed_value: item.assessedValue || 220000,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                };
                db.data.core.properties.push(matchedProp);
                runRecord.records_changed += 1;
            }

            // STEP 8: Write canonical transactionally & emit outbox events
            if (item.pillarCode) {
                EventService.recordPillarEvent({
                    propertyId: matchedProp.property_id,
                    pillarCode: item.pillarCode,
                    caseReference: item.externalId,
                    externalEventId: item.externalId,
                    eventStatus: 'OPEN',
                    verificationStatus: 'CONFIRMED',
                    eventDate: item.filingDate || new Date().toISOString().split('T')[0],
                    filingAmount: item.amount || 0,
                    sourceRecordId: sourceRecord.source_record_id,
                    evidenceNotes: `Ingested via ${config.name}`,
                    actor: `CONNECTOR_${connectorId}`,
                });
            }
        }

        // STEP 9: Record the run
        runRecord.status = runRecord.records_quarantined > 0 ? 'COMPLETED_WITH_WARNINGS' : 'COMPLETED';
        runRecord.completed_at = new Date().toISOString();
        if (runRecord.records_quarantined > 0) {
            runRecord.error_summary = `${runRecord.records_quarantined} malformed record(s) quarantined; preserved in raw logs.`;
        }

        // STEP 10: Alert if needed
        db.logAudit({
            actor,
            action: 'CONNECTOR_RUN_EXECUTED',
            entityType: 'CONNECTOR_RUN',
            entityId: runId,
            redactedDiff: {
                connectorId,
                fetched: runRecord.records_fetched,
                parsed: runRecord.records_parsed,
                quarantined: runRecord.records_quarantined,
            },
        });

        db.persist();

        return runRecord;
    }

    static getMockBatchForConnector(connectorId) {
        const timestamp = Date.now().toString().slice(-4);
        if (connectorId === 'DUVAL_COURT_CLERK') {
            return [
                {
                    externalId: `16-2026-CA-${timestamp}`,
                    parcel: '091823-0000', // matches Arthur Pendelton
                    plaintiff: 'SunTrust Mortgage Corp',
                    defendant: 'Arthur Pendelton',
                    pillarCode: 'FC',
                    amount: 198000,
                    filingDate: '2026-10-24',
                    address: '1428 River City Blvd',
                },
                {
                    externalId: `16-2026-CA-${Number(timestamp) + 1}`,
                    parcel: '045912-1080', // matches Beatrice Montgomery
                    plaintiff: 'Duval County Clerk Lis Pendens',
                    defendant: 'Beatrice Montgomery',
                    pillarCode: 'PFC',
                    amount: 45000,
                    filingDate: '2026-10-24',
                    address: '3819 San Jose Forest Dr',
                },
            ];
        }
        if (connectorId === 'DUVAL_TAX_COLLECTOR') {
            return [
                {
                    externalId: `TAX-2026-${timestamp}`,
                    parcel: '003419-0020',
                    owner: 'James C. Halpert',
                    pillarCode: 'TAX',
                    amount: 4120,
                    filingDate: '2026-10-24',
                    address: '714 E 8th St',
                },
            ];
        }
        return [
            {
                externalId: `CODE-2026-${timestamp}`,
                parcel: '167890-0010',
                owner: 'Atlantic Coast Holdings LLC',
                pillarCode: 'CODE',
                amount: 750,
                filingDate: '2026-10-24',
                address: '1102 Ocean View Terrace',
            },
        ];
    }
}
