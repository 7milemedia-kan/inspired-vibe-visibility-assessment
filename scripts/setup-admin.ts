import { randomBytes } from 'node:crypto';
import { appendFile, readFile, writeFile } from 'node:fs/promises';
import { hashPassword } from '../server/security';

async function main() {
  const current = await readFile('.env.local', 'utf8').catch(() => '');
  if (/^ADMIN_PASSWORD_HASH=/m.test(current)) throw new Error('An admin password is already configured; refusing to overwrite it.');
  const password = randomBytes(24).toString('base64url');
  const hash = await hashPassword(password);
  const secret = randomBytes(32).toString('base64url');
  await appendFile('.env.local', `\nADMIN_PASSWORD_HASH="${hash}"\nRATE_LIMIT_SECRET="${secret}"\n`);
  await writeFile('.admin-credentials.txt', `Inspired Vibe assessment admin\n\nUsername: none (password only)\nPassword: ${password}\n\nLocal admin: http://127.0.0.1:4174/admin\nOnline admin: https://inspired-vibe-visibility-assessment.vercel.app/admin\n\nKeep this file private. Store the password in your password manager.\n`, { flag: 'wx', mode: 0o600 });
  console.log('Admin password generated. Read .admin-credentials.txt privately. No password was printed.');
}
main().catch(() => { console.error('Admin setup could not finish. Existing credentials were not overwritten.'); process.exitCode = 1; });
