/**
 * @file backend/src/services/dealFunnelService.js
 * Canonical PostgreSQL Deal-Flow Funnel Service
 * Queries and updates crm.deal_funnel in AWS RDS PostgreSQL directly.
 */

import crypto from 'crypto';
import { pool } from '../store/pgClient.js';
import { db } from '../store/database.js';

export const MILESTONES = [
    {
        index: 0,
        code: '01',
        name: 'Lead received',
        phase: 'Acquisitions',
        phaseCode: 'ACQ',
        route: '/acquisitions',
        color: '#187ed4',
        description: 'New verified seller inquiry recorded in database across marketing channels'
    },
    {
        index: 1,
        code: '02',
        name: 'Contact made',
        phase: 'Acquisitions',
        phaseCode: 'ACQ',
        route: '/acquisitions',
        color: '#268dc7',
        description: 'Direct discovery dialogue opened; condition and seller motivation assessed'
    },
    {
        index: 2,
        code: '03',
        name: 'Appointment',
        phase: 'Acquisitions',
        phaseCode: 'ACQ',
        route: '/acquisitions',
        color: '#3b77d0',
        description: 'Field walkthrough or valuation inspection booked with property owner'
    },
    {
        index: 3,
        code: '04',
        name: 'Offer sent',
        phase: 'Acquisitions',
        phaseCode: 'ACQ',
        route: '/acquisitions',
        color: '#7b63d1',
        description: 'Formal wholesale purchase offer delivered and under owner consideration'
    },
    {
        index: 4,
        code: '05',
        name: 'Signed',
        phase: 'Contracts & Title',
        phaseCode: 'CONTRACTS',
        route: '/contracts',
        color: '#9a57c0',
        description: 'Purchase & Sale Agreement signed by seller; legally binding contract'
    },
    {
        index: 5,
        code: '06',
        name: 'Sent to title',
        phase: 'Contracts & Title',
        phaseCode: 'CONTRACTS',
        route: '/contracts',
        color: '#b55b94',
        description: 'Escrow file opened with title company; title commitment & lien exam ordered'
    },
    {
        index: 6,
        code: '07',
        name: 'EMD confirmed',
        phase: 'Contracts & Title',
        phaseCode: 'CONTRACTS',
        route: '/contracts',
        color: '#bc7770',
        description: 'Wholesale earnest money deposit wire verified by title escrow officer'
    },
    {
        index: 7,
        code: '08',
        name: 'Title cleared',
        phase: 'Contracts & Title',
        phaseCode: 'CONTRACTS',
        route: '/contracts',
        color: '#c99339',
        description: 'Municipal lien search and title commitment clean; clear to close issued'
    },
    {
        index: 8,
        code: '09',
        name: 'Dispo launched',
        phase: 'Dispositions & Closing',
        phaseCode: 'DISPO',
        route: '/dispositions',
        color: '#d2a93c',
        description: 'Property marketing package syndicated to verified VIP cash buyer pool'
    },
    {
        index: 9,
        code: '10',
        name: 'Buyer chosen',
        phase: 'Dispositions & Closing',
        phaseCode: 'DISPO',
        route: '/dispositions',
        color: '#78b854',
        description: 'Winning cash buyer selected with verified proof of funds and closing terms'
    },
    {
        index: 10,
        code: '11',
        name: 'Assignment',
        phase: 'Dispositions & Closing',
        phaseCode: 'DISPO',
        route: '/dispositions',
        color: '#3ca962',
        description: 'Assignment agreement executed with buyer; non-refundable deposit held'
    },
    {
        index: 11,
        code: '12',
        name: 'Closed + funded',
        phase: 'Dispositions & Closing',
        phaseCode: 'DISPO',
        route: '/dispositions',
        color: '#0fa85a',
        description: 'Transaction closed at title; wholesale assignment fee wired and disbursed'
    }
];

export class DealFunnelService {
    /**
     * Map database row to standard funnel deal entity
     */
    static mapRow(row) {
        return {
            id: row.id,
            code: row.code,
            milestoneIndex: Number(row.milestone_index),
            propertyId: row.property_id,
            address: row.address_line1 || row.address,
            city: row.city || '',
            state: row.state_code || row.state || '',
            zip: row.postal_code || row.zip || '',
            county: row.county || '',
            seller: row.seller,
            phone: row.phone || '—',
            email: row.email || '—',
            buyer: row.buyer || '—',
            buyPrice: Number(row.buy_price || 0),
            arv: Number(row.arv || 0),
            repairs: Number(row.repairs || 0),
            fee: Number(row.fee || 0),
            titleAgency: row.title_agency || '',
            fileNumber: row.file_number || '',
            closingDate: row.closing_date ? new Date(row.closing_date).toISOString().split('T')[0] : null,
            daysInStage: Number(row.days_in_stage || 0),
            source: row.source || '',
            notes: row.notes || '',
            history: Array.isArray(row.history) ? row.history : [],
            created_at: row.created_at,
            updated_at: row.updated_at
        };
    }

    /**
     * Get complete Deal-Flow Funnel dataset from PostgreSQL RDS database
     */
    static async getFunnel() {
        let deals = [];
        try {
            const res = await pool.query(`
                SELECT df.*, p.address_line1, p.city, p.postal_code, p.assessed_value, p.legal_description
                FROM crm.deal_funnel df
                LEFT JOIN core.properties p ON df.property_id = p.property_id
                ORDER BY df.milestone_index ASC, df.updated_at DESC
            `);
            deals = res.rows.map(this.mapRow);
        } catch (dbErr) {
            throw dbErr;
        }

        const totalDeals = deals.length;
        const totalPipelineVolume = deals.reduce((sum, d) => sum + (d.buyPrice || 0), 0);
        const totalProjectedRevenue = deals.reduce((sum, d) => sum + (d.fee || 0), 0);
        const totalArv = deals.reduce((sum, d) => sum + (d.arv || d.buyPrice * 1.5 || 0), 0);

        const milestoneData = MILESTONES.map((m, idx) => {
            const stageDeals = deals.filter(d => d.milestoneIndex === idx);
            const count = stageDeals.length;
            const volume = stageDeals.reduce((sum, d) => sum + (d.buyPrice || 0), 0);
            const fee = stageDeals.reduce((sum, d) => sum + (d.fee || 0), 0);
            const conversionRate = totalDeals > 0 ? Math.round((count / totalDeals) * 100) : 0;

            return {
                ...m,
                count,
                volume,
                fee,
                conversionRate,
                deals: stageDeals.map(d => ({
                    ...d,
                    milestoneName: m.name,
                    phase: m.phase
                }))
            };
        });

        const phases = [
            {
                name: 'Acquisitions',
                range: '01 - 04',
                route: '/acquisitions',
                dealCount: deals.filter(d => d.milestoneIndex >= 0 && d.milestoneIndex <= 3).length,
                volume: deals.filter(d => d.milestoneIndex >= 0 && d.milestoneIndex <= 3).reduce((sum, d) => sum + (d.buyPrice || 0), 0),
                fee: deals.filter(d => d.milestoneIndex >= 0 && d.milestoneIndex <= 3).reduce((sum, d) => sum + (d.fee || 0), 0)
            },
            {
                name: 'Contracts & Title',
                range: '05 - 08',
                route: '/contracts',
                dealCount: deals.filter(d => d.milestoneIndex >= 4 && d.milestoneIndex <= 7).length,
                volume: deals.filter(d => d.milestoneIndex >= 4 && d.milestoneIndex <= 7).reduce((sum, d) => sum + (d.buyPrice || 0), 0),
                fee: deals.filter(d => d.milestoneIndex >= 4 && d.milestoneIndex <= 7).reduce((sum, d) => sum + (d.fee || 0), 0)
            },
            {
                name: 'Dispositions & Closing',
                range: '09 - 12',
                route: '/dispositions',
                dealCount: deals.filter(d => d.milestoneIndex >= 8 && d.milestoneIndex <= 11).length,
                volume: deals.filter(d => d.milestoneIndex >= 8 && d.milestoneIndex <= 11).reduce((sum, d) => sum + (d.buyPrice || 0), 0),
                fee: deals.filter(d => d.milestoneIndex >= 8 && d.milestoneIndex <= 11).reduce((sum, d) => sum + (d.fee || 0), 0)
            }
        ];

        return {
            source: 'PostgreSQL-AWS-RDS',
            totalDeals,
            totalPipelineVolume,
            totalProjectedRevenue,
            totalArv,
            phases,
            milestones: milestoneData
        };
    }

    /**
     * Advance a deal to next or target milestone in PostgreSQL
     */
    static async advanceDeal({ dealId, targetMilestoneIndex, notes = '', actor = 'USER_WEB' }) {
        let newIndex = Number(targetMilestoneIndex);
        if (isNaN(newIndex) || newIndex < 0 || newIndex > 11) {
            throw new Error(`Invalid milestone index: ${targetMilestoneIndex}`);
        }

        const nextMilestone = MILESTONES[newIndex];
        const historyEntry = JSON.stringify([{
            toMilestone: nextMilestone.name,
            timestamp: new Date().toISOString(),
            actor,
            notes
        }]);

        let updatedDeal = null;
        try {
            const res = await pool.query(`
                UPDATE crm.deal_funnel
                SET milestone_index = $1,
                    days_in_stage = 0,
                    notes = CASE WHEN $2 <> '' THEN $2 || ' | ' || COALESCE(notes, '') ELSE notes END,
                    history = COALESCE(history, '[]'::jsonb) || $3::jsonb,
                    updated_at = now()
                WHERE id = $4
                RETURNING *
            `, [newIndex, notes || '', historyEntry, dealId]);

            if (res.rows.length === 0) {
                throw new Error(`Deal ${dealId} not found in PostgreSQL database`);
            }
            updatedDeal = this.mapRow(res.rows[0]);
        } catch (dbErr) {
            throw dbErr;
        }

        // Keep local contracts store in sync
        this.syncContractsStore();

        // Audit log
        db.logAudit({
            actor,
            action: 'DEAL_MILESTONE_ADVANCED',
            entityType: 'DEAL',
            entityId: dealId,
            redactedDiff: { to: nextMilestone.name, newMilestoneIndex: newIndex }
        });

        const funnel = await this.getFunnel();
        return {
            success: true,
            deal: updatedDeal,
            nextMilestone,
            funnel
        };
    }

    /**
     * Create a new deal directly in PostgreSQL
     */
    static async createDeal(dealData, actor) {
        const required = ['address', 'seller'];
        for (const key of required) {
            if (!dealData[key] || !String(dealData[key]).trim()) throw new Error(`${key} is required to create a deal.`);
        }
        const dealId = dealData.id || ('deal-' + crypto.randomUUID());
        const milestoneIndex = Math.max(0, Math.min(11, Number(dealData.milestoneIndex || 0)));
        const code = dealData.code || `HH-${new Date().getUTCFullYear()}-${crypto.randomInt(1000, 9999)}`;
        const num = v => (v === undefined || v === null || v === '' || Number.isNaN(Number(v)) ? 0 : Number(v));

        const res = await pool.query(`
            INSERT INTO crm.deal_funnel (
                id, code, milestone_index, address, city, state, zip, county,
                seller, phone, email, buyer, buy_price, arv, repairs, fee,
                title_agency, file_number, closing_date, days_in_stage, source, notes, created_at, updated_at
            ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,0,$20,$21, now(), now())
            ON CONFLICT (id) DO UPDATE SET updated_at = crm.deal_funnel.updated_at
            RETURNING *
        `, [
            dealId, code, milestoneIndex, String(dealData.address).trim(),
            dealData.city || null, dealData.state || null, dealData.zip || null, dealData.county || null,
            String(dealData.seller).trim(), dealData.phone || null, dealData.email || null, dealData.buyer || null,
            num(dealData.buyPrice), num(dealData.arv), num(dealData.repairs), num(dealData.fee),
            dealData.titleAgency || null, dealData.fileNumber || null, dealData.closingDate || null,
            dealData.source || null, dealData.notes || null
        ]);
        const saved = this.mapRow(res.rows[0]);
        await db.logAudit({ actor, action: 'DEAL_CREATED', entityType: 'DEAL', entityId: null, redactedDiff: { dealId, code } });
        this.syncContractsStore();
        return saved;
    }

    /**
     * Update deal in PostgreSQL
     */
    static async updateDeal(dealId, updates) {
        try {
            const res = await pool.query(`
                UPDATE crm.deal_funnel
                SET address = COALESCE($1, address),
                    seller = COALESCE($2, seller),
                    buyer = COALESCE($3, buyer),
                    buy_price = COALESCE($4, buy_price),
                    fee = COALESCE($5, fee),
                    notes = COALESCE($6, notes),
                    updated_at = now()
                WHERE id = $7
                RETURNING *
            `, [
                updates.address || null,
                updates.seller || null,
                updates.buyer || null,
                updates.buyPrice ? Number(updates.buyPrice) : null,
                updates.fee ? Number(updates.fee) : null,
                updates.notes || null,
                dealId
            ]);
            if (res.rows.length) return this.mapRow(res.rows[0]);
        } catch (dbErr) {
            throw dbErr;
        }
        return null;
    }

    /**
     * Delete deal in PostgreSQL
     */
    static async deleteDeal(dealId) {
        try {
            const res = await pool.query('DELETE FROM crm.deal_funnel WHERE id = $1 RETURNING *', [dealId]);
            if (res.rows.length) return this.mapRow(res.rows[0]);
        } catch (dbErr) {
            throw dbErr;
        }
        return null;
    }

    /**
     * Synchronize deals in contract/dispo milestones into memory contracts
     */
    static async syncContractsStore() {
        try {
            const res = await pool.query(`
                SELECT * FROM crm.deal_funnel WHERE milestone_index >= 4 ORDER BY milestone_index ASC
            `);
            if (res.rows.length && db.data.crm) {
                db.data.crm.contracts = res.rows.map(row => ({
                    id: row.id,
                    code: row.code,
                    address: row.address,
                    zip: row.zip,
                    type: 'PSA',
                    seller: row.seller,
                    buyer: row.buyer || '—',
                    buyPrice: Number(row.buy_price || 0),
                    fee: Number(row.fee || 0),
                    titleAgency: row.title_agency || '',
                    fileNumber: row.file_number,
                    closingDate: row.closing_date ? new Date(row.closing_date).toISOString().split('T')[0] : null,
                    status: row.milestone_index === 11 ? 'Closed/Funded' :
                            row.milestone_index >= 9 ? 'Assigned' :
                            row.milestone_index >= 7 ? 'Clear to Close' :
                            row.milestone_index >= 5 ? 'In Escrow' : 'Executed PSA',
                    statusClass: row.milestone_index === 11 ? 'status-closed' :
                                 row.milestone_index >= 9 ? 'status-assigned' :
                                 row.milestone_index >= 7 ? 'status-clear' : 'status-escrow',
                    milestones: [
                        { name: 'Purchase & Sale Executed', detail: 'Signed', completed: row.milestone_index >= 4 },
                        { name: 'Sent to Title Company', detail: 'Escrow opened', completed: row.milestone_index >= 5 },
                        { name: 'Seller EMD Verified', detail: 'EMD verified', completed: row.milestone_index >= 6 },
                        { name: 'Title Commitment & Municipal Lien', detail: 'Title clear', completed: row.milestone_index >= 7 },
                        { name: 'Dispositions Launch', detail: 'Marketed to VIP pool', completed: row.milestone_index >= 8 },
                        { name: 'Buyer Selected & Vetted', detail: row.buyer || 'Pending', completed: row.milestone_index >= 9 },
                        { name: 'Assignment of Contract Executed', detail: 'Assignment signed', completed: row.milestone_index >= 10 },
                        { name: 'Closing & Funds Disbursed', detail: 'Fee collected', completed: row.milestone_index === 11 }
                    ],
                    docs: [{ name: `Executed_Contract_${row.address.replace(/[^a-zA-Z0-9]/g, '_')}.pdf` }]
                }));
            }
        } catch (e) {
            console.error('[DealFunnelService] contract sync failed:', e.message);
        }
    }
}
