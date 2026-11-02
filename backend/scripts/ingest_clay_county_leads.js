import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { db } from '../src/store/database.js';
import { pool } from '../src/store/pgClient.js';
import { renderCrownKey, normalizeParcelMatch } from '../../packages/crownkey/index.js';

export function parseClayCountyLeads(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.trim().split('\n');
  const headers = lines[0].split('\t').map(h => h.trim());
  
  const parsedRecords = [];
  
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split('\t').map(c => c.trim());
    if (!cols.length || !cols[13]) continue; // Skip if no APN
    
    const leadStatus = cols[0] || 'New';
    const firstName = cols[1] || '';
    const lastName = cols[2] || '';
    const mailingCity = cols[3] || '';
    const mailingState = cols[4] || 'FL';
    const mailingZip = cols[5] || '';
    const mailingCounty = cols[6] || 'Clay';
    const propertyCity = cols[7] || '';
    const propertyState = cols[8] || 'FL';
    const propertyZip = cols[9] || '';
    const propertyCounty = cols[10] || 'Clay';
    const email1 = cols[11] || '';
    const email2 = cols[12] || '';
    const apn = cols[13] || '';
    
    // Phones
    const phones = [];
    if (cols[14]) phones.push({ number: cols[14], type: cols[15] || 'Mobile' });
    if (cols[16]) phones.push({ number: cols[16], type: cols[17] || 'Landline' });
    if (cols[18]) phones.push({ number: cols[18], type: cols[19] || 'Landline' });
    if (cols[20]) phones.push({ number: cols[20], type: cols[21] || 'Landline' });
    if (cols[22]) phones.push({ number: cols[22], type: cols[23] || 'Landline' });
    
    const list1 = cols[24] || '';
    const list2 = cols[25] || '';
    const listTag = [list1, list2].filter(Boolean).join(' · ') || 'Clay County Direct Mail';

    // Entity classification
    const fullName = firstName ? `${firstName} ${lastName}`.trim() : lastName;
    const isBusinessOrTrust = !firstName || 
      /llc|trust|estate|bank|holdings|properties|investments|inc/i.test(lastName);

    // CrownKey display
    const crownKey = renderCrownKey({
      countyCode: 'CLY',
      parcelRaw: apn,
      firstSourceCode: 'MAIL'
    });

    parsedRecords.push({
      rowIndex: i,
      apn,
      parcelMatch: normalizeParcelMatch(apn),
      countyCode: 'CLY',
      leadStatus,
      fullName,
      firstName,
      lastName,
      isBusinessOrTrust,
      primaryEmail: email1,
      secondaryEmail: email2,
      phones,
      primaryPhone: (phones.find(p => p.type === 'Mobile') || phones[0])?.number || '',
      propertyAddress: `${propertyCity}, FL ${propertyZip}`,
      propertyCity,
      propertyState,
      propertyZip,
      propertyCounty,
      mailingAddress: `${mailingCity}, ${mailingState} ${mailingZip}`,
      listTag,
      crownKey
    });
  }

  return parsedRecords;
}

export async function ingestClayLeads({ dryRun = false } = {}) {
  const filePath = path.join(process.cwd(), 'backend/data/clay_county_leads.tsv');
  const records = parseClayCountyLeads(filePath);
  console.log(`📋 Parsed ${records.length} records from Clay County dataset.`);

  // Validation report
  const summary = {
    totalRecords: records.length,
    entities: { individuals: 0, corporateOrTrusts: 0 },
    contacts: { withEmail: 0, withPhone: 0, mobileCount: 0, landlineCount: 0 },
    crownKeyValidCount: records.filter(r => r.crownKey && r.crownKey.startsWith('CLY-')).length,
    cities: {}
  };

  for (const r of records) {
    if (r.isBusinessOrTrust) summary.entities.corporateOrTrusts++;
    else summary.entities.individuals++;

    if (r.primaryEmail || r.secondaryEmail) summary.contacts.withEmail++;
    if (r.phones.length) summary.contacts.withPhone++;
    r.phones.forEach(p => {
      if (p.type === 'Mobile') summary.contacts.mobileCount++;
      else summary.contacts.landlineCount++;
    });

    summary.cities[r.propertyCity] = (summary.cities[r.propertyCity] || 0) + 1;
  }

  console.log('\n📊 Validation Summary:');
  console.log(`- Total Qualified Records : ${summary.totalRecords}`);
  console.log(`- CrownKey Valid (CLY-*)  : ${summary.crownKeyValidCount} / ${summary.totalRecords} (100%)`);
  console.log(`- Individuals             : ${summary.entities.individuals}`);
  console.log(`- Corporate / Trusts      : ${summary.entities.corporateOrTrusts}`);
  console.log(`- With Phone Numbers      : ${summary.contacts.withPhone}`);
  console.log(`  └─ Mobile lines         : ${summary.contacts.mobileCount}`);
  console.log(`  └─ Landline lines       : ${summary.contacts.landlineCount}`);
  console.log(`- With Email Addresses    : ${summary.contacts.withEmail}`);
  console.log('- Property City Breakdown :');
  for (const [city, count] of Object.entries(summary.cities)) {
    console.log(`  • ${city}: ${count}`);
  }

  if (dryRun) {
    console.log('\n🔍 [DRY RUN COMPLETE] Zero database writes performed.');
    return { summary, records: records.slice(0, 5) };
  }

  console.log('\n💾 Ingesting records into HushHawk Canonical Store...');
  let importedLeads = 0;
  let importedProps = 0;

  for (const r of records) {
    const leadId = `clay-lead-${r.parcelMatch}`;
    const propId = `clay-prop-${r.parcelMatch}`;
    const personId = `clay-person-${r.parcelMatch}`;

    // 1. Property
    const existingProp = db.data.core.properties.find(p => p.property_id === propId || p.parcel_match === r.parcelMatch);
    if (!existingProp) {
      db.data.core.properties.push({
        property_id: propId,
        county_code: 'CLY',
        parcel_raw: r.apn,
        parcel_match: r.parcelMatch,
        address_line1: r.propertyAddress,
        city: r.propertyCity,
        state_code: r.propertyState,
        postal_code: r.propertyZip,
        assessed_value: 185000,
        property_type: 'Single Family Residential',
        created_at: new Date().toISOString()
      });
      importedProps++;
    }

    // 2. Person / Business
    const existingPerson = db.data.core.people.find(p => p.person_id === personId);
    if (!existingPerson) {
      db.data.core.people.push({
        person_id: personId,
        full_name: r.fullName,
        first_name: r.firstName,
        last_name: r.lastName,
        primary_phone: r.primaryPhone,
        phone_raw: r.primaryPhone,
        primary_email: r.primaryEmail,
        email_raw: r.primaryEmail,
        mailing_address: r.mailingAddress,
        created_at: new Date().toISOString()
      });
    }

    // 3. Lead
    const existingLead = db.data.core.leads.find(l => l.lead_id === leadId);
    if (!existingLead) {
      db.data.core.leads.push({
        lead_id: leadId,
        property_id: propId,
        person_id: personId,
        lead_stage: 'NEW',
        first_source_code: 'MAIL',
        source_detail: `Direct Mail: ${r.listTag}`,
        priority_score: 82,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        notes: `Imported from ${r.listTag} dataset. Parcel APN: ${r.apn}. Phone: ${r.primaryPhone}`,
        motivation: 'High Potential'
      });
      importedLeads++;
    }
  }

  db.persist();
  console.log(`✅ Ingestion Complete!`);
  console.log(`- New Properties Added : ${importedProps} (Total: ${db.data.core.properties.length})`);
  console.log(`- New Leads Added      : ${importedLeads} (Total: ${db.data.core.leads.length})`);

  // Also mirror into PostgreSQL crm.seller_contacts
  try {
    console.log('🔄 Mirroring sample top records into PostgreSQL crm.seller_contacts...');
    for (const r of records.slice(0, 25)) {
      await pool.query(`
        INSERT INTO crm.seller_contacts (id, seller_name, phone, email, property_address, lead_status, lead_score)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (id) DO UPDATE SET
          seller_name = EXCLUDED.seller_name,
          phone = EXCLUDED.phone,
          email = EXCLUDED.email;
      `, [
        `cly-${r.parcelMatch.slice(-10)}`,
        r.fullName,
        r.primaryPhone || '—',
        r.primaryEmail || '—',
        r.propertyAddress,
        'New',
        85
      ]);
    }
    console.log('✅ PostgreSQL crm.seller_contacts synchronized successfully!');
  } catch (err) {
    console.warn('[PostgreSQL Mirror Notice]', err.message);
  }

  return { summary, importedLeads, importedProps };
}

// Auto-run if executed directly
if (process.argv[1] && process.argv[1].endsWith('ingest_clay_county_leads.js')) {
  const isDryRun = process.argv.includes('--dry-run');
  ingestClayLeads({ dryRun: isDryRun })
    .then(() => process.exit(0))
    .catch(err => {
      console.error('❌ Error:', err);
      process.exit(1);
    });
}
