/**
 * sync_podio_properties.js
 * Syncs REAL properties from Podio Properties app (30087415) into HushHawk.
 * Also cleans fake "Jacksonville Property #NNN" entries generated from the leads sync.
 */
import crypto from 'crypto';
import { db } from '../src/store/database.js';
import { pool } from '../src/store/pgClient.js';
import { PodioService } from '../src/services/podioService.js';

function toDeterministicUuid(str) {
  const hash = crypto.createHash('md5').update(str).digest('hex');
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
}

const PODIO_LEADS_APP_ID   = process.env.PODIO_APP_ID;
const PODIO_PROPS_APP_ID   = process.env.PODIO_PROPERTIES_APP_ID || '30087415';
const PODIO_APP_TOKEN      = process.env.PODIO_APP_TOKEN;

if (!PODIO_LEADS_APP_ID || !PODIO_APP_TOKEN) {
  console.error('Missing PODIO_APP_ID or PODIO_APP_TOKEN environment variables.');
  process.exit(1);
}

function parseAddress(fullAddr) {
  if (!fullAddr) return { line1: '', city: 'Jacksonville', state: 'FL', zip: '' };
  // "10725 Meadowlea Dr, Jacksonville, FL 32218, USA"
  const parts = fullAddr.split(',').map(s => s.trim());
  const line1  = parts[0] || fullAddr;
  const city   = parts[1] || 'Jacksonville';
  const stateZip = (parts[2] || 'FL').trim().split(' ');
  const state  = stateZip[0] || 'FL';
  const zip    = stateZip[1] || '';
  return { line1, city, state, zip };
}

function isFakeProperty(p) {
  return /^Jacksonville Property #\d+$/.test(p.address_line1 || '');
}

async function main() {
  console.log('🔄  Starting Podio Properties sync…');

  // 1. Authenticate
  const auth = await PodioService.authenticateApp(PODIO_LEADS_APP_ID, PODIO_APP_TOKEN);
  const token = auth.access_token;
  console.log('✅  Authenticated with Podio.');

  // 2. Fetch all real properties from Podio Properties app
  const res = await fetch(`https://api.podio.com/item/app/${PODIO_PROPS_APP_ID}/?limit=100`, {
    headers: { 'Authorization': `OAuth2 ${token}` }
  });
  const data = await res.json();
  const items = data.items || [];
  console.log(`📥  Retrieved ${items.length} properties from Podio Properties app.`);

  // 3. Remove fake auto-generated properties from the in-memory DB
  const before = (db.data.core.properties || []).length;
  db.data.core.properties = (db.data.core.properties || []).filter(p => !isFakeProperty(p));
  const removed = before - db.data.core.properties.length;
  console.log(`🗑️   Removed ${removed} fake "Jacksonville Property #NNN" entries.`);

  // 4. Also remove fake "7120 Northland" seed with stock photos from RDS
  //    (we'll re-add it properly from Podio data below)
  const seedId = 'a7120000-0000-0000-0000-000000007120';
  try {
    await pool.query('DELETE FROM core.property_photos WHERE property_id = $1', [seedId]);
    await pool.query('DELETE FROM core.properties WHERE property_id = $1', [seedId]);
    console.log('🗑️   Removed seed "7120 Northland" with fake stock photos from RDS.');
  } catch (e) {
    console.warn('Could not remove seed property from RDS:', e.message);
  }
  db.data.core.properties = (db.data.core.properties || []).filter(p => p.property_id !== seedId);

  // 5. Upsert real Podio properties
  let inserted = 0;
  let updated  = 0;

  for (const it of items) {
    const fields = {};
    (it.fields || []).forEach(f => {
      if (f.type === 'category') fields[f.label] = f.values?.[0]?.value?.text;
      else                       fields[f.label] = f.values?.[0]?.value;
    });

    const rawAddr  = fields['Property Address'] || it.title || '';
    const { line1, city, state, zip } = parseAddress(rawAddr);
    const sqft     = parseFloat(fields['Size of House (sqft)'] || '0') || null;
    const yearBuilt= parseFloat(fields['Year Built'] || '0') || null;
    const beds     = fields['Bedrooms'] ? parseInt(fields['Bedrooms'], 10) : null;
    const baths    = fields['Bathrooms'] ? parseFloat(fields['Bathrooms']) : null;
    const offerAmt = parseFloat(fields['Our Offer Amount'] || '0') || null;
    const propType = fields['Property Type'] === 'SFH' ? 'Single Family Residential'
                   : fields['Property Type'] || 'Single Family Residential';
    const notes    = (fields['Notes'] || '').replace(/<[^>]+>/g, '').trim();

    // county inference
    const countyCode = city.toLowerCase().includes('jacksonville') ? 'DUV'
                     : city.toLowerCase().includes('winter haven')  ? 'POL'
                     : 'DUV';

    const propId = `podio-prop-${it.item_id}`;
    const propUuid = toDeterministicUuid(`podio-prop-${it.item_id}`);

    // Upsert into RDS
    try {
      await pool.query(`
        INSERT INTO core.properties
          (property_id, county_id, parcel_raw, parcel_match,
           address_line1, city, state_code, postal_code,
           property_type, legal_description, assessed_value, created_at, updated_at)
        VALUES ($1,
          (SELECT county_id FROM ref.counties WHERE county_code = $2 LIMIT 1),
          $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
        ON CONFLICT (county_id, parcel_match) DO UPDATE
          SET address_line1 = EXCLUDED.address_line1,
              city          = EXCLUDED.city,
              state_code    = EXCLUDED.state_code,
              postal_code   = EXCLUDED.postal_code,
              property_type = EXCLUDED.property_type,
              assessed_value= EXCLUDED.assessed_value,
              updated_at    = NOW()
      `, [
        propUuid, countyCode,
        `PODIO-${it.item_id}`, `PODIO${it.item_id}`,
        line1, city, state, zip || '32204',
        propType,
        notes || null,
        offerAmt ? offerAmt * 1.5 : null   // rough ARV estimate from offer
      ]);

      await pool.query(`
        INSERT INTO crm.external_sync_map (internal_entity_type, internal_uuid, external_system, external_app_id, external_item_id, last_sync_at, status)
        VALUES ('PROPERTY', $1, 'PODIO', $2, $3, NOW(), 'SYNCED')
        ON CONFLICT (internal_entity_type, internal_uuid, external_system) DO UPDATE
          SET last_sync_at = NOW(),
              external_item_id = EXCLUDED.external_item_id
      `, [propUuid, String(PODIO_PROPS_APP_ID), String(it.item_id)]);
    } catch (dbErr) {
      console.warn(`[RDS] Could not upsert property ${propId}:`, dbErr.message);
    }

    // Upsert into memory DB
    const memProp = {
      property_id:       propId,
      podio_item_id:     it.item_id,
      county_code:       countyCode,
      parcel_raw:        `PODIO-${it.item_id}`,
      parcel_match:      `PODIO${it.item_id}`,
      address_line1:     line1,
      city,
      state_code:        state,
      postal_code:       zip || '32204',
      property_type:     propType,
      legal_description: notes || null,
      assessed_value:    offerAmt ? Math.round(offerAmt * 1.5) : null,
      estimated_equity:  offerAmt ? Math.round(offerAmt * 0.3) : null,
      bedrooms:          beds,
      bathrooms:         baths,
      sqft,
      year_built:        yearBuilt,
      offer_amount:      offerAmt,
      crownKey:          `${countyCode}-PODIO-${it.item_id}`,
      source:            'podio_properties',
      created_at:        it.created_on || new Date().toISOString(),
      updated_at:        it.last_event_on || new Date().toISOString(),
    };

    const existIdx = (db.data.core.properties || []).findIndex(p => p.property_id === propId);
    if (existIdx === -1) {
      db.data.core.properties.push(memProp);
      inserted++;
    } else {
      db.data.core.properties[existIdx] = memProp;
      updated++;
    }
  }

  db.persist();

  console.log(`✅  Properties sync complete:`);
  console.log(`    Inserted: ${inserted} | Updated: ${updated}`);
  console.log(`    Total in DB: ${db.data.core.properties.length}`);

  // 6. Fix seller leads - update address to show seller name clearly
  //    (since Podio leads don't link to properties, show "No Property Address on File")
  let leadsFixed = 0;
  for (const lead of (db.data.core.leads || [])) {
    if (lead.lead_id?.startsWith('podio-')) {
      const prop = (db.data.core.properties || []).find(p => p.property_id === lead.property_id);
      if (prop && isFakeProperty(prop)) {
        // Remove the fake property reference
        lead.property_id = null;
        leadsFixed++;
      }
    }
  }
  db.persist();
  console.log(`📝  Fixed ${leadsFixed} leads to remove fake property references.`);

  await pool.end();
  process.exit(0);
}

main().catch(err => {
  console.error('❌', err);
  process.exit(1);
});

