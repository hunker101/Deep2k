-- Deep2k initial schema.
-- Hand-written rather than drizzle-kit generated because `events` is partitioned.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";  -- gen_random_uuid()

CREATE TABLE sites (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  domain          text UNIQUE NOT NULL,
  secret          text NOT NULL,
  script_path     text NOT NULL,
  endpoint_path   text NOT NULL,
  beacon_method   text NOT NULL,
  init_delay_ms   integer NOT NULL,
  variable_seed   text NOT NULL,
  backend_url     text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT sites_diversification_uq UNIQUE (script_path, endpoint_path, beacon_method, variable_seed)
);

CREATE INDEX sites_domain_idx ON sites (domain);

-- events: partitioned by timestamp. No PRIMARY KEY (PG would force partition key into it;
-- we never query by id alone, so the index has no payoff).
CREATE TABLE events (
  id           bigserial,
  site_id      uuid NOT NULL,
  visitor_id   text NOT NULL,
  path         text,
  referrer     text,
  country      text,
  device       text,
  timestamp    timestamptz NOT NULL,
  received_at  timestamptz NOT NULL DEFAULT now()
) PARTITION BY RANGE (timestamp);

CREATE TABLE events_default PARTITION OF events DEFAULT;

CREATE INDEX events_site_time ON events (site_id, timestamp DESC);
CREATE INDEX events_site_path_time ON events (site_id, path, timestamp DESC);

CREATE TABLE daily_stats (
  site_id         uuid NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  date            date NOT NULL,
  pageviews       integer NOT NULL DEFAULT 0,
  unique_visitors integer NOT NULL DEFAULT 0,
  countries       jsonb NOT NULL DEFAULT '{}',
  devices         jsonb NOT NULL DEFAULT '{}',
  top_paths       jsonb NOT NULL DEFAULT '{}',
  PRIMARY KEY (site_id, date)
);

-- Dev-only mirror of Cloudflare KV daily salt. Prod source of truth is KV.
CREATE TABLE salts (
  date   date PRIMARY KEY,
  salt   text NOT NULL
);
