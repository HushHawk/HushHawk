-- Outreach records store only what is known. A text to a number with no name, or a follow-up that is not yet tied to
-- a property address or cadence stage, is legitimate; the old NOT NULL rules forced placeholder values to be invented.
-- Identity, status and timestamps stay mandatory; the mailer table keeps its owner and ZIP requirements.
DO $$
DECLARE col record;
BEGIN
    FOR col IN
        SELECT table_name, column_name FROM information_schema.columns
        WHERE table_schema = 'core' AND table_name IN ('outreach_calls', 'outreach_texts', 'outreach_emails')
          AND is_nullable = 'NO'
          AND column_name NOT IN ('id', 'status', 'created_at', 'updated_at', 'phone', 'email')
    LOOP
        EXECUTE format('ALTER TABLE core.%I ALTER COLUMN %I DROP NOT NULL', col.table_name, col.column_name);
    END LOOP;
END $$;
