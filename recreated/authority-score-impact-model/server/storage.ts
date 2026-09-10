import { users, scans, leads } from '@shared/schema';
import type { User, InsertUser, Scan, InsertScan, Lead, InsertLead } from '@shared/schema';
import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { eq, and, desc } from "drizzle-orm";

const sqlite = new Database("data.db");
sqlite.pragma("journal_mode = WAL");

// Self-migrating: the lead log table is created on boot if absent, so the
// database survives redeploys without a separate migration step.
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS scans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    scanned_at TEXT NOT NULL,
    domain TEXT NOT NULL,
    url_entered TEXT NOT NULL,
    company_name TEXT,
    score INTEGER,
    band TEXT,
    audience TEXT,
    real_offer TEXT,
    confidence TEXT,
    recommended TEXT,
    social TEXT,
    social_eff TEXT,
    content TEXT,
    podcast TEXT,
    video TEXT,
    third_party TEXT,
    weakest TEXT,
    status TEXT NOT NULL,
    referrer TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_scans_time ON scans (scanned_at DESC);

  CREATE TABLE IF NOT EXISTS leads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at TEXT NOT NULL,
    scan_id INTEGER,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    company TEXT NOT NULL,
    phone TEXT,
    domain TEXT,
    score INTEGER,
    band TEXT,
    target_score INTEGER,
    deal_volume INTEGER,
    deal_size INTEGER,
    modeled_delta INTEGER,
    referrer TEXT,
    lead_token TEXT,
    crm_status TEXT NOT NULL,
    crm_ref TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_leads_time ON leads (created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_leads_crm ON leads (crm_status);
`);

// Additive migration for databases created before the sixth signal existed.
const existingCols = new Set(
  (sqlite.pragma("table_info(scans)") as Array<{ name: string }>).map((c) => c.name)
);
if (!existingCols.has("social_eff")) {
  sqlite.exec("ALTER TABLE scans ADD COLUMN social_eff TEXT;");
}

export const db = drizzle(sqlite);

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  logScan(scan: InsertScan): Promise<number | null>;
  listScans(): Promise<Scan[]>;
  addLead(lead: InsertLead): Promise<Lead>;
  listLeads(): Promise<Lead[]>;
  markLeadSynced(id: number, ref: string): Promise<void>;
  updateLeadModel(
    id: number,
    token: string,
    patch: { targetScore: number | null; dealVolume: number | null; dealSize: number | null; modeledDelta: number | null }
  ): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    return db.select().from(users).where(eq(users.id, id)).get();
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return db.select().from(users).where(eq(users.username, username)).get();
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    return db.insert(users).values(insertUser).returning().get();
  }

  async logScan(scan: InsertScan): Promise<number | null> {
    try {
      const row = db.insert(scans).values(scan).returning({ id: scans.id }).get();
      return row?.id ?? null;
    } catch (err) {
      // Logging must never break a visitor's scan.
      console.error("[scan-log] failed to record scan:", err);
      return null;
    }
  }

  async listScans(): Promise<Scan[]> {
    return db.select().from(scans).orderBy(desc(scans.id)).all();
  }

  /**
   * Unlike logScan, this one throws on failure. A lost lead is not an
   * acceptable silent failure — the visitor gets an error and can retry.
   */
  async addLead(lead: InsertLead): Promise<Lead> {
    return db.insert(leads).values(lead).returning().get();
  }

  async listLeads(): Promise<Lead[]> {
    return db.select().from(leads).orderBy(desc(leads.id)).all();
  }

  async markLeadSynced(id: number, ref: string): Promise<void> {
    db.update(leads).set({ crmStatus: "synced", crmRef: ref }).where(eq(leads.id, id)).run();
  }

  /**
   * Writes back only the modeled figures, and only for a caller holding the
   * token issued when the row was created. Returns false if the pair doesn't
   * match, so the route can answer 403 without leaking whether the id exists.
   */
  async updateLeadModel(
    id: number,
    token: string,
    patch: { targetScore: number | null; dealVolume: number | null; dealSize: number | null; modeledDelta: number | null }
  ): Promise<boolean> {
    if (!token) return false;
    const res = db
      .update(leads)
      .set(patch)
      .where(and(eq(leads.id, id), eq(leads.leadToken, token)))
      .run();
    return res.changes > 0;
  }
}

export const storage = new DatabaseStorage();
