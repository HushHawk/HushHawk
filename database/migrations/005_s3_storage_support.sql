-- database/migrations/005_s3_storage_support.sql
-- Support for AWS S3 Private Vault (Documents, Photos, and Attachments)

-- 1. Ensure core.property_documents supports S3 object keys and metadata
ALTER TABLE core.property_documents
  ADD COLUMN IF NOT EXISTS storage_provider TEXT DEFAULT 'S3',
  ADD COLUMN IF NOT EXISTS object_key TEXT,
  ADD COLUMN IF NOT EXISTS mime_type TEXT,
  ADD COLUMN IF NOT EXISTS uploaded_by TEXT DEFAULT 'HushHawk Staff',
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'UPLOADED';

CREATE INDEX IF NOT EXISTS idx_property_documents_prop ON core.property_documents(property_id);
CREATE INDEX IF NOT EXISTS idx_property_documents_obj_key ON core.property_documents(object_key);

-- 2. Ensure core.property_photos has indexes on property_id and object_key
CREATE INDEX IF NOT EXISTS idx_property_photos_prop ON core.property_photos(property_id);
CREATE INDEX IF NOT EXISTS idx_property_photos_obj_key ON core.property_photos(object_key);

-- 3. Ensure raw.attachments has index on storage_uri
CREATE INDEX IF NOT EXISTS idx_raw_attachments_storage_uri ON raw.attachments(storage_uri);

