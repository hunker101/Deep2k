-- Index for received_at queries (aggregation lookback + last-event lookup)
CREATE INDEX IF NOT EXISTS events_site_received ON events (site_id, received_at DESC);
CREATE INDEX IF NOT EXISTS events_received_at   ON events (received_at DESC);
