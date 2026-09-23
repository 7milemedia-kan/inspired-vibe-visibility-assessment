import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import assert from 'node:assert/strict';
import pg from 'pg';

async function main() {
  const origin = process.argv[2] || 'http://127.0.0.1:4174';
  const credentials = await readFile('.admin-credentials.txt', 'utf8');
  const password = credentials.match(/^Password: (.+)$/m)?.[1];
  if (!password) throw new Error('Missing private credential file');
  const id = randomUUID();
  let cookie = '';
  const call = async (action: string, body?: unknown, auth = '') => {
    const response = await fetch(origin + '/api/assessment?action=' + action, {
      method: body === undefined ? 'GET' : 'POST',
      headers: { Origin: origin, 'Content-Type': 'application/json', 'X-Assessment-Request': '1', ...(auth ? { Cookie: auth } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return { response, data: await response.json() };
  };
  try {
    assert.equal((await call('results')).response.status, 401);
    const input = { id, version:'v2', name:'Automated QA Test', email:'qa@example.com', answers:Array(24).fill(3) };
    const saved = await call('submit',input);
    assert.equal(saved.response.status,201); assert.equal(saved.data.result.score,75);
    assert.equal((await call('submit',input)).response.status,201);
    const login = await call('login',{password});
    assert.equal(login.response.status,200);
    const setCookie = login.response.headers.get('set-cookie') || '';
    assert.match(setCookie,/HttpOnly/); assert.match(setCookie,/SameSite=Strict/);
    if (origin.startsWith('https')) assert.match(setCookie,/Secure/);
    cookie = setCookie.split(';')[0];
    const results = await call('results',undefined,cookie);
    assert.equal(results.response.status,200);
    const records = results.data.submissions.filter((row: any) => row.id === id);
    assert.equal(records.length,1); assert.equal(records[0].name,input.name); assert.equal(records[0].email,input.email);
    assert.equal(records[0].answers.length,24); assert.equal(records[0].result.dimensions.length,6);
    assert.equal((await call('logout',{},cookie)).response.status,200);
    assert.equal((await call('results',undefined,cookie)).response.status,401);
    console.log('PASS: database persistence, retry deduplication, login, protected results, 24 answers, six scores, secure cookies, and logout.');
  } finally {
    if (cookie) await call('logout',{},cookie).catch(() => {});
    const client = new pg.Client({ connectionString:process.env.DATABASE_URL });
    await client.connect();
    await client.query('DELETE FROM assessment_submissions WHERE id = $1 AND email = $2', [id, 'qa@example.com']);
    await client.end();
    console.log('Removed only this run’s synthetic QA submission.');
  }
}
main().catch(() => { console.error('Live assessment verification failed. No credentials or response data were logged.'); process.exitCode=1; });
