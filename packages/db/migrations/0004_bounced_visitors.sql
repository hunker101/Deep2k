ALTER TABLE daily_stats ADD COLUMN IF NOT EXISTS bounced_visitors integer NOT NULL DEFAULT 0;
