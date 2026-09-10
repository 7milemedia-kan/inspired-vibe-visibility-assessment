# Restored Authority Score + Impact Model

Source: `Authority Score + Impact Model — Source Code.zip` supplied by the user.

The archive contains one application folder, with no nested archives, environment files, databases, or saved competitor reports. Its README and comments were treated as source documentation, not as additional user requests.

## What is preserved

The original React screens, branding, copy, six-signal scoring engine, revenue formulas, contact capture, and leads dashboard are preserved. The scanner assesses one domain at a time. Competitive commentary is based on that domain's score; the app does not discover or assess named competitors side by side.

Only two runtime compatibility changes were made: npm start/dev use a cross-platform launcher, and reusePort is disabled on Windows. A blank environment example and these restoration notes were added.

All 82 original archive files were checked against their SHA-256 hashes. The only changed original files are `package.json`, `server/index.ts`, and `.gitignore`. The Windows launcher is an added convenience file. Runtime downloads, dependency caches, installed packages, and test databases are excluded from the rebuilt ZIP.

## Verification on September 9, 2026

- TypeScript check: passed.
- Production frontend and backend build: passed. The original PostCSS configuration emits a non-blocking `from` option warning.
- Server startup and homepage: passed, HTTP 200.
- Live URL assessment for `https://example.com`: HTTP 200, one page read, score 0, Limited confidence. This intentionally minimal site was used only as a smoke test.
- Empty URL: correctly rejected with HTTP 400.
- Bundled revenue-model regression suite: 17 passed, zero failed, one review flag. The review flag concerns the original lead-quality curve's increased marginal value at score 10. That curve was preserved as supplied.
- No browser interaction or visual screenshot comparison was performed; original screen files are byte-for-byte preserved.

On this computer, `START-WINDOWS.cmd` uses the downloaded project-local Node 22 runtime. In the source ZIP, install Node 22 and dependencies first; the runtime itself is not included. The application was not published: its existing Node/SQLite backend requires compatible hosting.

## API key audit

No configured external API keys, tokens, or private keys were found in the supplied source. No `.env` file was included. This does not establish what secrets may exist on a previous hosting account.

| Setting | Purpose | Required for URL scans? |
| --- | --- | --- |
| No external assessment key | Server fetches public HTML and sitemaps and applies local heuristics | No key needed |
| ADMIN_KEY | Your chosen password, at least 12 characters, for the leads dashboard | No |
| SESSION_SECRET | Random secret for server sessions; generated at startup when absent | No |
| HUBSPOT_TOKEN | Mentioned only for a future CRM integration | No; adding it alone does not activate HubSpot |

The HubSpot adapter has `CRM_ENABLED = false` and no live POST implementation. Supabase is listed as a dependency but is not connected. References to OpenAI and Google AI in the build allowlist are not implemented assessment integrations. Historical fallback passwords appear in the original README as descriptions of removed code; they are not active defaults.

Scans need a running Node server and outbound internet access. Static hosting alone cannot run `/api/score`. Sites that block automated requests or render their content through JavaScript may yield limited evidence. Scores are heuristic authority indicators, not verified search rankings, backlink measurements, social engagement analytics, or actual AI recommendation visibility.

## Run

Use Node 22 with this source's native SQLite dependency. From this application folder:

```powershell
npm ci --include=dev
npm run dev
```

Open http://localhost:5000. The model is at `/#/impact` and the admin dashboard at `/#/leads`.

To enable admin access, copy `.env.example` to `.env` and set `ADMIN_KEY` and `SESSION_SECRET`. No actual secrets are included in the deliverable.

```powershell
npm run check
npm run build
npm start
```

Production admin cookies require HTTPS. Persist `data.db` and its SQLite sidecars on the hosting server. Hosting must support Node and native SQLite; the supplied backend cannot be published as-is to a Cloudflare Workers-only runtime.
