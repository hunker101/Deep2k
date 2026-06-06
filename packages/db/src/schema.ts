import {
  bigserial,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const categories = pgTable('categories', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  name: text('name').notNull().unique(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const sites = pgTable(
  'sites',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    domain: text('domain').notNull().unique(),
    secret: text('secret').notNull(),
    scriptPath: text('script_path').notNull(),
    endpointPath: text('endpoint_path').notNull(),
    beaconMethod: text('beacon_method').notNull(),
    initDelayMs: integer('init_delay_ms').notNull(),
    variableSeed: text('variable_seed').notNull(),
    backendUrl: text('backend_url'),
    firstPartySubdomain: text('first_party_subdomain'),
    categoryId: uuid('category_id').references(() => categories.id, { onDelete: 'set null' }),
    lastInjectedAt: timestamp('last_injected_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    diversification: unique('sites_diversification_uq').on(
      t.scriptPath,
      t.endpointPath,
      t.beaconMethod,
      t.variableSeed,
    ),
    domainIdx: index('sites_domain_idx').on(t.domain),
  }),
);

// NOTE: physically partitioned by RANGE(timestamp) — see migrations/0000_init.sql.
// Drizzle treats it as a normal table for query purposes; the partitioning is invisible
// at the SQL level (you query `events`, PG routes to the right partition).
// No PRIMARY KEY: append-only, never looked up by id alone. `id bigserial` kept for debug/dedupe.
export const events = pgTable(
  'events',
  {
    id: bigserial('id', { mode: 'bigint' }).notNull(),
    siteId: uuid('site_id').notNull(),
    visitorId: text('visitor_id').notNull(),
    path: text('path'),
    referrer: text('referrer'),
    country: text('country'),
    device: text('device'),
    timestamp: timestamp('timestamp', { withTimezone: true }).notNull(),
    receivedAt: timestamp('received_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    siteTime: index('events_site_time').on(t.siteId, t.timestamp),
    sitePathTime: index('events_site_path_time').on(t.siteId, t.path, t.timestamp),
  }),
);

export const dailyStats = pgTable(
  'daily_stats',
  {
    siteId: uuid('site_id')
      .notNull()
      .references(() => sites.id, { onDelete: 'cascade' }),
    date: date('date').notNull(),
    pageviews: integer('pageviews').notNull().default(0),
    uniqueVisitors: integer('unique_visitors').notNull().default(0),
    countries: jsonb('countries').notNull().default({}),
    devices: jsonb('devices').notNull().default({}),
    topPaths: jsonb('top_paths').notNull().default({}),
    topReferrers: jsonb('top_referrers').notNull().default({}),
    bouncedVisitors: integer('bounced_visitors').notNull().default(0),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.siteId, t.date] }),
  }),
);

// Dev-only mirror of Cloudflare KV. Prod source of truth is KV; do not sync.
export const salts = pgTable('salts', {
  date: date('date').primaryKey(),
  salt: text('salt').notNull(),
});

export const leads = pgTable(
  'leads',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    siteId: uuid('site_id').notNull().references(() => sites.id, { onDelete: 'cascade' }),
    type: text('type').notNull(), // 'form' or 'order'
    fields: jsonb('fields').notNull().default({}),
    pageUrl: text('page_url'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    siteIdx: index('leads_site_idx').on(t.siteId),
    createdAtIdx: index('leads_created_at_idx').on(t.createdAt),
  }),
);

export type Site = typeof sites.$inferSelect;
export type NewSite = typeof sites.$inferInsert;
export type EventRow = typeof events.$inferSelect;
export type DailyStat = typeof dailyStats.$inferSelect;
export type Lead = typeof leads.$inferSelect;
export type Category = typeof categories.$inferSelect;
