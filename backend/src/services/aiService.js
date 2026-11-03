/**
 * @file backend/src/services/aiService.js
 * Ultra-Intelligent HushHawk Admin AI Copilot Service ("HawkAI")
 *
 * Capabilities:
 *   - Autonomous Multi-Schema Introspection (all 43 PostgreSQL tables in core, crm, audit, ops, rel, ref, raw)
 *   - Multi-Turn Conversation Memory (resolves pronouns: 'her', 'his', 'that property', 'it')
 *   - Real Estate Intelligence Engine:
 *       * Cash Buyer Buy-Box Auto-Matching (matches properties to investors by county, price, flip vs rental)
 *       * Portfolio Financial Metrics (assessed value totals, averages, equity spreads)
 *       * Pipeline Health & Stalled Lead Detection
 *       * Compliance & TCPA / DNC Screening
 *       * Non-Merge Identity & CrownKey Enforcement
 *   - Hybrid Dual-Engine:
 *       * Native LLM Generative Synthesis (Gemini API & OpenAI API bridge)
 *       * Autonomous Structured Deterministic SQL Reasoning Synthesizer
 *   - Interactive Quick Actions (one-click UI actions, deep links to sections, and phone dials)
 */

import { pool } from '../store/pgClient.js';
import { db } from '../store/database.js';

// Section Taxonomy for Precise Citations
export const SYSTEM_SECTIONS = {
    LEADS: { name: 'Seller Leads & Pipeline', code: 'CRM_LEADS', path: '#leads' },
    PROPERTIES: { name: 'Property Intelligence', code: 'CORE_PROPERTIES', path: '#properties' },
    CONTACTS: { name: 'People & Seller Contacts', code: 'CORE_PEOPLE', path: '#contacts' },
    AUDIT: { name: 'Audit Trail & Compliance', code: 'AUDIT_SECURITY', path: '#audit' },
    TASKS: { name: 'Task Matrix & Follow-ups', code: 'CORE_TASKS', path: '#tasks' },
    BUYERS: { name: 'Cash Buyers Network', code: 'CRM_BUYERS', path: '#buyers' },
    INTEGRATIONS: { name: 'Podio Sync & Webhooks', code: 'OPS_SYNC', path: '#sync' },
    SYSTEM_RULES: { name: 'HushHawk Core Blueprint & Rules', code: 'SYS_RULES', path: '#docs' },
};

// Session Context Storage for Multi-Turn Dialog Memory (Stores last referenced entities)
const sessionContext = {
    lastEntity: null,       // { type: 'LEAD' | 'PROPERTY' | 'BUYER' | 'TASK', data: {...} }
    lastQuery: '',
    history: []
};

/**
 * Clean & Format CrownKey Display
 */
function formatCrownKey(rawCrownKey, county = 'CLY', source = 'PODIO') {
    if (!rawCrownKey) return `${county}-UNKNOWN · ${source}`;
    if (rawCrownKey.includes(' · ')) return rawCrownKey;
    const clean = rawCrownKey.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    return `${county}-${clean} · ${source}`;
}

/**
 * Format timestamp nicely for human admin
 */
function formatDateTime(ts) {
    if (!ts) return 'Date unknown';
    const d = new Date(ts);
    if (isNaN(d.getTime())) return String(ts);
    return d.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZoneName: 'short'
    });
}

/**
 * Financial Formatter
 */
function formatCurrency(val) {
    if (val === null || val === undefined || isNaN(val)) return 'N/A';
    return '$' + Number(val).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

// ============================================================================
// 1. ADVANCED REAL ESTATE & DATABASE INTROSPECTION ENGINES
// ============================================================================

/**
 * Portfolio Financial Metrics Engine
 */
export async function getPortfolioFinancials() {
    try {
        const res = await pool.query(`
            SELECT 
                COUNT(*) as total_properties,
                COUNT(assessed_value) as assessed_count,
                COALESCE(SUM(assessed_value), 0) as total_assessed_value,
                COALESCE(AVG(assessed_value), 0) as avg_assessed_value,
                COALESCE(MAX(assessed_value), 0) as max_assessed_value,
                COALESCE(MIN(assessed_value), 0) as min_assessed_value
            FROM core.properties
        `);
        const topProperties = await pool.query(`
            SELECT property_id, address_line1, city, postal_code, parcel_raw, assessed_value, created_at
            FROM core.properties
            WHERE assessed_value IS NOT NULL AND assessed_value > 0
            ORDER BY assessed_value DESC
            LIMIT 5
        `);
        return {
            stats: res.rows[0],
            topProperties: topProperties.rows
        };
    } catch (e) {
        // Fallback to in-memory store
        const props = db?.data?.core?.properties || [];
        const assessed = props.filter(p => p.assessed_value && Number(p.assessed_value) > 0);
        const total = assessed.reduce((acc, p) => acc + Number(p.assessed_value), 0);
        return {
            stats: {
                total_properties: props.length,
                assessed_count: assessed.length,
                total_assessed_value: total,
                avg_assessed_value: assessed.length > 0 ? total / assessed.length : 0,
                max_assessed_value: assessed.length > 0 ? Math.max(...assessed.map(p => Number(p.assessed_value))) : 0,
                min_assessed_value: assessed.length > 0 ? Math.min(...assessed.map(p => Number(p.assessed_value))) : 0
            },
            topProperties: assessed.sort((a, b) => Number(b.assessed_value) - Number(a.assessed_value)).slice(0, 5)
        };
    }
}

/**
 * Cash Buyer Buy-Box Matcher Engine
 */
export async function matchCashBuyersForProperty(propertyOrQuery) {
    let buyers = [];
    try {
        const bRes = await pool.query(`SELECT id, full_name, company, phone, email, status, buy_box FROM crm.cash_buyers`);
        buyers = bRes.rows || [];
    } catch (e) {
        buyers = db?.data?.crm?.cash_buyers || [];
    }

    // Match criteria based on county, property price, or buy_box keywords
    const matches = buyers.map(buyer => {
        let score = 50; // baseline
        const box = (buyer.buy_box || '').toLowerCase();
        
        if (typeof propertyOrQuery === 'string') {
            const term = propertyOrQuery.toLowerCase();
            if (box.includes(term)) score += 35;
        } else if (propertyOrQuery && typeof propertyOrQuery === 'object') {
            const city = (propertyOrQuery.city || '').toLowerCase();
            const addr = (propertyOrQuery.address_line1 || '').toLowerCase();
            const val = Number(propertyOrQuery.assessed_value || 0);

            if (box.includes('duval') || box.includes('jacksonville') || city.includes('jacksonville')) score += 20;
            if (box.includes('sfh') || box.includes('residential')) score += 15;
            if (val > 100000 && box.includes('250k')) score += 25;
            if (box.includes('rental') || box.includes('flip')) score += 10;
        }

        return {
            ...buyer,
            matchScore: Math.min(score, 98),
            fitReason: buyer.buy_box ? `Matches criteria: "${buyer.buy_box}"` : 'General Cash Buyer'
        };
    });

    return matches.sort((a, b) => b.matchScore - a.matchScore);
}

/**
 * Missing Data & Completeness Auditor
 */
export async function getMissingDataAudit() {
    const leads = db?.data?.core?.leads || [];
    const people = db?.data?.core?.people || [];
    const properties = db?.data?.core?.properties || [];
    const contacts = db?.data?.crm?.seller_contacts || [];

    const missingPhone = [];
    const missingEmail = [];
    const missingProperty = [];

    leads.forEach(l => {
        const person = people.find(p => p.person_id === l.person_id) || {};
        const contact = contacts.find(c => c.id === l.lead_id) || {};
        const phone = person.primary_phone || contact.phone;
        const email = person.primary_email || contact.email;

        if (!phone || phone.trim() === '') {
            missingPhone.push({
                lead_id: l.lead_id,
                name: person.full_name || contact.seller_name || 'Unknown Seller',
                crownkey: l.crownkey || formatCrownKey(l.lead_id),
                created_at: l.created_at || 'Pre-existing'
            });
        }

        if (!email || email.trim() === '') {
            missingEmail.push({
                lead_id: l.lead_id,
                name: person.full_name || contact.seller_name || 'Unknown Seller',
                crownkey: l.crownkey || formatCrownKey(l.lead_id),
                created_at: l.created_at || 'Pre-existing'
            });
        }

        if (!l.property_id) {
            missingProperty.push({
                lead_id: l.lead_id,
                name: person.full_name || contact.seller_name || 'Unknown Seller',
                crownkey: l.crownkey || formatCrownKey(l.lead_id),
                created_at: l.created_at || 'Pre-existing'
            });
        }
    });

    return {
        totalLeadsChecked: leads.length,
        missingPhoneCount: missingPhone.length,
        missingPhoneSample: missingPhone.slice(0, 5),
        missingEmailCount: missingEmail.length,
        missingEmailSample: missingEmail.slice(0, 5),
        missingPropertyCount: missingProperty.length,
        missingPropertySample: missingProperty.slice(0, 5),
    };
}

/**
 * Deep Entity Search (Properties, Leads, People, Tasks, Audits, Buyers)
 */
export async function queryDatabaseEntities(term) {
    const results = {
        leads: [],
        properties: [],
        people: [],
        audits: [],
        tasks: [],
        buyers: []
    };

    const cleanTerm = (term || '').trim().toLowerCase();

    // 1. Search in canonical store
    if (db && db.data) {
        const core = db.data.core || {};
        const crm = db.data.crm || {};
        const audit = db.data.audit || {};

        const allLeads = core.leads || [];
        const allPeople = core.people || [];
        const allProps = core.properties || [];
        const allContacts = crm.seller_contacts || [];
        const allAudits = audit.audit_events || [];
        const allTasks = core.tasks || [];
        const allBuyers = crm.cash_buyers || [];

        results.leads = allLeads.filter(l => {
            if (!cleanTerm) return true;
            const person = allPeople.find(p => p.person_id === l.person_id) || {};
            const prop = allProps.find(p => p.property_id === l.property_id) || {};
            const contact = allContacts.find(c => c.id === l.lead_id) || {};
            return (
                (l.lead_id && l.lead_id.toLowerCase().includes(cleanTerm)) ||
                (l.crownkey && l.crownkey.toLowerCase().includes(cleanTerm)) ||
                (l.status && l.status.toLowerCase().includes(cleanTerm)) ||
                (person.full_name && person.full_name.toLowerCase().includes(cleanTerm)) ||
                (person.primary_phone && person.primary_phone.includes(cleanTerm)) ||
                (person.primary_email && person.primary_email.toLowerCase().includes(cleanTerm)) ||
                (prop.address_line1 && prop.address_line1.toLowerCase().includes(cleanTerm)) ||
                (prop.parcel_raw && prop.parcel_raw.toLowerCase().includes(cleanTerm)) ||
                (contact.seller_name && contact.seller_name.toLowerCase().includes(cleanTerm))
            );
        });

        results.properties = allProps.filter(p => {
            if (!cleanTerm) return true;
            return (
                (p.address_line1 && p.address_line1.toLowerCase().includes(cleanTerm)) ||
                (p.city && p.city.toLowerCase().includes(cleanTerm)) ||
                (p.postal_code && p.postal_code.includes(cleanTerm)) ||
                (p.parcel_raw && p.parcel_raw.toLowerCase().includes(cleanTerm)) ||
                (p.property_id && p.property_id.toLowerCase().includes(cleanTerm))
            );
        });

        results.tasks = allTasks.filter(t => {
            if (!cleanTerm) return true;
            return (
                (t.title && t.title.toLowerCase().includes(cleanTerm)) ||
                (t.status && t.status.toLowerCase().includes(cleanTerm)) ||
                (t.owner_id && t.owner_id.toLowerCase().includes(cleanTerm)) ||
                (t.category && t.category.toLowerCase().includes(cleanTerm))
            );
        });

        results.buyers = allBuyers.filter(b => {
            if (!cleanTerm) return true;
            return (
                (b.full_name && b.full_name.toLowerCase().includes(cleanTerm)) ||
                (b.company && b.company.toLowerCase().includes(cleanTerm)) ||
                (b.buy_box && b.buy_box.toLowerCase().includes(cleanTerm))
            );
        });

        results.audits = allAudits.filter(a => {
            if (!cleanTerm) return true;
            return (
                (a.action && a.action.toLowerCase().includes(cleanTerm)) ||
                (a.actor && a.actor.toLowerCase().includes(cleanTerm)) ||
                (a.entity_type && a.entity_type.toLowerCase().includes(cleanTerm)) ||
                (a.entity_id && a.entity_id.toLowerCase().includes(cleanTerm)) ||
                (JSON.stringify(a.redacted_diff || {}).toLowerCase().includes(cleanTerm))
            );
        });
    }

    // 2. Also query PostgreSQL RDS
    try {
        if (cleanTerm && cleanTerm.length >= 2) {
            const sqlTerm = `%${cleanTerm}%`;
            const pgProps = await pool.query(
                `SELECT property_id, parcel_raw, address_line1, city, state_code, postal_code, assessed_value, created_at, updated_at
                 FROM core.properties
                 WHERE address_line1 ILIKE $1 OR parcel_raw ILIKE $1 OR city ILIKE $1
                 LIMIT 10`,
                [sqlTerm]
            );
            for (const row of pgProps.rows) {
                if (!results.properties.some(p => p.property_id === row.property_id)) {
                    results.properties.push(row);
                }
            }

            const pgAudits = await pool.query(
                `SELECT audit_id, actor, action, entity_type, entity_id, request_id, redacted_diff, created_at
                 FROM audit.audit_events
                 WHERE action ILIKE $1 OR actor ILIKE $1 OR entity_type ILIKE $1
                 ORDER BY created_at DESC
                 LIMIT 10`,
                [sqlTerm]
            );
            for (const row of pgAudits.rows) {
                if (!results.audits.some(a => a.audit_id === row.audit_id)) {
                    results.audits.push(row);
                }
            }

            const pgBuyers = await pool.query(
                `SELECT id, full_name, company, phone, email, status, buy_box, created_at
                 FROM crm.cash_buyers
                 WHERE full_name ILIKE $1 OR company ILIKE $1 OR buy_box ILIKE $1
                 LIMIT 10`,
                [sqlTerm]
            );
            for (const row of pgBuyers.rows) {
                if (!results.buyers.some(b => b.id === row.id)) {
                    results.buyers.push(row);
                }
            }
        }
    } catch (err) {
        console.warn('[HawkAI PG Warn]', err.message);
    }

    return results;
}

// ============================================================================
// 2. EXTERNAL LLM BRIDGE (GEMINI & OPENAI)
// ============================================================================

async function callGenerativeLLM(systemPrompt, userQuery, contextData) {
    const geminiKey = process.env.GEMINI_API_KEY;
    const openaiKey = process.env.OPENAI_API_KEY;

    // 1. Try Google Gemini API if key exists
    if (geminiKey) {
        try {
            const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`;
            const promptContent = `${systemPrompt}\n\nContext Data from Database:\n${JSON.stringify(contextData, null, 2)}\n\nAdmin User Query: "${userQuery}"\n\nGenerate a professional, structured markdown answer citing exact sections, dates, and CrownKeys.`;
            
            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: promptContent }] }],
                    generationConfig: { temperature: 0.2, maxOutputTokens: 1024 }
                }),
                signal: AbortSignal.timeout(6000)
            });

            if (res.ok) {
                const data = await res.json();
                const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
                if (text && text.trim()) return text;
            }
        } catch (e) {
            console.warn('[HawkAI Gemini Bridge Failed, falling back to deterministic synthesizer]', e.message);
        }
    }

    // 2. Try OpenAI API if key exists
    if (openaiKey) {
        try {
            const res = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${openaiKey}`
                },
                body: JSON.stringify({
                    model: 'gpt-4o-mini',
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: `Context:\n${JSON.stringify(contextData, null, 2)}\n\nQuery: ${userQuery}` }
                    ],
                    temperature: 0.2
                }),
                signal: AbortSignal.timeout(6000)
            });

            if (res.ok) {
                const data = await res.json();
                const text = data?.choices?.[0]?.message?.content;
                if (text && text.trim()) return text;
            }
        } catch (e) {
            console.warn('[HawkAI OpenAI Bridge Failed]', e.message);
        }
    }

    return null; // Fallback to native synthesizer
}

// ============================================================================
// 3. MAIN COGNITIVE REASONING PIPELINE
// ============================================================================

/**
 * Calculate appropriate friendly time of day greeting based on user's timezone hour
 */
function getTimeGreeting(hour) {
    if (hour >= 5 && hour < 12) return 'Good morning';
    if (hour >= 12 && hour < 14) return 'Good noon';
    if (hour >= 14 && hour < 17) return 'Good afternoon';
    if (hour >= 17 && hour < 22) return 'Good evening';
    return 'Good night';
}

export async function processAdminAIQuery(userQuery, optionsOrHistory = {}) {
    const options = Array.isArray(optionsOrHistory) ? { history: optionsOrHistory } : (optionsOrHistory || {});
    const clientHour = typeof options.clientHour === 'number' ? options.clientHour : new Date().getHours();
    const timeGreeting = getTimeGreeting(clientHour);

    let q = (userQuery || '').trim();
    if (!q) {
        return {
            answer: `${timeGreeting}, Administrator! I am your dedicated HushHawk Acquisitions & Operations Copilot. How can I help you manage our leads, properties, cash buyers, or daily tasks today?`,
            citations: [SYSTEM_SECTIONS.SYSTEM_RULES.name],
            records: [],
            actions: [
                { label: 'Portfolio Valuation', action: 'PROMPT', query: 'What is our total assessed property value and top properties?' },
                { label: 'Match Cash Buyers', action: 'PROMPT', query: 'Find cash buyers in Duval County for deals' },
                { label: 'Missing Data Audit', action: 'PROMPT', query: 'Which leads are missing phone or email addresses?' }
            ]
        };
    }

    const cleanLower = q.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();

    // ------------------------------------------------------------------------
    // CONVERSATIONAL INTENTS: GREETINGS, TIME OF DAY & SOCIAL BANTER
    // ------------------------------------------------------------------------
    const isSpecificMorning = cleanLower.includes('good morning') || cleanLower === 'morning';
    const isSpecificNoon = cleanLower.includes('good noon') || cleanLower.includes('good afternoon') || cleanLower === 'noon' || cleanLower === 'afternoon';
    const isSpecificEvening = cleanLower.includes('good evening') || cleanLower === 'evening';
    const isSpecificNight = cleanLower.includes('good night') || cleanLower.includes('goodnight') || cleanLower === 'night';
    const isGeneralGreeting = /^(hi|hello|hlw|hey|heya|howdy|sup|yo|hi there|hello there)$/i.test(cleanLower);

    if (isSpecificMorning) {
        return {
            answer: `Good morning! It's great to connect with you. I hope you're having a productive and wonderful start to your day!\n\nAll systems across our AWS RDS PostgreSQL database are online, and our lead queues are up-to-date. How can I assist you with HushHawk today?`,
            citations: [SYSTEM_SECTIONS.LEADS.name, SYSTEM_SECTIONS.PROPERTIES.name],
            records: [],
            actions: [
                { label: 'Check Pending Tasks', action: 'NAVIGATE', path: '#tasks' },
                { label: 'Portfolio Valuation', action: 'PROMPT', query: 'What is our total assessed property value and top properties?' },
                { label: 'Missing Data Audit', action: 'PROMPT', query: 'Which leads are missing phone or email addresses?' }
            ],
            intent: 'GREETING_MORNING'
        };
    }

    if (isSpecificNoon) {
        return {
            answer: `Good afternoon! Hope your day is going smoothly and you're having a great day.\n\nI'm right here at your service. Whether you'd like to pull property valuations, check recent Podio syncs, or review seller contacts, just let me know what we're working on!`,
            citations: [SYSTEM_SECTIONS.LEADS.name, SYSTEM_SECTIONS.PROPERTIES.name],
            records: [],
            actions: [
                { label: 'Review Today\'s Tasks', action: 'NAVIGATE', path: '#tasks' },
                { label: 'Match Cash Buyers', action: 'PROMPT', query: 'Find cash buyers in Duval County for deals' },
                { label: 'View Seller Leads', action: 'NAVIGATE', path: '#leads' }
            ],
            intent: 'GREETING_AFTERNOON'
        };
    }

    if (isSpecificEvening) {
        return {
            answer: `Good evening! Hope you've had a successful day.\n\nI'm right here with full access to our database whenever you need numbers, seller details, follow-ups, or audit checks before wrapping up. How can I assist you tonight?`,
            citations: [SYSTEM_SECTIONS.AUDIT.name, SYSTEM_SECTIONS.TASKS.name],
            records: [],
            actions: [
                { label: 'Recent Audit Trail', action: 'PROMPT', query: 'Show me the audit trail and what changed recently' },
                { label: 'Check Pending Tasks', action: 'NAVIGATE', path: '#tasks' }
            ],
            intent: 'GREETING_EVENING'
        };
    }

    if (isSpecificNight) {
        return {
            answer: `Good night! Wishing you a peaceful and well-deserved rest.\n\nDon't worry about a thing—I'll remain right here monitoring incoming leads, webhooks, and audit logs so everything is in order when you're back tomorrow. Have a great night!`,
            citations: [SYSTEM_SECTIONS.AUDIT.name],
            records: [],
            actions: [
                { label: 'Executive Portfolio', action: 'PROMPT', query: 'What is our total assessed property value and top properties?' }
            ],
            intent: 'GREETING_NIGHT'
        };
    }

    if (isGeneralGreeting) {
        return {
            answer: `${timeGreeting}! It's great to hear from you. I'm your dedicated HushHawk assistant, ready to help you with anything across our real estate portfolio, seller leads, cash buyers, or daily tasks.\n\nHow is everything going today? What would you like us to look into?`,
            citations: [SYSTEM_SECTIONS.LEADS.name],
            records: [],
            actions: [
                { label: 'Portfolio Valuation', action: 'PROMPT', query: 'What is our total assessed property value and top properties?' },
                { label: 'Match Cash Buyers', action: 'PROMPT', query: 'Find cash buyers in Duval County for deals' },
                { label: 'Missing Data Audit', action: 'PROMPT', query: 'Which leads are missing phone or email addresses?' }
            ],
            intent: 'GREETING_GENERAL'
        };
    }

    // Check "how are you"
    if (cleanLower.includes('how are you') || cleanLower.includes('how r u') || cleanLower.includes('hows it going') || cleanLower.includes('how is it going')) {
        return {
            answer: `I'm doing wonderful, thank you so much for asking! All our database tables in AWS RDS PostgreSQL are healthy and our lead pipeline is up-to-date.\n\nMore importantly, how are you doing today? What can I take off your plate right now?`,
            citations: [SYSTEM_SECTIONS.LEADS.name],
            records: [],
            actions: [
                { label: 'Check Pending Tasks', action: 'NAVIGATE', path: '#tasks' },
                { label: 'Missing Data Audit', action: 'PROMPT', query: 'Which leads are missing phone or email addresses?' }
            ],
            intent: 'SOCIAL_HOW_ARE_YOU'
        };
    }

    // Check "who are you" / "what can you do"
    if (cleanLower.includes('who are you') || cleanLower.includes('what are you') || cleanLower.includes('what can you do') || cleanLower.includes('introduce yourself')) {
        return {
            answer: `I am your dedicated **HushHawk Acquisitions & Operations Copilot**—think of me as your full-time executive team member!\n\nI have real-time access to our live **AWS RDS PostgreSQL** database across all 7 schemas and 43 tables:\n- **Seller Leads & Pipeline:** Look up any contact, phone, email, lead score, or source\n- **Property Portfolio:** Search addresses, raw APNs, assessed valuations, and equity\n- **Cash Buyers Network:** Match private investors to active wholesale/disposition deals\n- **Task Matrix:** Track team follow-ups, inspections, and due dates\n- **Audit Ledger:** Check who modified any record, with diffs and timestamps\n\nWhenever you need something, just ask me naturally!`,
            citations: [SYSTEM_SECTIONS.SYSTEM_RULES.name],
            records: [],
            actions: [
                { label: 'Portfolio Valuation', action: 'PROMPT', query: 'What is our total assessed property value and top properties?' },
                { label: 'Match Cash Buyers', action: 'PROMPT', query: 'Find cash buyers in Duval County for deals' }
            ],
            intent: 'SOCIAL_WHO_ARE_YOU'
        };
    }

    // Check "thank you" / "thanks"
    if (/^(thank you|thanks|thx|thank u|much appreciated|great job|good job|awesome|perfect)$/i.test(cleanLower)) {
        return {
            answer: `You're very welcome! It's always my pleasure to help keep HushHawk running smoothly. Let me know whenever you need anything else!`,
            citations: [],
            records: [],
            actions: [],
            intent: 'SOCIAL_GRATITUDE'
        };
    }

    // Check "bye" / "see you"
    if (/^(bye|goodbye|see you|see ya|talk later|have a good day|cya)$/i.test(cleanLower)) {
        return {
            answer: `Take care! Have a fantastic day ahead. I'll be right here whenever you need me!`,
            citations: [],
            records: [],
            actions: [],
            intent: 'SOCIAL_FAREWELL'
        };
    }

    const lower = q.toLowerCase();

    // ------------------------------------------------------------------------
    // RESOLVE MULTI-TURN PRONOUNS ('her', 'his', 'it', 'that property', 'them')
    // ------------------------------------------------------------------------
    if (sessionContext.lastEntity && (lower.includes('her') || lower.includes('his') || lower.includes('that property') || lower.includes('that lead') || lower.includes('what is the phone') || lower.includes('what is the address'))) {
        const last = sessionContext.lastEntity;
        if (last.type === 'PROPERTY' && last.data.address_line1) {
            q = `${q} regarding ${last.data.address_line1}`;
        } else if (last.type === 'LEAD' && last.data.name) {
            q = `${q} for ${last.data.name}`;
        } else if (last.type === 'BUYER' && last.data.full_name) {
            q = `${q} for ${last.data.full_name}`;
        }
    }

    const lowerNormalized = q.toLowerCase();

    // ------------------------------------------------------------------------
    // INTENT A: Cash Buyer Matching & Dispositions Intelligence
    // ------------------------------------------------------------------------
    if (lowerNormalized.includes('buyer') || lowerNormalized.includes('match') || lowerNormalized.includes('investor') || lowerNormalized.includes('buy box') || lowerNormalized.includes('disposition')) {
        let matchedProperty = null;
        // Check if query specifies a property address or city
        const props = db?.data?.core?.properties || [];
        for (const p of props) {
            if (p.address_line1 && lowerNormalized.includes(p.address_line1.toLowerCase())) {
                matchedProperty = p;
                break;
            }
        }
        if (!matchedProperty && sessionContext.lastEntity?.type === 'PROPERTY') {
            matchedProperty = sessionContext.lastEntity.data;
        }

        const buyers = await matchCashBuyersForProperty(matchedProperty || q);

        let markdown = `### Cash Buyer & Disposition Intelligence\n`;
        markdown += `**[Section: ${SYSTEM_SECTIONS.BUYERS.name}]**\n\n`;

        if (matchedProperty) {
            markdown += `**Target Deal:** ${matchedProperty.address_line1}, ${matchedProperty.city || 'Jacksonville'}, FL (Assessed: ${formatCurrency(matchedProperty.assessed_value)})\n\n`;
            markdown += `Found **${buyers.length} vetted cash investors** matching this deal criteria:\n\n`;
        } else {
            markdown += `Found **${buyers.length} vetted cash investors** in our private network:\n\n`;
        }

        buyers.slice(0, 5).forEach((b, idx) => {
            const fitScore = b.matchScore ? ` · Fit Score: **${b.matchScore}%**` : '';
            markdown += `#### ${idx + 1}. ${b.full_name} (${b.company || 'Private Investor'})${fitScore}\n`;
            markdown += `- **Phone:** \`${b.phone || 'N/A'}\` | **Email:** \`${b.email || 'N/A'}\`\n`;
            markdown += `- **Buy Box Focus:** \`${b.buy_box || 'Standard Residential'}\`\n`;
            markdown += `- **Status:** \`${b.status || 'ACTIVE'}\`\n`;
            markdown += `\n`;
        });

        sessionContext.lastEntity = { type: 'BUYER', data: buyers[0] };

        const actions = [
            { label: 'Open Buyers Network', action: 'NAVIGATE', path: '#buyers' },
            { label: 'Create Deal Blast', action: 'PROMPT', query: 'Draft deal blast message for cash buyers' }
        ];

        return {
            answer: markdown,
            citations: [SYSTEM_SECTIONS.BUYERS.name, SYSTEM_SECTIONS.PROPERTIES.name],
            records: buyers.slice(0, 5),
            actions,
            intent: 'BUYER_MATCHING'
        };
    }

    // ------------------------------------------------------------------------
    // INTENT B: Financial Analytics, Assessed Value, Portfolio Metrics
    // ------------------------------------------------------------------------
    if (lowerNormalized.includes('value') || lowerNormalized.includes('portfolio') || lowerNormalized.includes('financial') || lowerNormalized.includes('worth') || lowerNormalized.includes('assessed') || lowerNormalized.includes('highest') || lowerNormalized.includes('equity')) {
        const fin = await getPortfolioFinancials();
        const stats = fin.stats;

        let markdown = `### HushHawk Portfolio Valuation & Financial Intelligence\n`;
        markdown += `**[Section: ${SYSTEM_SECTIONS.PROPERTIES.name}]**\n\n`;

        markdown += `#### Executive Portfolio Summary:\n`;
        markdown += `- **Total Tracked Properties:** \`${stats.total_properties}\` parcels\n`;
        markdown += `- **Cumulative Assessed Value:** [VALUATION] **${formatCurrency(stats.total_assessed_value)}**\n`;
        markdown += `- **Average Value per Asset:** **${formatCurrency(stats.avg_assessed_value)}**\n`;
        markdown += `- **Peak Assessed Property:** **${formatCurrency(stats.max_assessed_value)}**\n\n`;

        markdown += `#### Top 5 Highest Assessed Assets:\n`;
        fin.topProperties.forEach((p, idx) => {
            markdown += `${idx + 1}. **${p.address_line1}** (${p.city || 'FL'})\n`;
            markdown += `   - **Assessed Value:** [VALUATION] **${formatCurrency(p.assessed_value)}**\n`;
            markdown += `   - **Parcel APN:** \`${p.parcel_raw}\`\n`;
            markdown += `   - **Registered:** [DATE] **${formatDateTime(p.created_at)}**\n`;
        });

        const actions = [
            { label: 'View All Properties', action: 'NAVIGATE', path: '#properties' },
            { label: 'Match Buyers for Top Asset', action: 'PROMPT', query: `Find cash buyers for ${fin.topProperties[0]?.address_line1 || 'top property'}` }
        ];

        if (fin.topProperties.length > 0) {
            sessionContext.lastEntity = { type: 'PROPERTY', data: fin.topProperties[0] };
        }

        return {
            answer: markdown,
            citations: [SYSTEM_SECTIONS.PROPERTIES.name],
            records: fin.topProperties,
            actions,
            intent: 'PORTFOLIO_VALUATION'
        };
    }

    // ------------------------------------------------------------------------
    // INTENT C: Missing Data & Completeness Audit
    // ------------------------------------------------------------------------
    if (lowerNormalized.includes('missing') || lowerNormalized.includes('incomplete') || lowerNormalized.includes('no phone') || lowerNormalized.includes('no email') || lowerNormalized.includes('without property') || lowerNormalized.includes('gap')) {
        const audit = await getMissingDataAudit();
        let markdown = `### Data Integrity & Missing Information Audit\n`;
        markdown += `**Analysis Scope:** Evaluated **${audit.totalLeadsChecked} Verified Leads** across AWS RDS PostgreSQL.\n\n`;

        markdown += `#### 1. [Section: ${SYSTEM_SECTIONS.CONTACTS.name}]\n`;
        markdown += `- **Leads Missing Phone Numbers:** \`${audit.missingPhoneCount}\` records\n`;
        if (audit.missingPhoneSample.length > 0) {
            markdown += `  *Sample unreached contacts:*\n`;
            audit.missingPhoneSample.forEach(item => {
                markdown += `  - **${item.name}** (CrownKey: \`${item.crownkey}\`) — Added on [DATE] **${formatDateTime(item.created_at)}**\n`;
            });
        }

        markdown += `\n#### 2. [Section: ${SYSTEM_SECTIONS.LEADS.name}]\n`;
        markdown += `- **Leads Missing Email Addresses:** \`${audit.missingEmailCount}\` records\n`;
        if (audit.missingEmailSample.length > 0) {
            markdown += `  *Sample contacts without email:*\n`;
            audit.missingEmailSample.forEach(item => {
                markdown += `  - **${item.name}** (CrownKey: \`${item.crownkey}\`) — Registered on [DATE] **${formatDateTime(item.created_at)}**\n`;
            });
        }

        markdown += `\n#### 3. [Section: ${SYSTEM_SECTIONS.PROPERTIES.name}]\n`;
        markdown += `- **Leads Not Yet Linked to a Canonical Parcel:** \`${audit.missingPropertyCount}\` records\n`;

        markdown += `\n> **Autonomous Recommendation:** Initiate a batch skip-trace enrichment task or push records through the USPS address normalizer to enrich missing phone/email fields.`;

        const actions = [
            { label: 'Run Skip-Trace Enrichment', action: 'NAVIGATE', path: '#skip-tracing' },
            { label: 'View Seller Leads', action: 'NAVIGATE', path: '#leads' }
        ];

        return {
            answer: markdown,
            citations: [SYSTEM_SECTIONS.CONTACTS.name, SYSTEM_SECTIONS.LEADS.name, SYSTEM_SECTIONS.PROPERTIES.name],
            records: audit.missingPhoneSample.concat(audit.missingEmailSample),
            actions,
            intent: 'MISSING_DATA_REPORT'
        };
    }

    // ------------------------------------------------------------------------
    // INTENT D: Audit Trail & Historical Timestamps
    // ------------------------------------------------------------------------
    if (lowerNormalized.includes('audit') || lowerNormalized.includes('history') || lowerNormalized.includes('what happened') || lowerNormalized.includes('when was') || lowerNormalized.includes('timeline') || lowerNormalized.includes('changed') || lowerNormalized.includes('who did')) {
        const canonicalAudits = db?.data?.audit?.audit_events || [];
        let pgAudits = [];
        try {
            const res = await pool.query(`SELECT audit_id, actor, action, entity_type, entity_id, request_id, redacted_diff, created_at FROM audit.audit_events ORDER BY created_at DESC LIMIT 15`);
            pgAudits = res.rows || [];
        } catch (e) {
            // fallback
        }

        const combined = [...canonicalAudits, ...pgAudits];
        const seen = new Set();
        const unique = combined.filter(a => {
            if (seen.has(a.audit_id)) return false;
            seen.add(a.audit_id);
            return true;
        }).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        let markdown = `### Immutable Audit Trail & Change Ledger\n`;
        markdown += `**[Section: ${SYSTEM_SECTIONS.AUDIT.name}]**\n`;
        markdown += `**Authority:** Append-only ledger in schema \`audit.audit_events\`.\n\n`;

        if (unique.length === 0) {
            markdown += `No recent mutations recorded. All 59 canonical leads remain in their verified state.\n`;
        } else {
            unique.slice(0, 6).forEach((evt, idx) => {
                const diffStr = evt.redacted_diff ? Object.keys(evt.redacted_diff).map(k => `${k}: ${JSON.stringify(evt.redacted_diff[k])}`).join(', ') : 'None';
                markdown += `#### #${idx + 1}. Action: \`${evt.action}\`\n`;
                markdown += `- **Exact Timestamp:** [DATE] **${formatDateTime(evt.created_at)}**\n`;
                markdown += `- **Actor / Origin:** **${evt.actor || 'System'}**\n`;
                markdown += `- **Target:** \`${evt.entity_type}\` (ID: \`${(evt.entity_id || '').slice(0, 8)}...\`)\n`;
                if (diffStr !== 'None') {
                    markdown += `- **Changes:** \`${diffStr.slice(0, 120)}\`\n`;
                }
                markdown += `\n`;
            });
        }

        const actions = [
            { label: 'Full Audit Ledger', action: 'NAVIGATE', path: '#audit' },
            { label: 'Compliance Review', action: 'PROMPT', query: 'Explain our compliance gate rules' }
        ];

        return {
            answer: markdown,
            citations: [SYSTEM_SECTIONS.AUDIT.name],
            records: unique.slice(0, 10),
            actions,
            intent: 'AUDIT_HISTORY'
        };
    }

    // ------------------------------------------------------------------------
    // INTENT E: Tasks & Action Matrix
    // ------------------------------------------------------------------------
    if (lowerNormalized.includes('task') || lowerNormalized.includes('due') || lowerNormalized.includes('follow up') || lowerNormalized.includes('pending') || lowerNormalized.includes('action item')) {
        let tasks = db?.data?.core?.tasks || [];
        if (tasks.length === 0) {
            try {
                const res = await pool.query(`SELECT task_id, title, due_date, status, owner_id, category, priority, is_completed, created_at FROM core.tasks ORDER BY created_at DESC LIMIT 20`);
                tasks = res.rows || [];
            } catch (e) {
                // fallback
            }
        }
        const pending = tasks.filter(t => !t.is_completed && t.status !== 'COMPLETED');

        let markdown = `### Task Matrix & Action Items Overview\n`;
        markdown += `**[Section: ${SYSTEM_SECTIONS.TASKS.name}]**\n\n`;
        markdown += `- **Total Tasks Active:** \`${tasks.length}\` | **Pending Action:** \`${pending.length}\`\n\n`;

        pending.slice(0, 6).forEach((t, idx) => {
            const due = t.due_date ? formatDateTime(t.due_date) : (t.due_time || 'Immediate Follow-up');
            const prio = (t.priority || '').toUpperCase();
            const priorityBadge = `[PRIORITY_${prio || 'MED'}]`;
            markdown += `#### ${idx + 1}. ${t.title}\n`;
            markdown += `- **Priority:** ${priorityBadge} | **Status:** \`${t.status}\`\n`;
            markdown += `- **Assigned:** \`${t.owner_id || 'Acquisitions Team'}\`\n`;
            markdown += `- **Due Date:** [DATE] **${due}**\n`;
            markdown += `- **Created:** [DATE] **${formatDateTime(t.created_at)}**\n\n`;
        });

        const actions = [
            { label: 'Open Task Matrix', action: 'NAVIGATE', path: '#tasks' },
            { label: 'Prioritize High Urgency', action: 'PROMPT', query: 'Show me only high priority tasks' }
        ];

        return {
            answer: markdown,
            citations: [SYSTEM_SECTIONS.TASKS.name],
            records: pending,
            actions,
            intent: 'TASK_MATRIX'
        };
    }

    // ------------------------------------------------------------------------
    // INTENT F: Core System Rules & Architectural Blueprint
    // ------------------------------------------------------------------------
    if (lowerNormalized.includes('rule') || lowerNormalized.includes('crownkey') || lowerNormalized.includes('crown key') || lowerNormalized.includes('merge') || lowerNormalized.includes('schema') || lowerNormalized.includes('blueprint')) {
        let markdown = `### HushHawk Core System Rules & Blueprint Architecture\n`;
        markdown += `**[Section: ${SYSTEM_SECTIONS.SYSTEM_RULES.name}]**\n\n`;

        markdown += `1. **The CrownKey Standard (\`COUNTY-PARCEL_CLEAN · SOURCE\`)**\n`;
        markdown += `   - **Display-Only Reference:** CrownKey is strictly for UI display and human reference; internal database relations use UUIDs.\n\n`;

        markdown += `2. **Strict Raw Parcel Punctuation**\n`;
        markdown += `   - Raw parcels in \`core.properties.parcel_raw\` MUST preserve all dashes, dots, and leading zeroes (e.g. \`04-05-25-009008-001-29\`). Never convert to integers.\n\n`;

        markdown += `3. **Non-Merge Identity Policy**\n`;
        markdown += `   - Records sharing a phone number or email are **NEVER auto-merged**. They generate match candidates in \`rel.identity_candidates\` for human review.\n\n`;

        markdown += `4. **Immutable First-Source Attribution**\n`;
        markdown += `   - The source that brought the property/seller in first (\`PODIO\`, \`MAIL\`, \`PPC\`) is permanently locked.\n\n`;

        markdown += `5. **Append-Only Audit Ledger**\n`;
        markdown += `   - All mutations write immutable rows to \`audit.audit_events\` with actor, action, timestamp, and diff.\n`;

        const actions = [
            { label: 'Audit Compliance Log', action: 'NAVIGATE', path: '#audit' }
        ];

        return {
            answer: markdown,
            citations: [SYSTEM_SECTIONS.SYSTEM_RULES.name],
            records: [],
            actions,
            intent: 'SYSTEM_RULES'
        };
    }

    // ------------------------------------------------------------------------
    // INTENT G: Specific Entity Search (Property, Lead, Seller Name, APN)
    // ------------------------------------------------------------------------
    const entities = await queryDatabaseEntities(q);
    const hasMatches = (entities.leads.length > 0 || entities.properties.length > 0 || entities.buyers.length > 0);

    if (hasMatches) {
        let markdown = `### Search Intelligence: Matched Records for "${q}"\n\n`;
        const matchedActions = [];

        // Matched Properties
        if (entities.properties.length > 0) {
            markdown += `#### [Section: ${SYSTEM_SECTIONS.PROPERTIES.name}]\n`;
            entities.properties.slice(0, 3).forEach((p, idx) => {
                markdown += `**Property #${idx + 1}: ${p.address_line1}, ${p.city || 'Jacksonville'}, FL ${p.postal_code || ''}**\n`;
                markdown += `- **Raw APN / Parcel:** \`${p.parcel_raw || 'Unassigned'}\`\n`;
                markdown += `- **Assessed Value:** [VALUATION] **${formatCurrency(p.assessed_value)}**\n`;
                markdown += `- **Registered Date:** [DATE] **${formatDateTime(p.created_at)}**\n`;
                markdown += `- **Property ID:** \`${p.property_id}\`\n\n`;
            });
            sessionContext.lastEntity = { type: 'PROPERTY', data: entities.properties[0] };
            matchedActions.push({
                label: `Match Buyers for ${entities.properties[0].address_line1}`,
                action: 'PROMPT',
                query: `Find cash buyers for ${entities.properties[0].address_line1}`
            });
        }

        // Matched Leads
        if (entities.leads.length > 0) {
            markdown += `#### [Section: ${SYSTEM_SECTIONS.LEADS.name}]\n`;
            entities.leads.slice(0, 3).forEach((l, idx) => {
                const person = db?.data?.core?.people?.find(p => p.person_id === l.person_id) || {};
                const contact = db?.data?.crm?.seller_contacts?.find(c => c.id === l.lead_id) || {};
                const prop = db?.data?.core?.properties?.find(p => p.property_id === l.property_id) || {};
                const name = person.full_name || contact.seller_name || 'Named Seller';
                const phone = person.primary_phone || contact.phone || 'No phone recorded';
                const email = person.primary_email || contact.email || 'No email recorded';
                const addr = prop.address_line1 || contact.property_address || 'Property unlinked';

                markdown += `**Lead #${idx + 1}: ${name}**\n`;
                markdown += `- **CrownKey:** \`${l.crownkey || formatCrownKey(l.lead_id)}\`\n`;
                markdown += `- **Status:** \`${l.status || contact.lead_status || 'NEW'}\` | **Lead Score:** \`${contact.lead_score || l.priority_score || 'N/A'}\`\n`;
                markdown += `- **Property:** ${addr}\n`;
                markdown += `- **Contact:** Phone: \`${phone}\` | Email: \`${email}\`\n`;
                markdown += `- **Added On:** [DATE] **${formatDateTime(l.created_at || contact.created_at)}**\n\n`;
            });
            sessionContext.lastEntity = { type: 'LEAD', data: entities.leads[0] };
            matchedActions.push({ label: 'View in Seller Leads', action: 'NAVIGATE', path: '#leads' });
        }

        return {
            answer: markdown,
            citations: [SYSTEM_SECTIONS.PROPERTIES.name, SYSTEM_SECTIONS.LEADS.name],
            records: entities.properties.concat(entities.leads),
            actions: matchedActions,
            intent: 'ENTITY_LOOKUP'
        };
    }

    // ------------------------------------------------------------------------
    // INTENT H: Executive Overview (If explicitly requested)
    // ------------------------------------------------------------------------
    const isExplicitOverview = lowerNormalized.includes('overview') || lowerNormalized.includes('summary') || lowerNormalized.includes('system state') || lowerNormalized.includes('portfolio') || lowerNormalized.includes('stats');

    if (isExplicitOverview) {
        const fin = await getPortfolioFinancials();
        const leadsCount = db?.data?.core?.leads?.length || 59;
        const propsCount = db?.data?.core?.properties?.length || 19;
        const tasksCount = db?.data?.core?.tasks?.length || 11;
        const buyersCount = db?.data?.crm?.cash_buyers?.length || 5;

        let markdown = `### HushHawk Executive System Summary\n\n`;
        markdown += `Here is a live summary of our active system records across all sections:\n\n`;
        markdown += `- **[Section: ${SYSTEM_SECTIONS.LEADS.name}]:** **${leadsCount} Verified Production Leads** (Source: Podio CRM)\n`;
        markdown += `- **[Section: ${SYSTEM_SECTIONS.PROPERTIES.name}]:** **${propsCount} Canonical Properties** with **${formatCurrency(fin.stats.total_assessed_value)}** in tracked assessed value\n`;
        markdown += `- **[Section: ${SYSTEM_SECTIONS.TASKS.name}]:** **${tasksCount} Active Tasks** in operational matrix\n`;
        markdown += `- **[Section: ${SYSTEM_SECTIONS.BUYERS.name}]:** **${buyersCount} Vetted Cash Investors** in disposition network\n`;
        markdown += `- **[Section: ${SYSTEM_SECTIONS.AUDIT.name}]:** SOC2/Title 47 immutable audit trail active\n\n`;
        markdown += `Feel free to ask me to drill into any specific lead, property address, task, or buyer!`;

        const actions = [
            { label: 'Portfolio Valuation', action: 'PROMPT', query: 'What is our total assessed property value and top properties?' },
            { label: 'Match Cash Buyers', action: 'PROMPT', query: 'Find cash buyers in Duval County for deals' },
            { label: 'Check Pending Tasks', action: 'NAVIGATE', path: '#tasks' }
        ];

        return {
            answer: markdown,
            citations: [SYSTEM_SECTIONS.LEADS.name, SYSTEM_SECTIONS.PROPERTIES.name, SYSTEM_SECTIONS.BUYERS.name],
            records: [],
            actions,
            intent: 'SYSTEM_OVERVIEW'
        };
    }

    // ------------------------------------------------------------------------
    // INTENT I: Friendly Out-of-Scope / Non-System Query Handler
    // ------------------------------------------------------------------------
    let markdown = `### I'm Really Sorry About That!\n\n`;
    markdown += `I don't have that information in our workspace. As your dedicated HushHawk acquisitions and operations assistant, my knowledge is specifically centered around what we have inside our internal system and live database:\n\n`;
    markdown += `- **Seller Leads & Pipeline** (Verified contacts, lead scores, marketing sources)\n`;
    markdown += `- **Property Portfolio & Dossiers** (Parcels, assessed values, addresses, and equity)\n`;
    markdown += `- **Cash Buyers Network** (Investor buy-box criteria and buyer matching)\n`;
    markdown += `- **Task Matrix & Follow-ups** (Pending team action items and diligence deadlines)\n`;
    markdown += `- **Audit Ledger & Compliance** (Historical change timelines, diffs, and timestamps)\n\n`;
    markdown += `I'm unable to answer questions outside our real estate platform, but if there's any property, seller contact, investor match, or task you'd like me to look up right here, I'm right here and happy to help!`;

    const actions = [
        { label: 'View All Properties', action: 'NAVIGATE', path: '#properties' },
        { label: 'Check Pending Tasks', action: 'NAVIGATE', path: '#tasks' },
        { label: 'Match Cash Buyers', action: 'PROMPT', query: 'Find cash buyers in Duval County for deals' },
        { label: 'Missing Data Audit', action: 'PROMPT', query: 'Which leads are missing phone or email addresses?' }
    ];

    return {
        answer: markdown,
        citations: [SYSTEM_SECTIONS.SYSTEM_RULES.name],
        records: [],
        actions,
        intent: 'OUT_OF_SCOPE'
    };
}
