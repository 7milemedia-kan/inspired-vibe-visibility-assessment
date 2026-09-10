# Podcast and founder inputs

Added optional podcast URL and founder full-name fields, request validation, profile-aware cache keys, and result panels.

Podcast inputs accept public show pages or RSS feeds. Readable podcast feeds, structured podcast metadata, show distribution links, and explicit podcast headings provide evidence. Episode dates come from feed items rather than copyright years. Supplied show association is distinguished from a link found on the company website; unverified associations keep the score provisional. Missing access is not treated as proof of absence.

Founder lookup uses a targeted public DuckDuckGo search for the quoted name plus company domain, then reads up to four result pages. The app verifies name-and-company co-occurrence in fetched page text, not search snippets. If the company website also mentions the full name, corroborating external mentions can contribute at most 0.3 points to the existing third-party pillar. Name matches do not prove identity or founder status.

No AI or search API key is used. This is not an exhaustive internet search. During testing, the public search page was accessible in one request but challenged the app's subsequent automated request. The app respects that response, reports search unavailable, and provides a manual search link. Reliable production-wide automated search would require a supported search provider; the key-free lookup is best-effort only.

Deterministic tests cover full-name matching, result-link extraction, access challenges, snippet exclusion, podcast feed dates, unavailable responses, show links, and false podcast positives. Detailed results are returned in the assessment and cached; they are not added to permanent SQLite scan-history fields.
