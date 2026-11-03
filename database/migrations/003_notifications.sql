-- database/migrations/003_notifications.sql
-- Create ops.notifications table for real-time escrow, pipeline, lead and compliance alerts

CREATE SCHEMA IF NOT EXISTS ops;

CREATE TABLE IF NOT EXISTS ops.notifications (
    notification_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    category VARCHAR(50) NOT NULL DEFAULT 'SYSTEM',
    priority VARCHAR(20) NOT NULL DEFAULT 'NORMAL',
    color VARCHAR(20) NOT NULL DEFAULT 'blue',
    icon VARCHAR(50) NOT NULL DEFAULT 'bell',
    action_url VARCHAR(255),
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_unread ON ops.notifications (is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON ops.notifications (created_at DESC);

