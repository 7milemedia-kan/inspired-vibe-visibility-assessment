import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import type * as z from "zod/mini";

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

/**
 * One row per URL submitted through the public form. This is the lead log.
 */
export const scans = sqliteTable("scans", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  scannedAt: text("scanned_at").notNull(),
  domain: text("domain").notNull(),
  urlEntered: text("url_entered").notNull(),
  companyName: text("company_name"),
  score: integer("score"),
  band: text("band"),
  audience: text("audience"),
  realOffer: text("real_offer"),
  confidence: text("confidence"),
  recommended: text("recommended"),
  social: text("social"),
  socialEff: text("social_eff"),
  content: text("content"),
  podcast: text("podcast"),
  video: text("video"),
  thirdParty: text("third_party"),
  weakest: text("weakest"),
  status: text("status").notNull(),
  referrer: text("referrer"),
});

export type Scan = typeof scans.$inferSelect;
export type InsertScan = typeof scans.$inferInsert;

/**
 * One row per contact-details submission on the impact hand-off.
 * Joined to the scan that produced the score via scanId, so a lead always
 * carries the evidence that generated it.
 *
 * PII lives here. Everything reading this table must be behind the admin
 * session, never behind a URL parameter.
 */
export const leads = sqliteTable("leads", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  createdAt: text("created_at").notNull(),
  scanId: integer("scan_id"),
  fullName: text("full_name").notNull(),
  email: text("email").notNull(),
  company: text("company").notNull(),
  phone: text("phone"),
  domain: text("domain"),
  score: integer("score"),
  band: text("band"),
  // Whatever the visitor had modeled at the moment they submitted.
  targetScore: integer("target_score"),
  dealVolume: integer("deal_volume"),
  dealSize: integer("deal_size"),
  modeledDelta: integer("modeled_delta"),
  referrer: text("referrer"),
  // Opaque capability token handed to the browser once, at creation. It is the
  // only thing that authorises writing the modeled figures back to this row,
  // so a row id alone can never be used to overwrite someone else's lead.
  leadToken: text("lead_token"),
  // HubSpot seam: "pending" until a sync runs, then "synced" or "failed".
  crmStatus: text("crm_status").notNull(),
  crmRef: text("crm_ref"),
});

export type Lead = typeof leads.$inferSelect;
export type InsertLead = typeof leads.$inferInsert;
