import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createHandler } from '../api/assessment';
import { digest, hashPassword, parseSubmission, verifyPassword } from '../server/security';
import { calculateResults } from '../server/scoring';

test('password hashes reject incorrect passwords', async () => {
  const hash = await hashPassword('a-test-password-not-used-online');
  assert.equal(await verifyPassword('a-test-password-not-used-online', hash), true);
  assert.equal(await verifyPassword('wrong', hash), false);
});
test('validate all 24 answers and contact fields', () => {
  const input = { id: randomUUID(), version: 'v2', name: ' Test Person ', email: 'test@example.com', answers: Array(24).fill(3) };
  assert.equal(parseSubmission(input).name, 'Test Person');
  for (const changed of [{ name: '  ' }, { email: 'invalid' }, { answers: [4] }, { answers: Array(24).fill(5) }, { version: 'v1' }, { id: 'invalid' }]) {
    assert.throws(() => parseSubmission({ ...input, ...changed }));
  }
});
test('all score bands and equal-weight dimensions', () => {
  for (const [value, score, band] of [[0,0,'EXPERTISE TRAPPED'], [2,50,'VISIBLE BUT DISCONNECTED'], [3,75,'EXPERTISE IS STARTING TO WORK'], [4,100,'COMPOUNDING MARKET AUTHORITY']] as const) {
    const result = calculateResults(Array(24).fill(value));
    assert.equal(result.score, score); assert.equal(result.band, band); assert.equal(result.dimensions.length, 6);
    assert.equal(result.allEqual, true);
  }
});
test('API protects data, rejects cross-site writes, saves server scores, and revokes sessions', async () => {
  process.env.DATABASE_URL = 'test://not-a-real-database';
  process.env.ADMIN_PASSWORD_HASH = await hashPassword('test-only-password');
  process.env.RATE_LIMIT_SECRET = 'test-secret-at-least-thirty-two-characters';
  delete process.env.VERCEL;
  const stored = new Map<string, any>();
  const sessions = new Map<string, string>();
  let allowed = true;
  const repo: any = {
    allow: async () => allowed,
    save: async (row: any) => {
      const previous = stored.get(row.id);
      if (previous && previous.payloadHash !== row.payloadHash) throw new Error('SUBMISSION_CONFLICT');
      stored.set(row.id, row); return row;
    },
    list: async () => ({ submissions: [...stored.values()], nextCursor: null }),
    createSession: async (token: string, version: string) => sessions.set(token, version),
    validSession: async (token: string, version: string) => sessions.get(token) === version,
    logout: async (token: string) => sessions.delete(token),
  };
  const handler = createHandler(repo);
  async function request(action: string, method = 'POST', body: any = {}, overrides: Record<string,string> = {}) {
    const result: any = { headers: {}, statusCode: 200 };
    const res = { setHeader: (k: string,v: string) => { result.headers[k] = v; }, status: (status: number) => { result.statusCode = status; return res; }, json: (value: any) => { result.body = value; } };
    await handler({ method, query: { action }, body, socket: { remoteAddress: 'local' },
      headers: { host: 'localhost:4174', origin: 'http://localhost:4174', 'content-type': 'application/json', 'x-assessment-request': '1', ...overrides } }, res);
    return result;
  }
  assert.equal((await request('results','GET')).statusCode, 401);
  assert.equal((await request('login','POST',{password:'test-only-password'},{origin:'https://attacker.example'})).statusCode, 403);
  assert.equal((await request('login','POST',{password:'wrong'})).statusCode, 401);
  const login = await request('login','POST',{password:'test-only-password'});
  assert.equal(login.statusCode, 200);
  assert.match(login.headers['Set-Cookie'], /HttpOnly; SameSite=Strict/);
  const cookie = login.headers['Set-Cookie'].split(';')[0];
  const input = { id: randomUUID(), version:'v2', name:'Test Person', email:'test@example.com', answers:Array(24).fill(3), score:100 };
  const saved = await request('submit','POST',input);
  assert.equal(saved.statusCode,201); assert.equal(saved.body.result.score,75);
  assert.equal(saved.body.name, undefined);
  assert.equal((await request('submit','POST',input)).statusCode,201); assert.equal(stored.size,1);
  assert.equal((await request('submit','POST',{...input,name:'Other'})).statusCode,409);
  const list = await request('results','GET',undefined,{cookie});
  assert.equal(list.statusCode,200); assert.equal(list.body.submissions[0].answers.length,24);
  assert.match(list.headers['Cache-Control'],/no-store/);
  await request('logout','POST',{}, {cookie});
  assert.equal((await request('results','GET',undefined,{cookie})).statusCode,401);
  allowed = false;
  assert.equal((await request('login','POST',{password:'test-only-password'})).statusCode,429);
  assert.equal((await request('submit','POST',input)).statusCode,429);
  assert.notEqual(digest(cookie),cookie);
});
