import { spawnSync } from 'node:child_process';
// Run with --env-file=.env.local. Values travel through stdin, never command arguments or logs.
for (const name of ['ADMIN_PASSWORD_HASH', 'RATE_LIMIT_SECRET']) {
  const value = process.env[name];
  if (!value) throw new Error('Missing ' + name);
  for (const environment of ['production', 'preview']) {
    const result = spawnSync('cmd.exe', ['/d', '/s', '/c', `npx --yes vercel@59.15.1 env add ${name} ${environment} --scope 7-mile-media --sensitive`], {
      input: value, encoding: 'utf8', env: { ...process.env, NODE_OPTIONS: '--use-system-ca' },
    });
    if (result.status !== 0) { console.error('Unable to add ' + name + ' to ' + environment + '. Check whether it already exists.'); process.exit(1); }
    console.log(name + ' configured for ' + environment);
  }
}
