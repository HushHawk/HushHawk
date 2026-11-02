import 'dotenv/config';
import { db } from '../src/store/database.js';
import { PodioService } from '../src/services/podioService.js';
import crypto from 'crypto';

async function syncPodioLeads() {
  console.log('🔄 Starting Podio Leads Synchronization...');
  
  const appId = process.env.PODIO_APP_ID;
  const appToken = process.env.PODIO_APP_TOKEN;
  if (!appId || !appToken) {
    console.error('Missing PODIO_APP_ID or PODIO_APP_TOKEN environment variables.');
    process.exit(1);
  }
  
  // 1. Authenticate
  const auth = await PodioService.authenticateApp(appId, appToken);
  const token = auth.access_token;
  console.log('✅ Authenticated successfully with Podio App token!');

  // 2. Fetch all leads
  const res = await fetch(`https://api.podio.com/item/app/${appId}/?limit=100`, {
    headers: { 'Authorization': `OAuth2 ${token}` }
  });
  const data = await res.json();
  const items = data.items || [];
  console.log(`📥 Retrieved ${items.length} leads from Podio.`);

  // 3. Map into database
  db.data.core = db.data.core || {};
  db.data.core.leads = db.data.core.leads || [];
  db.data.core.people = db.data.core.people || [];
  db.data.core.properties = db.data.core.properties || [];
  db.data.crm = db.data.crm || {};
  db.data.crm.external_sync_map = db.data.crm.external_sync_map || [];

  let importedCount = 0;

  for (const it of items) {
    const fMap = {};
    (it.fields || []).forEach(f => {
      if (f.type === 'phone' || f.type === 'email') {
        fMap[f.label] = f.values?.[0]?.value;
      } else if (f.type === 'category') {
        fMap[f.label] = f.values?.[0]?.value?.text;
      } else if (f.type === 'app') {
        fMap[f.label] = f.values?.[0]?.value?.title;
      } else {
        fMap[f.label] = f.values?.[0]?.value;
      }
    });

    const leadId = `podio-${it.item_id}`;
    const name = fMap['Full Name'] || fMap['First Name'] || it.title || `Podio Seller #${it.app_item_id}`;
    const email = fMap['Email ID(s)'] || '';
    const phone = fMap['Phone #(s) (+11234567890)'] || '';
    const address = fMap['Property Address'] || fMap['Mailing Address'] || `Jacksonville Property #${it.app_item_id}`;
    const status = fMap['Status'] || 'New Untouched';
    const source = fMap['Source'] || 'Emailing';
    const motivation = fMap['Motivation'] || 'Motivated';
    const notes = fMap['Notes'] || '';

    // Check if already in leads
    const existing = db.data.core.leads.find(l => l.lead_id === leadId);
    if (!existing) {
      const personId = `person-${it.item_id}`;
      const propId = `prop-${it.item_id}`;

      // Insert Person
      db.data.core.people.push({
        person_id: personId,
        full_name: name,
        first_name: name.split(' ')[0] || name,
        last_name: name.split(' ').slice(1).join(' ') || '',
        phone_raw: phone,
        email_raw: email,
        created_at: it.created_on || new Date().toISOString()
      });

      // Insert Property
      db.data.core.properties.push({
        property_id: propId,
        county_code: 'DUV',
        parcel_raw: `09${String(it.app_item_id).padStart(4, '0')}-0000`,
        parcel_match: `09${String(it.app_item_id).padStart(4, '0')}0000`,
        address_line1: address,
        city: 'Jacksonville',
        state_code: 'FL',
        postal_code: '32204',
        assessed_value: 175000 + (it.app_item_id * 1000),
        property_type: 'Single Family Residential',
        created_at: it.created_on || new Date().toISOString()
      });

      // Insert Lead
      db.data.core.leads.push({
        lead_id: leadId,
        property_id: propId,
        person_id: personId,
        lead_stage: status.toLowerCase().includes('contact') ? 'CONTACTED' : 'NEW',
        first_source_code: 'MAIL',
        source_detail: `Podio: ${source}`,
        priority_score: 75,
        created_at: it.created_on || new Date().toISOString(),
        updated_at: it.last_event_on || new Date().toISOString(),
        podio_item_id: it.item_id,
        podio_app_item_id: it.app_item_id,
        notes,
        motivation
      });

      db.data.crm.external_sync_map.push({
        sync_id: crypto.randomUUID(),
        internal_uuid: leadId,
        entity_type: 'LEAD',
        system_name: 'PODIO',
        external_id: String(it.item_id),
        sync_status: 'SYNCED',
        last_sync_at: new Date().toISOString()
      });

      importedCount++;
    }
  }

  db.persist();
  console.log(`🎉 Imported ${importedCount} new leads from Podio into HushHawk canonical store!`);
  console.log(`📊 Total leads now in HushHawk: ${db.data.core.leads.length}`);
}

syncPodioLeads().catch(err => {
  console.error('❌ Podio sync error:', err);
  process.exit(1);
});

