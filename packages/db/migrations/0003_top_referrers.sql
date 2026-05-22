ALTER TABLE daily_stats ADD COLUMN IF NOT EXISTS top_referrers jsonb NOT NULL DEFAULT '{}';
