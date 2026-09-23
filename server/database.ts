import pg from 'pg';
import { attachDatabasePool } from '@vercel/functions';
import { drizzle } from 'drizzle-orm/node-postgres';
import { and, desc, eq, gt, lt, sql } from 'drizzle-orm';
import { submissions, sessions, rateLimits } from './schema';
let cached: ReturnType<typeof drizzle> | undefined;
export function database() {
  if (!cached) {
    if (!process.env.DATABASE_URL) throw new Error('DATABASE_NOT_CONFIGURED');
    const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 3, connectionTimeoutMillis: 10000, idleTimeoutMillis: 10000 });
    if (process.env.VERCEL) attachDatabasePool(pool);
    cached = drizzle(pool);
  }
  return cached;
}
export const repository = {
  async allow(key: string, limit: number, seconds: number) {
    const db = database();
    const now = new Date();
    await db.delete(rateLimits).where(lt(rateLimits.expiresAt, now));
    const [row] = await db.insert(rateLimits).values({ key, count: 1, expiresAt: new Date(Date.now() + seconds * 1000) })
      .onConflictDoUpdate({ target: rateLimits.key, set: { count: sql`${rateLimits.count} + 1` } }).returning();
    return row.count <= limit;
  },
  async save(record: typeof submissions.$inferInsert) {
    const db = database();
    const [inserted] = await db.insert(submissions).values(record).onConflictDoNothing().returning();
    if (inserted) return inserted;
    const [existing] = await db.select().from(submissions).where(eq(submissions.id, record.id));
    if (!existing || existing.payloadHash !== record.payloadHash) throw new Error('SUBMISSION_CONFLICT');
    return existing;
  },
  async createSession(tokenHash: string, credentialVersion: string) {
    await database().delete(sessions).where(lt(sessions.expiresAt, new Date()));
    await database().insert(sessions).values({ tokenHash, credentialVersion, expiresAt: new Date(Date.now() + 8 * 3600_000) });
  },
  async validSession(tokenHash: string, credentialVersion: string) {
    const rows = await database().select({ tokenHash: sessions.tokenHash }).from(sessions)
      .where(and(eq(sessions.tokenHash, tokenHash), eq(sessions.credentialVersion, credentialVersion), gt(sessions.expiresAt, new Date()))).limit(1);
    return rows.length === 1;
  },
  async logout(tokenHash: string) { await database().delete(sessions).where(eq(sessions.tokenHash, tokenHash)); },
  async list(before?: string) {
    const rows = await database().select({
      id: submissions.id, version: submissions.version, name: submissions.name, email: submissions.email,
      answers: submissions.answers, result: submissions.result, createdAt: submissions.createdAt,
    }).from(submissions).where(before ? sql`(${submissions.createdAt}, ${submissions.id}) < (select created_at, id from assessment_submissions where id = ${before}::uuid)` : undefined).orderBy(desc(submissions.createdAt), desc(submissions.id)).limit(51);
    const page = rows.slice(0, 50);
    return { submissions: page, nextCursor: rows.length > 50 ? page.at(-1)!.id : null };
  },
};
