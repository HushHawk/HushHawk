import { pool } from '../src/store/pgClient.js';
import { db } from '../src/store/database.js';

async function seed() {
  const propId = 'a7120000-0000-0000-0000-000000007120';
  const countyId = 'c1111111-1111-1111-1111-111111111111';

  // 1. Delete if exists then re-insert
  await pool.query('DELETE FROM core.property_photos WHERE property_id = $1', [propId]);
  await pool.query('DELETE FROM core.properties WHERE property_id = $1', [propId]);

  await pool.query(`
    INSERT INTO core.properties (
      property_id, county_id, parcel_raw, parcel_match,
      address_line1, city, state_code, postal_code,
      property_type, legal_description, assessed_value, created_at, updated_at
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,NOW(),NOW())
  `, [
    propId, countyId, '071200-0010', '0712000010',
    '7120 Northland', 'Jacksonville', 'FL', '32204',
    'Single Family Residential', 'NORTHLAND HEIGHTS LOT 12 BLK 4', 215000
  ]);
  console.log('Inserted 7120 Northland into PostgreSQL RDS');

  const samplePhotos = [
    {
      filename: 'front_exterior.jpg', original_filename: 'Front Exterior',
      tag: 'Before', caption: 'Front Exterior',
      data_url: 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?auto=format&fit=crop&w=800&q=80'
    },
    {
      filename: 'living_room.jpg', original_filename: 'Living Room',
      tag: 'Before', caption: 'Living Room',
      data_url: 'https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?auto=format&fit=crop&w=800&q=80'
    },
    {
      filename: 'kitchen.jpg', original_filename: 'Kitchen',
      tag: 'Before', caption: 'Kitchen',
      data_url: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=800&q=80'
    },
    {
      filename: 'framing.jpg', original_filename: 'Framing',
      tag: 'Before', caption: 'Framing',
      data_url: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=800&q=80'
    }
  ];

  for (const p of samplePhotos) {
    await pool.query(`
      INSERT INTO core.property_photos (property_id, filename, original_filename, file_size_bytes, mime_type, tag, caption, photo_date, data_url)
      VALUES ($1, $2, $3, 1450000, 'image/jpeg', $4, $5, '2026-10-28', $6)
    `, [propId, p.filename, p.original_filename, p.tag, p.caption, p.data_url]);
  }
  console.log('Inserted 4 sample photos into core.property_photos');

  // Also add to memory db
  const memProp = {
    property_id: propId,
    county_id: countyId,
    county_code: 'DUV',
    parcel_raw: '071200-0010',
    parcel_match: '0712000010',
    address_line1: '7120 Northland',
    city: 'Jacksonville',
    state_code: 'FL',
    postal_code: '32204',
    property_type: 'Single Family Residential',
    legal_description: 'NORTHLAND HEIGHTS LOT 12 BLK 4',
    assessed_value: 215000,
    estimated_equity: 98000,
    crownKey: 'HH-PROP-07120',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const exMemIdx = db.data.core.properties.findIndex(p => p.property_id === propId);
  if (exMemIdx === -1) {
    db.data.core.properties.unshift(memProp);
  } else {
    db.data.core.properties[exMemIdx] = memProp;
  }
  db.persist();
  console.log('Saved to canonical_store.json');

  await pool.end();
  process.exit(0);
}

seed().catch(err => {
  console.error(err);
  process.exit(1);
});
