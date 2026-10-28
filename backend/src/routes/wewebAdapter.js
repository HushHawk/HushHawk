import { Router } from 'express';
import { db } from '../store/database.js';

export const wwRouter = Router();

// In-memory + persisted store for Tasks (shared between Tasks grid and Calendar)
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
    {
        id: 'task-103',
        title: 'Property walkthrough at 9102 Baymeadows Rd with Robert Wilson',
        category: 'Appointments',
        due_time: '2026-10-26',
        priority: 'Medium',
        is_completed: false,
    },
    {
        id: 'task-104',
        title: 'Follow up on EMD confirmation for 4521 Lenox Ave ($2,500 held)',
        category: 'Title & Escrow',
        due_time: '2026-10-27',
        priority: 'High',
        is_completed: false,
    },
    {
        id: 'task-105',
        title: 'Cash Buyer match blast for 7890 Loneleaf Rd (Target: $18K assignment)',
        category: 'Dispositions',
        due_time: '2026-10-28',
        priority: 'Medium',
        is_completed: false,
    },
    {
        id: 'task-106',
        title: 'Duval County tax deed auction list review (Batch 09)',
        category: 'Intelligence',
        due_time: '2026-10-29',
        priority: 'Low',
        is_completed: false,
    },
    {
        id: 'task-107',
        title: 'Direct Mail Batch 04 tracking verification with USPS Formax',
        category: 'Marketing',
        due_time: '2026-10-30',
        priority: 'Medium',
        is_completed: false,
    },
    {
        id: 'task-108',
        title: 'Skip trace probate filings for Duval & Clay counties',
        category: 'Skip Tracing',
        due_time: '2026-10-24',
        priority: 'High',
        is_completed: true,
    },
    {
        id: 'task-109',
        title: 'Closing and assignment funding for 3456 Cedar Point Dr ($18,400 fee)',
        category: 'Closed',
        due_time: '2026-10-22',
        priority: 'High',
        is_completed: true,
    },
];

// Unified Sellers Directory (for Contacts page & CRM)
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
    {
        id: 'sel-2',
        seller_name: 'Maria L. Gonzalez',
        phone: '(904) 555-2234',
        email: 'maria.gonzalez@example.com',
        property_address: '5678 Pine Crest Ln, Jacksonville, FL 32256',
        lead_status: 'Contacted',
        lead_score: 88,
    },
    {
        id: 'sel-3',
        seller_name: 'Robert T. Wilson',
        phone: '(904) 555-6678',
        email: 'robert.wilson@example.com',
        property_address: '9102 Baymeadows Rd, Jacksonville, FL 32256',
        lead_status: 'Appointment Set',
        lead_score: 92,
    },
    {
        id: 'sel-4',
        seller_name: 'Denise M. Harris',
        phone: '(904) 555-7789',
        email: 'denise.harris@example.com',
        property_address: '3456 Cedar Point Dr, Jacksonville, FL 32226',
        lead_status: 'Under Contract',
        lead_score: 96,
    },
    {
        id: 'sel-5',
        seller_name: 'Anthony K. Brooks',
        phone: '(904) 555-1122',
        email: 'anthony.brooks@example.com',
        property_address: '7890 Loneleaf Rd, Jacksonville, FL 32277',
        lead_status: 'Offer Made',
        lead_score: 85,
    },
    {
        id: 'sel-6',
        seller_name: 'Patricia S. Adams',
        phone: '(904) 555-3344',
        email: 'patricia.adams@example.com',
        property_address: '2468 Willow Oak Ln, Jacksonville, FL 32257',
        lead_status: 'Contacted',
        lead_score: 79,
    },
    {
        id: 'sel-7',
        seller_name: 'Michael D. Thompson',
        phone: '(904) 555-5566',
        email: 'michael.t@example.com',
        property_address: '1357 River Marsh Dr, Jacksonville, FL 32223',
        lead_status: 'Follow Up',
        lead_score: 82,
    },
    {
        id: 'sel-8',
        seller_name: 'Linda F. White',
        phone: '(904) 555-8899',
        email: 'linda.white@example.com',
        property_address: '9753 Hidden Creek Dr, Jacksonville, FL 32216',
        lead_status: 'New',
        lead_score: 90,
    },
];

// Unified Cash Buyers Directory (for Contacts page & Dispositions)
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
    {
        id: 'buy-2',
        full_name: 'Elena Rostova',
        phone: '(904) 555-4422',
        email: 'elena@apexfloridaproperties.com',
        company: 'Apex Florida RE Group',
        status: 'Active VIP Buyer',
        buy_box: 'Arlington / Southside Rentals',
    },
    {
        id: 'buy-3',
        full_name: 'Darius Washington',
        phone: '(904) 555-7711',
        email: 'dwashington@firstcoastflips.com',
        company: 'First Coast Renovations LLC',
        status: 'Active Cash Buyer',
        buy_box: 'Heavy Fix & Flip 32208 / 32209',
    },
    {
        id: 'buy-4',
        full_name: 'Samantha Sterling',
        phone: '(904) 555-3838',
        email: 'ssterling@sterlingequityfl.com',
        company: 'Sterling Equity Partners',
        status: 'Active Institutional Buyer',
        buy_box: 'Turnkey & BRRRR 32256 / 32257',
    },
    {
        id: 'buy-5',
        full_name: 'Trevor McKnight',
        phone: '(904) 555-6600',
        email: 'trevor@jaxmultifamilyfund.com',
        company: 'Jax Multifamily Fund',
        status: 'Active Buyer',
        buy_box: 'Duplex / Quadplex $150K-$450K',
    },
];

// ----------------------------------------------------------------------------
// 1. Table-Views Endpoint (used by Tasks, Calendar, Contacts)
// ----------------------------------------------------------------------------
wwRouter.get('/table-views/:id', (req, res) => {
    const { id } = req.params;

    if (id === 'eedfb6bb-2d89-45f8-a956-c5cfb6405d9e') {
        // Tasks & Calendar
        return res.json({
            data: savedTasks,
            metadata: {
                total: savedTasks.length,
                limit: 50,
                offset: 0,
                hasMore: false,
            },
        });
    }

    if (id === '5fc4b493-1e9e-4de8-8102-668c1e8a00aa') {
        // Seller Contacts
        return res.json({
            data: sellerContacts,
            metadata: {
                total: sellerContacts.length,
                limit: 50,
                offset: 0,
                hasMore: false,
            },
        });
    }

    if (id === 'ca272979-bb2b-4aa6-8386-e24b42b62b8b') {
        // Cash Buyer Contacts
        return res.json({
            data: buyerContacts,
            metadata: {
                total: buyerContacts.length,
                limit: 50,
                offset: 0,
                hasMore: false,
            },
        });
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
function handleWorkflow(req, res) {
    const { id } = req.params;
    const body = req.body || {};
    const params = body.parameters || body || {};

    // Workflow: Create dated task (966c595d-ddeb-4090-80d8-0c79703152b6)
    if (id === '966c595d-ddeb-4090-80d8-0c79703152b6') {
        const p = params['table:priorities'] || params.rowData || params;
        const newTask = {
            id: 'task-' + Date.now(),
            title: p.title || 'Untitled task',
            category: p.category || 'General',
            due_time: p.due_time || new Date().toISOString().slice(0, 10),
            priority: p.priority || 'Medium',
            is_completed: Boolean(p.is_completed),
        };
        savedTasks.unshift(newTask);
        console.log('[HushHawk Tasks] Created new task:', newTask.title, 'Due:', newTask.due_time);
        return res.json({ success: true, message: 'Task saved.', task: newTask });
    }

    // Workflow: Toggle complete (dc65bd76-0e32-4eb7-8776-ffb5a37fd32f)
    if (id === 'dc65bd76-0e32-4eb7-8776-ffb5a37fd32f') {
        const rowId = params['Row ID'] || params.rowId || params.id;
        const task = savedTasks.find(t => t.id === rowId);
        if (task) {
            task.is_completed = !task.is_completed;
            console.log('[HushHawk Tasks] Toggled task completion:', task.title, 'Now:', task.is_completed);
            return res.json({ success: true, message: 'Task updated.', task });
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
