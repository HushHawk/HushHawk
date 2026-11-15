-- Migration 016: Reset Fake/Hardcoded Outreach Seed Data
-- Purges the mock dummy records so outreach action queues start at true 0
DELETE FROM core.outreach_mailers;
DELETE FROM core.outreach_calls;
DELETE FROM core.outreach_texts;
DELETE FROM core.outreach_emails;
