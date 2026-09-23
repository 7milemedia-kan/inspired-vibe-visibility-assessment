import { createHmac } from 'node:crypto';
import { repository } from '../server/database.js';
import { digest, parseSubmission, randomToken, verifyPassword } from '../server/security.js';
import { answerSnapshot, calculateResults } from '../server/scoring.js';

export function createHandler(repo = repository) {
  return async function handler(req: any, res: any) {
    res.setHeader('Cache-Control', 'private, no-store, max-age=0');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    const send = (status: number, body: unknown) => res.status(status).json(body);
    const config = process.env.ADMIN_PASSWORD_HASH;
    const secret = process.env.RATE_LIMIT_SECRET;
    if (!config || !secret || secret.length < 32 || !process.env.DATABASE_URL) return send(503, { error: 'The assessment service is not configured yet.' });
    const action = typeof req.query?.action === 'string' ? req.query.action : '';
    const cookieName = process.env.VERCEL ? '__Host-assessment_admin' : 'assessment_admin';
    const token = (req.headers.cookie ?? '').split(';').map((s: string) => s.trim()).find((s: string) => s.startsWith(cookieName + '='))?.slice(cookieName.length + 1) ?? '';
    const sessionHash = digest(token);
    const credentialVersion = digest(config);
    const cookie = (value: string, age: number) => `${cookieName}=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${age}${process.env.VERCEL ? '; Secure' : ''}`;
    try {
      if (req.method === 'POST') {
        const expectedOrigin = `${process.env.VERCEL ? 'https' : 'http'}://${req.headers.host}`;
        if (req.headers.origin !== expectedOrigin || req.headers['x-assessment-request'] !== '1') return send(403, { error: 'Request not allowed.' });
        if (!req.headers['content-type']?.startsWith('application/json')) return send(415, { error: 'JSON required.' });
        if (Number(req.headers['content-length'] || 0) > 16384 || JSON.stringify(req.body ?? '').length > 16384) return send(413, { error: 'Request too large.' });
      }
      if (action === 'submit' && req.method === 'POST') {
        const input = parseSubmission(req.body);
        const ip = process.env.VERCEL ? String(req.headers['x-vercel-forwarded-for'] ?? req.headers['x-forwarded-for'] ?? 'unknown').split(',')[0].trim() : req.socket?.remoteAddress ?? 'local';
        const key = createHmac('sha256', secret).update('submit:' + ip).digest('hex');
        if (!await repo.allow(key, 30, 3600)) return send(429, { error: 'Too many submissions. Please try again later.' });
        const result = calculateResults(input.answers);
        await repo.save({ id: input.id, version: input.version, name: input.name, email: input.email,
          payloadHash: digest(JSON.stringify(input)), answers: answerSnapshot(input.answers), result });
        return send(201, { id: input.id, result });
      }
      if (action === 'login' && req.method === 'POST') {
        const ip = process.env.VERCEL ? String(req.headers['x-vercel-forwarded-for'] ?? req.headers['x-forwarded-for'] ?? 'unknown').split(',')[0].trim() : req.socket?.remoteAddress ?? 'local';
        const key = createHmac('sha256', secret).update('login:' + ip).digest('hex');
        if (!await repo.allow(key, 10, 900)) return send(429, { error: 'Too many login attempts. Try again in 15 minutes.' });
        if (!await verifyPassword(req.body?.password, config)) return send(401, { error: 'Incorrect password.' });
        const newToken = randomToken();
        await repo.createSession(digest(newToken), credentialVersion);
        res.setHeader('Set-Cookie', cookie(newToken, 8 * 3600));
        return send(200, { ok: true });
      }
      if (action === 'logout' && req.method === 'POST') {
        if (token) await repo.logout(sessionHash);
        res.setHeader('Set-Cookie', cookie('', 0));
        return send(200, { ok: true });
      }
      if (action === 'results' && req.method === 'GET') {
        if (!/^[\w-]{43}$/.test(token) || !await repo.validSession(sessionHash, credentialVersion)) return send(401, { error: 'Please log in.' });
        const before = req.query.before;
        if (before && (typeof before !== 'string' || !/^[a-f0-9-]{36}$/i.test(before))) return send(400, { error: 'Invalid page cursor.' });
        return send(200, await repo.list(before));
      }
      return send(405, { error: 'Method not allowed.' });
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      if (message === 'INVALID_SUBMISSION') return send(400, { error: 'Please provide a valid name, email, and all 24 answers.' });
      if (message === 'SUBMISSION_CONFLICT') return send(409, { error: 'This submission was already saved with different details. Please restart the assessment to submit again.' });
      // Never log request bodies, credentials, or database errors containing personal data.
      return send(503, { error: 'We could not connect to the results service. Please try again. Your answers are still here.' });
    }
  };
}
export default createHandler();
