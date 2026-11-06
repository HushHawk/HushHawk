-- database/migrations/006_vault_files.sql
-- Hybrid Admin Media & Document Vault Storage

CREATE TABLE IF NOT EXISTS core.vault_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filename TEXT NOT NULL,
  original_filename TEXT,
  file_size_bytes BIGINT DEFAULT 0,
  mime_type TEXT,
  category TEXT DEFAULT 'Photos',
  tag TEXT DEFAULT 'General',
  description TEXT,
  object_key TEXT NOT NULL,
  storage_provider TEXT DEFAULT 'S3',
  data_url TEXT,
  linked_property_id UUID REFERENCES core.properties(property_id) ON DELETE SET NULL,
  uploaded_by TEXT DEFAULT 'Main Administrator',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_vault_files_linked_prop ON core.vault_files(linked_property_id);
CREATE INDEX IF NOT EXISTS idx_vault_files_object_key ON core.vault_files(object_key);
CREATE INDEX IF NOT EXISTS idx_vault_files_category ON core.vault_files(category);
CREATE INDEX IF NOT EXISTS idx_vault_files_mime ON core.vault_files(mime_type);

