import { pgTable, uuid, text, jsonb, timestamp, integer, index } from 'drizzle-orm/pg-core';

export const submissions = pgTable('assessment_submissions', {
  id: uuid('id').primaryKey(),
  version: text('version').notNull(),
  name: text('name').notNull(),
  email: text('email').notNull(),
  payloadHash: text('payload_hash').notNull(),
  answers: jsonb('answers').notNull(),
  result: jsonb('result').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, table => [index('assessment_submissions_created_idx').on(table.createdAt)]);

export const sessions = pgTable('assessment_admin_sessions', {
  tokenHash: text('token_hash').primaryKey(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  credentialVersion: text('credential_version').notNull(),
});

export const rateLimits = pgTable('assessment_rate_limits', {
  key: text('key').primaryKey(),
  count: integer('count').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
});
