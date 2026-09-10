# Evidence-based competitor assessment — September 9, 2026

## Inputs and discovery

One required website field plus optional Instagram, YouTube and TikTok profile URLs. Only supported platform profile URLs are accepted. Supplied links are distinguished from links found on the scanned website; a supplied profile is not independent proof of brand ownership.

The existing Node backend now reads up to three sitemap sections and up to 16 additional relevant pages, prioritizing team, leadership, media, research, educational content and podcast pages. The added website crawl uses four concurrent requests and a 24-second deadline. Profile reads are also bounded. Existing private-network checks and redirect validation are retained. No AI or paid social API is used.

Linked founder profiles are discovered from company pages and structured data. No founder identity is guessed from a name, and unrelated personal websites are not automatically credited. JavaScript-only or access-controlled pages may remain unreadable.

## Scoring

The six pillar weights and revenue formulas remain unchanged. Social effectiveness now uses public profile audience and video counts, visible publishing evidence, leadership links and social-feed integrations. Share buttons and preview tags no longer receive effectiveness points. Audience and inventory contributions are capped, and the largest profile count is used rather than summing overlapping audiences. Views are displayed if profile-level counts are exposed, but are not treated as proof of organic performance.

Educational libraries are recognized alongside blogs. Repeated video embeds are deduplicated. Generic blog feed dates and copyright years no longer establish podcast recency.

Zero-evidence pillars are marked Not verified. Scores with missing profile metrics, failed reads or uncorroborated supplied profiles are provisional. Signal coverage means the share of six categories with some evidence, not completeness of data within each category. Unsupported market-ranking claims were removed. Missing data does not establish absence and does not automatically earn full credit.

Public results show evidence details, source URLs and profile metrics. The two user-provided benchmark domains are used for internal validation only; no domain-specific scoring overrides exist.

## Live metric availability

During the benchmark checks, TikTok public responses exposed follower and video counts for the company and founder profiles discovered. Instagram and YouTube counts were not extractable in those responses. Parsers support Instagram public follower descriptions and YouTube profile-header subscriber/video/view counts when those are exposed, but access is not guaranteed.

Total views, organic-versus-paid reach, watch time and engagement rates were not verified in the live checks. TikTok like counts are not mislabeled as views, Instagram post counts are not mislabeled as videos, and unrelated recommended-video counts are excluded.

## Verification

- TypeScript check and production build passed.
- Six automated tests cover profile validation, public-counter parsing, unrelated-counter exclusion, structured links, crawl boundaries, and unavailable-metric provenance.
- Both benchmark sites returned provisional 8/10 in final integration checks, after 18 and 19 pages respectively. They are not forced to 10/10.
- Invalid profile hosts returned HTTP 400.
- All three optional input fields were exercised together; supplied-profile provenance and profile-aware cache isolation passed.
- Run `npm run test:assessment` to repeat deterministic tests. Live metrics can change or become inaccessible.

Scans and leads retain their existing SQLite summary storage. Detailed source and social-metric results are returned with the assessment and kept in the short-lived scan cache; they are not a permanent analytics history.
