import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
const scrypt = promisify(scryptCallback);
export const digest = (value: string) => createHash('sha256').update(value).digest('hex');
export const randomToken = () => randomBytes(32).toString('base64url');

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  const hash = await scrypt(password, salt, 64) as Buffer;
  return `scrypt:${salt}:${hash.toString('hex')}`;
}
export async function verifyPassword(password: unknown, encoded: string) {
  if (typeof password !== 'string' || password.length > 256 || !password.length) return false;
  const [method, salt, value] = encoded.split(':');
  if (method !== 'scrypt' || !/^[a-f0-9]{32}$/.test(salt ?? '') || !/^[a-f0-9]{128}$/.test(value ?? '')) return false;
  const actual = await scrypt(password, salt, 64) as Buffer;
  return timingSafeEqual(actual, Buffer.from(value, 'hex'));
}

export function parseSubmission(body: any) {
  if (!body || typeof body !== 'object' ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.id ?? '') ||
      typeof body.name !== 'string' || !body.name.trim() || body.name.trim().length > 120 ||
      typeof body.email !== 'string' || body.email.trim().length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email.trim()) ||
      !Array.isArray(body.answers) || body.answers.length !== 24 ||
      body.answers.some((v: unknown) => !Number.isInteger(v) || Number(v) < 0 || Number(v) > 4) ||
      body.version !== 'v2') {
    throw new Error('INVALID_SUBMISSION');
  }
  return { id: body.id, name: body.name.trim(), email: body.email.trim().toLowerCase(), answers: body.answers as number[], version: 'v2' };
}
