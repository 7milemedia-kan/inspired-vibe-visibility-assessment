# Authority Score + Impact Model

INSPIRED Vibe's lead-generation tool. One app, three surfaces:

1. **`/`** — free authority scan. A prospect enters a domain, the server fetches
   and reads their public web presence, and returns a 0–10 score across six
   weighted signals. No email required.
2. **`/impact`** — the revenue impact model. Takes the score from the scan plus
   two numbers about the business (annual deal volume, average deal size) and
   projects the revenue difference between their current authority posture and a
   target one.
3. **`/leads`** — private admin log. Every scan, every captured contact, CSV
   export. Password-gated.

The commercial mechanic: the scan is free and ungated, the model is gated behind
a contact form. There is no visible bypass from a score to the model. The
`/impact` route itself stays reachable for anyone holding the link — it is a
shareable asset, not a vault — but a direct visitor gets the neutral version
with a default score and a prompt to go run a scan.

---

## Stack

| Layer    | Choice                                                             |
| -------- | ------------------------------------------------------------------ |
| Client   | React 18, Vite, TypeScript, wouter (hash router), Tailwind, shadcn |
| Server   | Express, TypeScript                                                |
| Data     | SQLite via better-sqlite3, Drizzle ORM                             |
| Sessions | express-session, MemoryStore                                       |
| Build    | esbuild + Vite, orchestrated by `script/build.ts`                  |

Hash routing (`/#/impact`) rather than history routing, because the app is
served as static files from object storage with API calls proxied to the
backend — there is no server-side rewrite to fall back on.

---

## Running it

```bash
npm install
npm run dev            # http://localhost:5000
```

Production:

```bash
npm run check          # tsc, no emit
npm run build          # -> dist/public (static) + dist/index.cjs (server)
ADMIN_KEY=<32-char-random> SESSION_SECRET=<64-hex> NODE_ENV=production node dist/index.cjs
```

`npm run check` runs `tsc` directly. Do not use `npx tsc` — it resolves the
wrong package.

### Environment variables

| Variable         | Required            | Notes                                                                                                                        |
| ---------------- | ------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `ADMIN_KEY`      | **yes, for `/leads`** | Minimum 12 characters. **No default.** If unset, the admin endpoints return 503 and the lead log is disabled. The scanner and model keep working. |
| `SESSION_SECRET` | recommended         | If unset, a random secret is generated at boot. Sessions then do not survive a restart, which is already true of MemoryStore. |
| `PORT`           | no                  | Defaults to 5000.                                                                                                            |
| `NODE_ENV`       | no                  | `production` enables `Secure` cookies. Note that `script/build.ts` inlines this as `production` in the bundle regardless.     |

**Neither secret has a fallback literal, deliberately.** An earlier revision
shipped `ADMIN_KEY || "iv-authority-2026"` and
`SESSION_SECRET || "iv-authority-dev-secret-change-me"`. Both were compiled into
the server bundle, identical on every deployment, guarding a table of prospect
names, work emails and phone numbers. The session secret was the worse of the
two: anyone reading it could forge an admin cookie outright, with no login
attempt and no rate limit to trip. If you reintroduce a default for local
convenience, gate it on `NODE_ENV !== "production"` and never let it reach a
build.

---

## Layout

```
client/src/
  pages/home.tsx        Scan form, score result, capture mount
  pages/impact.tsx      Revenue model — 4 inputs, projection, lever breakdown
  pages/leads.tsx       Admin: Scans tab, Contacts tab, CSV export
  components/capture.tsx  The contact gate
  components/brand.tsx    Logo, shell, shared brand furniture
  lib/handoff.ts        Score -> model context transfer (in-memory)
  lib/queryClient.ts    API_BASE resolution for the hosted proxy
server/
  analyze.ts            The scanner. HTTP fetch + heuristics, no LLM.
  routes.ts             All endpoints, auth, throttles
  storage.ts            Drizzle queries
  crm.ts                HubSpot seam — inert, see below
  index.ts              App wiring, session, request logging
shared/
  impact-model.ts       The revenue model. Pure functions, no I/O.
  schema.ts             Drizzle table definitions
```

### `shared/impact-model.ts` is the commercial core

Everything defensible about this tool lives in one pure, dependency-free module.
Five lever curves indexed 0–10 (deal volume, cycle compression, price
realisation, CAC efficiency, lead quality), a win-rate elasticity of 0.70, a CAC
elasticity of 0.80, and an 18-month linear ramp.

**Non-negotiable:** levers are applied as differentials —
`Lever(target) − Lever(current)`. The KPIs a user enters already reflect their
current authority level, so applying the target lever absolutely would
double-count the authority they have already built and inflate every projection.
This was a real bug in an earlier draft. Do not "simplify" it back.

---

## Data and privacy

Two tables: `scans` (every scan, no contact details) and `leads` (captured
contacts). The leads table holds full name, work email, company, optional phone,
the score, and the modelled revenue delta.

**SQLite is not production-grade persistence for this.** A single file, no
backup, no encryption at rest, no retention policy. It is adequate for a
prototype and inadequate for a table of real prospect PII. Move to Postgres or
Supabase before this collects leads that matter. Drizzle makes the swap
contained — `server/storage.ts` and `drizzle.config.ts`.

`.gitignore` excludes `data.db` **and its `-wal` / `-shm` sidecars.** The
sidecars were tracked at one point and contained live contact rows; that history
has been purged. Keep all three excluded.

### Security posture as shipped

- Admin auth is a session cookie (`__Host-iv.sid`, httpOnly, Secure, SameSite=Lax)
  with a bearer-token fallback for cross-origin hosted previews. The session id
  is regenerated on login and saved explicitly — after `regenerate()`,
  express-session does not always treat the new session as dirty, so the implicit
  save silently omits `Set-Cookie`.
- The old `?key=` query-parameter auth is removed and returns 401.
- 8 failed logins locks the IP for 15 minutes. Key comparison is constant-time.
- Lead submissions throttle at 5 per 10 minutes per IP.
- Free email domains are rejected at capture.
- The request logger suppresses bodies for `/api/lead`, `/api/admin`,
  `/api/leads` and `/api/contacts` so PII never reaches stdout.
- CSV export escapes leading `=+-@` to prevent formula injection in Excel.
- **The scanner is SSRF-guarded and that guard is load-bearing.** It resolves the
  target and rejects private, loopback, link-local and cloud-metadata ranges, and
  re-validates after every redirect. `server/analyze.ts` accepts an arbitrary
  user-supplied URL and fetches it from inside your infrastructure; without this
  it is an open proxy to your own metadata service. Do not relax it.

---

## HubSpot

`server/crm.ts` is a deliberate seam, currently inert (`CRM_ENABLED = false`).
Leads land in SQLite and leave through CSV. The field mapping is already written
out in `toCrmProperties()` so the shape does not have to be rediscovered.

To activate:

1. Create four custom contact properties in HubSpot: `authority_score`,
   `authority_band`, `authority_target_score`, `modeled_revenue_delta`.
2. Add a private-app token as `HUBSPOT_TOKEN`.
3. Implement the POST to `/crm/v3/objects/contacts` inside `syncLead()`.
4. Flip `CRM_ENABLED` to `true`.

`syncLead()` is called only after the lead row is committed, is fire-and-forget,
and never throws. A CRM outage must never cost you the lead. Failures leave
`crm_status = "pending"` so a backfill job can sweep them up.

---

## Known gaps

- `BOOKING_URL` points at `inspiredvibe.com/contact-us/` rather than a real
  scheduler.
- The capture form promises "a written summary specific to your scan." Nothing
  sends that summary. Either build the follow-up or soften the claim — it is a
  promise being collected against and not kept.
- The model still offers itself on Limited-reliability scans, where the score is
  derived from very few readable pages. Consider suppressing the gate there.
- `client/src/components/ui/` carries the full shadcn set. Twelve are used:
  button, card, dialog, input, label, separator, sheet, skeleton, toast, toaster,
  toggle, tooltip. The rest are unreferenced and safe to delete.
- Sessions are in-memory, so a restart signs out every admin and the process does
  not scale past one instance.
