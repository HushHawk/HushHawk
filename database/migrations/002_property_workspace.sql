-- Bring the property workspace schema under migration control before S3 support.
CREATE TABLE IF NOT EXISTS core.property_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES core.properties(property_id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    category TEXT DEFAULT 'General',
    filename TEXT NOT NULL,
    file_size_bytes INTEGER DEFAULT 0,
    data_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS core.property_photos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES core.properties(property_id) ON DELETE CASCADE,
    filename TEXT NOT NULL,
    original_filename TEXT,
    file_size_bytes INTEGER DEFAULT 0,
    mime_type TEXT DEFAULT 'image/jpeg',
    tag TEXT DEFAULT 'General',
    caption TEXT,
    description TEXT,
    photo_date DATE DEFAULT CURRENT_DATE,
    data_url TEXT,
    storage_provider TEXT DEFAULT 'S3',
    object_key TEXT,
    uploaded_by TEXT DEFAULT 'HushHawk Staff',
    status TEXT DEFAULT 'UPLOADED',
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS core.property_expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES core.properties(property_id) ON DELETE CASCADE,
    category TEXT NOT NULL,
    description TEXT,
    amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    expense_date DATE DEFAULT CURRENT_DATE,
    vendor TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS core.property_contractors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES core.properties(property_id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    trade TEXT NOT NULL,
    phone TEXT,
    status TEXT DEFAULT 'Assigned',
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS crm.seller_contacts (
    id TEXT PRIMARY KEY,
    seller_name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    property_address TEXT,
    lead_status TEXT DEFAULT 'New',
    lead_score INTEGER DEFAULT 85,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE core.tasks
    ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'General',
    ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'Medium',
    ADD COLUMN IF NOT EXISTS is_completed BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS due_time TEXT,
    ALTER COLUMN owner_id DROP NOT NULL,
    ALTER COLUMN linked_entity_type DROP NOT NULL,
    ALTER COLUMN linked_entity_id DROP NOT NULL;
