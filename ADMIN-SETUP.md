# Assessment database and private admin

The public assessment saves name, email, the 24 selected answers (including the question and answer wording), timestamp, assessment version, overall score, maturity band, six dimension scores, and tied strongest/priority areas.

The API recalculates scores. It does not accept a browser-supplied score. Results appear only after a successful save. A UUID idempotency key prevents duplicate rows when retrying the same submission.

## Access

- Local assessment: http://127.0.0.1:4174/
- Local admin: http://127.0.0.1:4174/admin
- Production admin: https://inspired-vibe-visibility-assessment.vercel.app/admin
- The generated password is in the private, Git-ignored .admin-credentials.txt file. Move it into your password manager. It is not a public website asset.

Admin API reads require an authenticated session. Sessions expire after eight hours, are revoked on logout, and are invalidated when ADMIN_PASSWORD_HASH changes. Production cookies are Secure, HttpOnly, and SameSite=Strict. Passwords are scrypt-hashed. Database-backed rate limits apply to login and public submissions.

## Environment

Set DATABASE_URL (pooled), DATABASE_URL_UNPOOLED (migration connection), ADMIN_PASSWORD_HASH, and RATE_LIMIT_SECRET in the local .env.local file. Set the same required runtime names in Vercel. Never prefix secrets with VITE_ or NEXT_PUBLIC_.

The initial Neon integration connects all environments to the new database. Before development against real customer data, configure a separate Neon development/preview branch and its environment-specific URLs. Never seed real production data for tests.

## Commands

1. npm ci
2. npm ci --prefix visibility-engine-assessment
3. npm run db:migrate
4. npm run build
5. npm run dev

The standalone Vite preview serves only static files; use npm run dev for submissions and admin APIs. Vercel runs api/assessment.ts alongside the static frontend.

Run npm test for validation, authentication, rate limiting, server-side scoring, idempotency, and logout tests.

Schema changes are versioned in drizzle/. Generate migrations with npm run db:generate. Test migrations on an isolated database branch before applying them to a database containing customer records. Migrations are deliberately not run during every deployment.

## Password rotation and data handling

Generate a new scrypt hash using server/security.ts and replace ADMIN_PASSWORD_HASH in the local environment and Vercel. Redeploy so every function uses the new hash. Existing sessions then stop working. No password-reset endpoint is publicly exposed.

Submissions remain stored until the owner removes them. Establish a retention period and a process for handling access/deletion requests before collecting customer information at scale. This is a shared-password admin, not individual staff accounts or MFA. Share the password only with authorized reviewers; use individual authentication if multiple staff need audited access.

The contact form discloses assessment storage. No mailing-list enrollment or automated follow-up email is implemented. Previously completed browser-only assessments cannot be recovered into the database.
