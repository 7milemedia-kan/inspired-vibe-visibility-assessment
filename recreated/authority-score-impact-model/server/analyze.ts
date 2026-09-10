/**
 * Authority Signal Engine
 * ------------------------------------------------------------------
 * Takes a company URL, gathers publicly visible signals, and returns a
 * 0-10 AI Authority / Thought Leadership Presence Score.
 *
 * Everything is derived from observable evidence on the public web.
 * No black-box scoring: every point awarded is traceable to a signal.
 */

import net from "node:net";
import { discover, readableText, pageLinks, type SocialEvidence, type Source } from "./discovery";
import type { SocialLinks } from "../shared/social-input";
import { checkPodcast, searchFounder, type SupplementalInput, type PodcastEvidence, type FounderEvidence } from "./supplemental";
import { lookup as dnsLookup } from "node:dns/promises";

const UA =
  "Mozilla/5.0 (compatible; AuthorityScoreBot/1.0; +https://inspiredvibe.com) AppleWebKit/537.36 Chrome/124 Safari/537.36";

export type Pillar = {
  key: string;
  label: string;
  earned: number;
  max: number;
  status: "strong" | "moderate" | "weak" | "absent" | "unverified";
  /** One factual sentence describing what was actually found. */
  summary: string;
  /** Plain-language cost of scoring at this level. */
  consequence: string;
  evidence: string[];
};

export type ScoreResult = {
  companyName: string;
  url: string;
  domain: string;
  audience: "B2B" | "B2C" | "Mixed" | "Unclear";
  audienceNote: string;
  /** Plain-language answer to "do people understand who it's for?" */
  audienceAnswer: string;
  sellingRealOffer: "Yes" | "Likely" | "Unclear";
  sellingNote: string;
  /** Plain-language answer to "do people understand what they do?" */
  offerAnswer: string;
  /** Competitive standing verdict shown in the third summary box. */
  standing: string;
  standingNote: string;
  score: number;
  band: string;
  bandLabel: string;
  headline: string;
  rationale: string;
  presenceNotes: string[];
  recommended: boolean;
  recommendation: string;
  pillars: Pillar[];
  biggestGap: string;
  confidence: "High" | "Moderate" | "Limited";
  confidenceNote: string;
  pagesScanned: number;
  provisional: boolean;
  evidenceCoverage: number;
  sources: Source[];
  socialMetrics: SocialEvidence[];
  podcastEvidence: PodcastEvidence | null;
  founderEvidence: FounderEvidence | null;
};

/* ------------------------------------------------------------------ */
/* consequence copy — what it costs to score at each level             */
/* ------------------------------------------------------------------ */

type Tier = "absent" | "weak" | "moderate" | "strong";

const tierOf = (earned: number, max: number): Tier => {
  if (earned === 0) return "absent";
  const r = earned / max;
  return r >= 0.75 ? "strong" : r >= 0.4 ? "moderate" : "weak";
};

const joinList = (items: string[]): string =>
  items.length <= 1
    ? items[0] ?? ""
    : items.length === 2
    ? `${items[0]} and ${items[1]}`
    : `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;

/**
 * Compose one readable summary sentence. Positives are what was found;
 * negatives are named gaps, listed separately so the sentence never reads
 * as a contradictory run-on.
 */
const summarize = (positives: string[], negatives: string[], fallback: string): string => {
  const pos = positives.filter(Boolean);
  const neg = negatives.filter(Boolean);
  if (!pos.length && !neg.length) return fallback;
  if (!pos.length) return `Missing: ${joinList(neg)}.`;
  const head = joinList(pos);
  const lead = `Found ${head}.`;
  return neg.length ? `${lead} Missing: ${joinList(neg)}.` : lead;
};

/* ------------------------------------------------------------------ */
/* fetching                                                            */
/* ------------------------------------------------------------------ */

/**
 * SSRF guard. Rejects loopback, link-local, private, carrier-grade NAT,
 * multicast/reserved, and cloud metadata addresses — including IPv6 literals,
 * IPv4-mapped IPv6, and hostnames that resolve to any of the above.
 */
function isBlockedIp(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const p = ip.split(".").map(Number);
    if (p.some((n) => Number.isNaN(n) || n < 0 || n > 255)) return true;
    if (p[0] === 0) return true; // this-network
    if (p[0] === 10) return true; // private
    if (p[0] === 127) return true; // loopback
    if (p[0] === 100 && p[1] >= 64 && p[1] <= 127) return true; // CGNAT
    if (p[0] === 169 && p[1] === 254) return true; // link-local + metadata
    if (p[0] === 172 && p[1] >= 16 && p[1] <= 31) return true; // private
    if (p[0] === 192 && p[1] === 0) return true; // 192.0.0.0/24, 192.0.2.0/24
    if (p[0] === 192 && p[1] === 168) return true; // private
    if (p[0] === 198 && (p[1] === 18 || p[1] === 19)) return true; // benchmark
    if (p[0] >= 224) return true; // multicast + reserved + broadcast
    return false;
  }
  if (net.isIPv6(ip)) {
    const s = ip.toLowerCase();
    if (s === "::" || s === "::1") return true;
    const mapped = s.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) return isBlockedIp(mapped[1]);
    if (/^(fe[89ab]|fc|fd)/.test(s)) return true; // link-local + unique-local
    if (s.startsWith("2002:")) return true; // 6to4
    if (s.startsWith("64:ff9b:")) return true; // NAT64
    return false;
  }
  return true; // unparseable — reject
}

async function hostIsSafe(hostname: string): Promise<boolean> {
  const h = hostname.toLowerCase().replace(/^\[/, "").replace(/\]$/, "");
  if (!h) return false;
  if (
    h === "localhost" ||
    h.endsWith(".localhost") ||
    h.endsWith(".local") ||
    h.endsWith(".internal") ||
    h.endsWith(".home.arpa") ||
    h.endsWith(".arpa")
  ) {
    return false;
  }
  if (net.isIP(h)) return !isBlockedIp(h);
  try {
    const addrs = await dnsLookup(h, { all: true });
    if (!addrs.length) return false;
    return addrs.every((a) => !isBlockedIp(a.address));
  } catch {
    return false;
  }
}

const FETCH_FAIL = (finalUrl: string) => ({
  ok: false,
  body: "",
  status: 0,
  finalUrl,
});

async function grab(
  url: string,
  ms = 9000
): Promise<{ ok: boolean; body: string; status: number; finalUrl: string }> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  let current = url;
  try {
    // Manual redirect handling so every hop is re-validated against the guard.
    for (let hop = 0; hop < 5; hop++) {
      let u: URL;
      try {
        u = new URL(current);
      } catch {
        return FETCH_FAIL(current);
      }
      if (u.protocol !== "https:" && u.protocol !== "http:") {
        return FETCH_FAIL(current);
      }
      if (u.username || u.password) return FETCH_FAIL(current);
      if (!(await hostIsSafe(u.hostname))) return FETCH_FAIL(current);

      const res = await fetch(current, {
        signal: ctrl.signal,
        redirect: "manual",
        headers: {
          "User-Agent": UA,
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
        },
      });

      if (res.status >= 300 && res.status < 400) {
        const loc = res.headers.get("location");
        if (!loc) return FETCH_FAIL(current);
        try {
          current = new URL(loc, current).toString();
        } catch {
          return FETCH_FAIL(current);
        }
        continue;
      }

      const body = res.ok ? (await res.text()).slice(0, 900_000) : "";
      return { ok: res.ok, body, status: res.status, finalUrl: current };
    }
    return FETCH_FAIL(current); // too many redirects
  } catch {
    return FETCH_FAIL(current);
  } finally {
    clearTimeout(t);
  }
}

export function normalizeUrl(raw: string): string | null {
  let s = (raw || "").trim();
  if (!s) return null;
  s = s.replace(/\s+/g, "");
  if (!/^https?:\/\//i.test(s)) s = "https://" + s;
  try {
    const u = new URL(s);
    if (u.protocol !== "https:" && u.protocol !== "http:") return null;
    if (u.username || u.password) return null;
    const host = u.hostname.toLowerCase().replace(/^\[/, "").replace(/\]$/, "");
    if (net.isIP(host)) return null; // bare IPs are never a company website
    if (!host.includes(".")) return null;
    if (
      host === "localhost" ||
      host.endsWith(".localhost") ||
      host.endsWith(".local") ||
      host.endsWith(".internal") ||
      host.endsWith(".arpa")
    ) {
      return null;
    }
    return u.origin + (u.pathname === "/" ? "" : u.pathname);
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/* parsing helpers                                                     */
/* ------------------------------------------------------------------ */

const strip = (html: string) =>
  html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const meta = (html: string, name: string) => {
  const re = new RegExp(
    `<meta[^>]+(?:name|property)=["']${name}["'][^>]*content=["']([^"']*)["']`,
    "i"
  );
  const alt = new RegExp(
    `<meta[^>]+content=["']([^"']*)["'][^>]*(?:name|property)=["']${name}["']`,
    "i"
  );
  return (html.match(re)?.[1] || html.match(alt)?.[1] || "").trim();
};

const hrefs = (html: string): string[] => {
  const out: string[] = [];
  const re = /href=["']([^"']+)["']/gi;
  let m;
  while ((m = re.exec(html))) out.push(m[1]);
  return out;
};

const matchAllValues = (hay: string, re: RegExp): string[] => {
  const out: string[] = [];
  let m: RegExpExecArray | null;
  const r = new RegExp(re.source, re.flags.includes("g") ? re.flags : re.flags + "g");
  while ((m = r.exec(hay))) out.push(m[1]);
  return out;
};

const count = (hay: string, re: RegExp) => (hay.match(re) || []).length;

/* ------------------------------------------------------------------ */
/* the analyzer                                                        */
/* ------------------------------------------------------------------ */

export async function analyze(inputUrl: string, socialLinks: SocialLinks = {}, supplemental: SupplementalInput = {}): Promise<ScoreResult> {
  const base = normalizeUrl(inputUrl)!;
  let origin = new URL(base).origin;
  const domain = new URL(base).hostname.replace(/^www\./, "");

  const home = await grab(base, 12000);
  if (!home.ok || home.body.length < 400) {
    throw Object.assign(
      new Error(
        "We couldn't reach that site or it returned no readable content. Check the URL, or the site may be blocking automated visitors."
      ),
      { code: "UNREACHABLE" }
    );
  }

  origin = new URL(home.finalUrl).origin;
  let pagesScanned = 1;
  const homeHtml = home.body;
  const homeText = strip(homeHtml);
  const homeLower = homeHtml.toLowerCase();
  const textLower = homeText.toLowerCase();
  const links = hrefs(homeHtml);

  /* --- identity ------------------------------------------------- */
  const rawTitle = (homeHtml.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || "")
    .replace(/&amp;/g, "&")
    .replace(/&#\d+;/g, "")
    .trim();
  const ogSite = meta(homeHtml, "og:site_name");
  const domainWord = domain.split(".")[0].replace(/[-_]/g, "").toLowerCase();
  const generic = /^(home|homepage|welcome|index|untitled|home page|main)$/i;

  const segments = [ogSite, rawTitle]
    .filter(Boolean)
    .flatMap((t) => t.split(/\s*[|\u2013\u2014\u00b7\u2022:]\s*|\s+-\s+/))
    .map((x) => x.replace(/\s+/g, " ").trim())
    .filter((x) => x.length >= 2 && x.length <= 42 && !generic.test(x));

  const domainMatch = segments.find(
    (x) => x.replace(/[^a-z0-9]/gi, "").toLowerCase() === domainWord
  );
  const domainContains = segments.find((x) =>
    domainWord.includes(x.replace(/[^a-z0-9]/gi, "").toLowerCase().slice(0, 12))
  );
  const guessFromDomain = domain
    .split(".")[0]
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

  let companyName =
    domainMatch ||
    domainContains ||
    (segments.length ? segments[segments.length - 1].length <= 28 && segments.length > 1
      ? segments[segments.length - 1]
      : segments[0] : "") ||
    guessFromDomain;
  companyName = companyName.replace(/\s+/g, " ").trim();
  if (!companyName || generic.test(companyName) || companyName.length > 42)
    companyName = guessFromDomain;

  const description = meta(homeHtml, "description") || meta(homeHtml, "og:description");

  /* --- secondary page discovery --------------------------------- */
  const internal = links
    .map((h) => {
      try {
        return new URL(h, origin).href;
      } catch {
        return "";
      }
    })
    .filter((h) => h && h.startsWith(origin));

  const findPath = (words: string[]) =>
    internal.find((h) => {
      const p = new URL(h).pathname.toLowerCase();
      return words.some((w) => p === `/${w}` || p === `/${w}/` || p.startsWith(`/${w}/`));
    });

  const navBlogUrl =
    findPath(["blog", "insights", "resources", "articles", "news", "learn", "library", "ideas", "perspectives", "thinking", "training", "courses", "course", "books", "research"]) || null;
  const navPodcastUrl = findPath(["podcast", "podcasts", "show", "episodes"]) || null;
  const caseStudyUrl = findPath(["case-studies", "case-study", "customers", "success-stories", "clients", "work"]) || null;
  const pricingUrl = findPath(["pricing", "plans", "packages"]) || null;

  // Some sites render navigation client-side, so nav-link discovery misses the
  // content hub entirely. Probe the conventional paths directly as a fallback.
  let blogUrl = navBlogUrl;
  let podcastUrl = navPodcastUrl;

  if (!blogUrl || !podcastUrl) {
    const probes: [string, string][] = [];
    if (!blogUrl) for (const w of ["blog", "resources", "insights", "news"]) probes.push(["blog", `${origin}/${w}`]);
    if (!podcastUrl) probes.push(["podcast", `${origin}/podcast`]);
    const hits = await Promise.all(
      probes.map(async ([kind, u]) => {
        const r = await grab(u, 6000);
        return r.ok && r.body.length > 800 ? ([kind, u] as [string, string]) : null;
      })
    );
    for (const h of hits) {
      if (!h) continue;
      if (h[0] === "blog" && !blogUrl) blogUrl = h[1];
      if (h[0] === "podcast" && !podcastUrl) podcastUrl = h[1];
    }
  }

  const fetchList = [
    ["sitemap", `${origin}/sitemap.xml`],
    ["sitemapIndex", `${origin}/sitemap_index.xml`],
    ["blog", blogUrl],
    ["podcast", podcastUrl],
  ].filter((x) => !!x[1]) as [string, string][];

  const fetched: Record<string, string> = {};
  await Promise.all(
    fetchList.map(async ([k, u]) => {
      const r = await grab(u, 8000);
      if (r.ok) {
        fetched[k] = r.body;
        pagesScanned++;
      }
    })
  );

  // Read several sitemap sections; URL counts are inventory, not proof of search indexing.
  let sitemapXml = fetched.sitemap || fetched.sitemapIndex || "";
  if (/<sitemapindex/i.test(sitemapXml)) {
    const children = matchAllValues(sitemapXml, /<loc>\s*([^<\s]+)\s*<\/loc>/gi)
      .filter(u => { try { return new URL(u).hostname.replace(/^www\./, "") === domain; } catch { return false; } })
      .sort((a,b) => Number(!/post|page|blog|article|news|insight/i.test(a)) - Number(!/post|page|blog|article|news|insight/i.test(b))).slice(0, 3);
    const sections = await Promise.all(children.map(u => grab(u, 6000)));
    sitemapXml = sections.filter(r => r.ok).map(r => r.body).join("\n");
  }

  const sitemapLocs = matchAllValues(sitemapXml, /<loc>\s*([^<\s]+)\s*<\/loc>/gi);
  const sitemapCount = sitemapLocs.length;
  const contentUrlCount = sitemapLocs.filter((l) =>
    /\/(blog|post|posts|article|articles|news|insight|insights|resource|resources|guide|guides|episode|podcast)\//i.test(l)
  ).length;

  const lastmods = matchAllValues(sitemapXml, /<lastmod>\s*([^<\s]+)\s*<\/lastmod>/gi)
    .map((v) => Date.parse(v))
    .filter((n) => !Number.isNaN(n) && n <= Date.now())
    .sort((a, b) => b - a);
  const daysSinceUpdate = lastmods.length
    ? Math.round((Date.now() - lastmods[0]) / 86_400_000)
    : null;

  const initial = [{ url: home.finalUrl, html: homeHtml },
    ...(blogUrl && fetched.blog ? [{ url: blogUrl, html: fetched.blog }] : []),
    ...(podcastUrl && fetched.podcast ? [{ url: podcastUrl, html: fetched.podcast }] : [])];
  const discovery = await discover(home.finalUrl, initial, sitemapLocs, socialLinks, grab);
  const [podcastEvidence, founderEvidence] = await Promise.all([
    supplemental.podcastUrl ? checkPodcast(supplemental.podcastUrl, discovery.pages, grab) : Promise.resolve(null),
    supplemental.founderName ? searchFounder(supplemental.founderName, companyName, domain, discovery.pages, grab) : Promise.resolve(null),
  ]);
  pagesScanned = discovery.pages.length;
  // Public social HTML is not mixed into company content: recommendations on those pages
  // must not become evidence of this company's articles, videos or affiliations.
  const allHtml = discovery.pages.map(p => p.html).join("\n");
  const allLower = allHtml.toLowerCase();
  const allText = discovery.pages.map(p => readableText(p.html)).join(" ").toLowerCase();
  const publicationDates = [...new Set(discovery.pages.flatMap(p => [
    ...matchAllValues(p.html, /"datePublished"\s*:\s*"([^" ]+)"/gi),
    ...matchAllValues(p.html, /<time[^>]+datetime=["']([^"']+)["']/gi),
  ]))].map(Date.parse).filter(n => Number.isFinite(n) && n <= Date.now());
  const recentPublications = publicationDates.filter(n => Date.now() - n <= 180 * 86400000).length;
  const publicMetrics = discovery.social.flatMap(p => p.metrics);

  /* ================================================================
     PILLAR 1 — Social presence (max 2.5)
     ================================================================ */
  const socialMap: Record<string, RegExp> = {
    LinkedIn: /linkedin\.com\/(company|school|in)\//i,
    YouTube: /youtube\.com\/(channel\/|c\/|@|user\/|[a-z0-9_-]{3,}(?:["'/]))/i,
    "X / Twitter": /(twitter\.com|x\.com)\/(?!share|intent|home)[a-z0-9_]{2,}/i,
    Instagram: /instagram\.com\/[a-z0-9_.]{2,}/i,
    Facebook: /facebook\.com\/(?!sharer|share|tr\?)[a-z0-9_.\-]{2,}/i,
    TikTok: /tiktok\.com\/@[a-z0-9_.]{2,}/i,
  };
  const linkedUrls = discovery.pages.flatMap(p => pageLinks(p.html, p.url)).join("\n");
  const socialFound = Object.entries(socialMap)
    .filter(([name, re]) => (name === "YouTube" ? discovery.social.some(p => p.platform === "youtube" && (p.linkedFromWebsite || p.metrics.length > 0)) : re.test(linkedUrls)) || discovery.social.some(p => p.metrics.length > 0 && ({ instagram: "Instagram", youtube: "YouTube", tiktok: "TikTok" }[p.platform]) === name))
    .map(([k]) => k);

  const hasLinkedIn = socialFound.includes("LinkedIn");
  let socialPts = 0;
  const socialEv: string[] = [];
  const socialPos: string[] = [];
  const socialNeg: string[] = [];

  if (socialFound.length === 0) {
    socialEv.push("No social profiles detected in the pages read");
  } else {
    socialPts += Math.min(0.8, socialFound.length * 0.2);
    socialEv.push(`${socialFound.length} channel${socialFound.length > 1 ? "s" : ""} linked or supported by supplied profile metrics: ${socialFound.join(", ")}`);
    socialPos.push(
      `${socialFound.length} channel${socialFound.length > 1 ? "s" : ""} linked (${socialFound.join(", ")})`
    );
    if (hasLinkedIn) {
      socialPts += 0.3;
      socialEv.push("LinkedIn company page present — the primary B2B authority channel");
      socialPos.push("a LinkedIn company page, the primary B2B authority channel");
    } else {
      socialEv.push("A LinkedIn company profile link was not detected");
      socialNeg.push("a LinkedIn company page");
    }
    if (socialFound.length >= 4) {
      socialPts += 0.15;
      socialEv.push("Multi-channel distribution footprint");
    }
  }
  socialPts = Math.min(1.25, socialPts);
  const socialSummary = summarize(socialPos, socialNeg, "Social profile links were not verified in the pages read.");

  /* ================================================================
     PILLAR 2 — Social effectiveness (max 1.25)
     Presence asks whether the channels exist. Effectiveness asks
     whether they are doing any work: people attached to the brand,
     activity surfaced on the site, and content built to travel.
     ================================================================ */
  let socialEffPts = 0;
  const socialEffEv: string[] = [];
  const socialEffPos: string[] = [];
  const socialEffNeg: string[] = [];

  const namedLeadership = /founder|co-founder|chief executive|leadership|our team/i.test(allText);
  const embeddedFeed = /embedsocial|elfsight|juicer\.io|curator\.io|taggbox|sociablekit|instagram\.com\/embed|twitter-timeline|linkedin\.com\/embed/i.test(allHtml);
  const maxAudience = Math.max(0, ...publicMetrics.filter(m => m.name === "followers" || m.name === "subscribers").map(m => m.value));
  const maxVideoCount = Math.max(0, ...publicMetrics.filter(m => m.name === "videos").map(m => m.value));
  if (maxAudience > 0) {
    socialEffPts += maxAudience >= 100000 ? 0.35 : maxAudience >= 10000 ? 0.25 : 0.15;
    socialEffEv.push("Public profile audience counts were extractable; reach does not establish engagement or content quality.");
  }
  if (maxVideoCount >= 10) { socialEffPts += maxVideoCount >= 100 ? 0.35 : 0.2; socialEffEv.push("A public profile exposes a published video inventory."); }
  if (embeddedFeed) { socialEffPts += 0.2; socialEffEv.push("Social-feed integration detected; this does not verify posting frequency."); }
  if (namedLeadership && socialFound.length) { socialEffPts += 0.15; socialEffEv.push("Named leadership and social distribution links appear on the scanned website."); }
  if (recentPublications >= 2 && socialFound.length) { socialEffPts += 0.2; socialEffEv.push("Multiple dated publications and social distribution links found; social posting cadence remains unverified."); }
  socialEffPts = Math.min(1.25, socialEffPts);
  socialEffEv.push("Engagement rate, watch time and organic-versus-paid reach are not available from this scan.");
  const socialEffSummary = socialEffPts > 0
    ? "Publishing and distribution evidence found. Profile counts are shown separately when extractable; superior performance is not inferred."
    : "Social activity metrics could not be verified from the public pages read.";

  /* ================================================================
     PILLAR 3 — Content & SEO footprint (max 3.0)
     ================================================================ */
  let contentPts = 0;
  const contentEv: string[] = [];
  const contentPos: string[] = [];
  const contentNeg: string[] = [];

  if (blogUrl) {
    contentPts += 0.8;
    contentEv.push(`Content hub found at ${new URL(blogUrl).pathname}`);
    contentPos.push(`a content hub at ${new URL(blogUrl).pathname}`);
  } else {
    contentEv.push("No blog, insights, or resource hub found in site navigation");
    contentNeg.push("a blog or resource hub");
  }

  if (sitemapCount > 0) {
    if (sitemapCount >= 400) {
      contentPts += 1.0;
      contentEv.push(`Large sitemap inventory — ${sitemapCount}+ URLs in sitemap`);
      contentPos.push(`a large sitemap inventory (${sitemapCount}+ URLs)`);
    } else if (sitemapCount >= 120) {
      contentPts += 0.75;
      contentEv.push(`Substantial site — ${sitemapCount} URLs in sitemap`);
      contentPos.push(`substantial site depth (${sitemapCount} URLs)`);
    } else if (sitemapCount >= 35) {
      contentPts += 0.5;
      contentEv.push(`Moderate site depth — ${sitemapCount} URLs in sitemap`);
      contentPos.push(`moderate site depth (${sitemapCount} URLs)`);
    } else {
      contentPts += 0.2;
      contentEv.push(`Thin site — only ${sitemapCount} URLs in sitemap`);
      contentPos.push(`a thin site of only ${sitemapCount} URLs`);
    }
  } else {
    contentEv.push("XML sitemap could not be verified by this scan");
    contentNeg.push("a readable sitemap");
  }

  if (contentUrlCount >= 60) {
    contentPts += 0.7;
    contentEv.push(`${contentUrlCount}+ published article-style URLs listed`);
    contentPos.push(`${contentUrlCount}+ published article-style URLs listed`);
  } else if (contentUrlCount >= 15) {
    contentPts += 0.45;
    contentEv.push(`${contentUrlCount} published article-style URLs listed`);
    contentPos.push(`${contentUrlCount} published article-style URLs listed`);
  } else if (contentUrlCount > 0) {
    contentPts += 0.2;
    contentEv.push(`${contentUrlCount} URLs matched article-style paths; other publication formats may exist`);
    contentPos.push(`${contentUrlCount} article-style paths in the sitemap`);
  }

  if (daysSinceUpdate !== null) {
    if (daysSinceUpdate <= 30) {
      contentPts += 0.5;
      contentEv.push(`Actively maintained — last content update ${daysSinceUpdate} day${daysSinceUpdate === 1 ? "" : "s"} ago`);
      contentPos.push("active maintenance");
    } else if (daysSinceUpdate <= 120) {
      contentPts += 0.3;
      contentEv.push(`Updated ~${Math.round(daysSinceUpdate / 30)} months ago — inconsistent cadence`);
      contentPos.push(`a last update about ${Math.round(daysSinceUpdate / 30)} months ago`);
    } else {
      contentEv.push(`Stale — no content update in ~${Math.round(daysSinceUpdate / 30)} months`);
      contentPos.push(`nothing new in about ${Math.round(daysSinceUpdate / 30)} months`);
    }
  }

  const hasSchema = /application\/ld\+json/i.test(homeHtml);
  const hasOg = !!meta(homeHtml, "og:title");
  const hasCanonical = /rel=["']canonical["']/i.test(homeHtml);
  const seoHygiene = [hasSchema, hasOg, hasCanonical, !!description].filter(Boolean).length;
  if (seoHygiene >= 3) {
    contentPts += 0.3;
    contentEv.push("Solid technical SEO hygiene (schema, OG tags, canonical, meta description)");
    contentPos.push("solid technical SEO hygiene");
  } else if (seoHygiene <= 1) {
    contentEv.push("Weak on-page SEO fundamentals — missing structured data and metadata");
    contentNeg.push("structured data and complete metadata");
  }

  const gatedAssets = /white\s?paper|e-?book|research report|benchmark report|download the guide|state of the/i.test(allText);
  if (gatedAssets) {
    contentPts += 0.25;
    contentEv.push("Publishes long-form assets (guides, reports, or whitepapers)");
    contentPos.push("published long-form assets");
  }

  const hasNewsletter = /newsletter|subscribe to our|weekly insights|join \d[\d,]* (subscribers|readers)/i.test(allText);
  if (hasNewsletter) {
    contentPts += 0.2;
    contentEv.push("Runs an owned email/newsletter channel");
    contentPos.push("an owned newsletter");
  }
  const learningPages = discovery.pages.filter(p => /training|courses?|books?|research|guides?|workshop/i.test(new URL(p.url).pathname));
  if (!blogUrl && learningPages.length) { contentPts += 0.8; contentPos.push("an educational content collection"); contentEv.push("Training, course, book or research pages were read."); }
  if (recentPublications >= 2) { contentPts += 0.35; contentEv.push("Found " + recentPublications + " distinct recent publication dates across scanned pages."); }
  contentPts = Math.min(3.0, contentPts);
  const contentSummary = summarize(contentPos, contentNeg, "No meaningful owned content footprint was found.");

  /* ================================================================
     PILLAR 4 — Podcast (max 1.5)
     A linked show that has not published in years is not an asset.
     Presence is scored first, then discounted for inactivity.
     ================================================================ */
  let podPts = 0;
  const podEv: string[] = [];
  const podPos: string[] = [];
  const podNeg: string[] = [];
  const podPlatform = /podcasts\.apple\.com|open\.spotify\.com\/show|buzzsprout|libsyn|podbean|captivate\.fm|transistor\.fm|simplecast|anchor\.fm|megaphone\.fm|redcircle|spreaker/i.test(allHtml);
  const podWord = /\bpodcast\b/i.test(allText);
  const episodeLang = /episode\s*\d|ep\.\s*\d|listen now|all episodes|subscribe on apple/i.test(allText);

  if (podcastUrl || podPlatform) {
    podPts += 0.9;
    podEv.push(podcastUrl ? `Dedicated podcast page at ${new URL(podcastUrl).pathname}` : "Linked to podcast distribution platforms");
    podPos.push(podcastUrl ? `a dedicated podcast page at ${new URL(podcastUrl).pathname}` : "links to podcast distribution platforms");
    if (podPlatform) {
      podPts += 0.3;
      podEv.push("Distributed on Apple Podcasts / Spotify or a hosting platform");
      podPos.push("distribution on Apple or Spotify");
    }
    if (episodeLang) {
      podPts += 0.3;
      podEv.push("Episode-level content is visible and organized");
      podPos.push("organised episode-level content");
    }
  } else if (podWord) {
    podPts += 0.35;
    podEv.push("Podcasting is mentioned; ownership and episode inventory are not verified");
    podPos.push("podcasting mentioned; show ownership not verified");
  } else {
    podEv.push("Podcast ownership or appearances not verified in the pages read");
  }

  /* --- recency check: is the show actually still running? --------- */
  let podMonthsSince: number | null = null;
  if (podPts > 0.5) {
    const feedCandidates = Array.from(
      new Set(
        [
          ...matchAllValues(
            allHtml,
            /<link[^>]+type=["']application\/(?:rss|atom)\+xml["'][^>]*href=["']([^"']+)["']/gi
          ),
          ...matchAllValues(allHtml, /href=["']([^"']*(?:feed\.xml|rss\.xml|\/feed\/?|\/rss\/?)[^"']*)["']/gi),
          ...matchAllValues(allHtml, /["'](https?:\/\/(?:feeds?|rss)\.[^"'\s<>]+)["']/gi),
        ]
          .map((h) => {
            try {
              return new URL(h, origin).href;
            } catch {
              return "";
            }
          })
          .filter(Boolean)
      )
    )
      .sort((a, b) => {
        const rank = (u: string) => (/podcast|episode|show/i.test(u) ? 0 : 1);
        return rank(a) - rank(b);
      })
      .slice(0, 2);

    let newestMs: number | null = null;
    for (const f of feedCandidates) {
      const res = await grab(f, 6000);
      if (!res.ok || !/<(?:rss|feed|channel)[\s>]/i.test(res.body)) continue;
      pagesScanned++;
      if (!/itunes:|podcast:|<enclosure[^>]+(?:audio|\.mp3|\.m4a)/i.test(res.body)) continue;
      const stamps = matchAllValues(
        res.body,
        /<(?:pubDate|published)>\s*([^<]{6,60})</gi
      )
        .map((v) => Date.parse(v.trim()))
        .filter((n) => !Number.isNaN(n) && n < Date.now() + 86_400_000);
      if (stamps.length) {
        const max = Math.max(...stamps);
        newestMs = newestMs === null ? max : Math.max(newestMs, max);
      }
    }

    if (newestMs !== null) {
      podMonthsSince = Math.max(0, Math.round((Date.now() - newestMs) / 2_629_800_000));
      if (podMonthsSince <= 3) {
        podPts += 0.2;
        podEv.push(`Actively publishing — most recent episode about ${podMonthsSince} month${podMonthsSince === 1 ? "" : "s"} ago`);
        podPos.push("an active publishing cadence");
      } else if (podMonthsSince <= 12) {
        podPts -= 0.3;
        podEv.push(`Slowing down — nothing new in about ${podMonthsSince} months`);
        podPos.push(`nothing new in about ${podMonthsSince} months`);
      } else {
        podPts = Math.min(podPts, 0.45);
        podEv.push(`Dormant — no episode in roughly ${Math.round(podMonthsSince / 12)} year${podMonthsSince >= 24 ? "s" : ""}, so this counts as a dead link rather than an asset`);
        podPos.push(`no new episode in roughly ${Math.round(podMonthsSince / 12)} year${podMonthsSince >= 24 ? "s" : ""}`);
      }
    } else {
      podEv.push("Publishing cadence could not be verified — no readable feed or episode dates");
    }
  }

  if (podcastEvidence) {
    podEv.push(podcastEvidence.note);
    if (podcastEvidence.verified) {
      let suppliedPoints = 0.9;
      if (podcastEvidence.episodes > 0) suppliedPoints += 0.3;
      if (podcastEvidence.latestEpisode && Date.now() - Date.parse(podcastEvidence.latestEpisode) <= 90 * 86400000) suppliedPoints += 0.3;
      if (podcastEvidence.latestEpisode && Date.now() - Date.parse(podcastEvidence.latestEpisode) > 365 * 86400000) suppliedPoints = Math.min(suppliedPoints, 0.45);
      podPts = Math.max(podPts, suppliedPoints);
      podPos.push("podcast evidence at the supplied URL");
      podEv.push(`Supplied podcast: ${podcastEvidence.url}. ${podcastEvidence.episodes} episodes found in the readable feed; this is not necessarily the complete archive.`);
      if (podcastEvidence.latestEpisode) podEv.push(`Latest readable episode date: ${podcastEvidence.latestEpisode.slice(0, 10)}`);
    }
  }
  podPts = Math.max(0, Math.min(1.5, podPts));
  const podSummary = summarize(podPos, podNeg, "No podcast — owned or guest — was detected.");

  /* ================================================================
     PILLAR 5 — Video (max 1.5)
     ================================================================ */
  let vidPts = 0;
  const vidEv: string[] = [];
  const vidPos: string[] = [];
  const vidNeg: string[] = [];
  const ytChannel = discovery.social.some(p => p.platform === "youtube" && (p.linkedFromWebsite || p.metrics.length > 0));
  const embeds = new Set(matchAllValues(allHtml,
    /((?:youtube(?:-nocookie)?\.com\/embed\/|youtu\.be\/|player\.vimeo\.com\/video\/|vimeo\.com\/|fast\.wistia\.(?:com|net)\/embed\/(?:iframe|medias)\/|loom\.com\/(?:share|embed)\/)[a-z0-9_-]+)/gi)).size;
  const nativeVideo = count(allHtml, /<video[\s>]/gi);
  const webinar = /\bwebinar|on-?demand video|watch the (demo|replay|session)/i.test(allText);

  if (ytChannel) {
    vidPts += 0.6;
    vidEv.push("YouTube channel linked or supplied; association is shown in profile evidence");
    vidPos.push("an owned YouTube channel");
  } else {
    vidNeg.push("an owned video channel");
  }
  if (embeds >= 3) {
    vidPts += 0.6;
    vidEv.push(`${embeds} video embeds across scanned pages — video is a core format`);
    vidPos.push(`${embeds} video embeds across the site`);
  } else if (embeds > 0) {
    vidPts += 0.35;
    vidEv.push(`${embeds} video embed${embeds > 1 ? "s" : ""} found — video used selectively`);
    vidPos.push(`${embeds} video embed${embeds > 1 ? "s" : ""}, used selectively`);
  } else if (nativeVideo > 0) {
    vidPts += 0.2;
    vidEv.push("Native or background video detected on the website");
    vidPos.push("background video on the site");
    vidNeg.push("a distributed video library");
  } else {
    vidNeg.push("any video embedded on the site");
  }
  if (webinar) {
    vidPts += 0.3;
    vidEv.push("Runs webinars or on-demand video sessions");
    vidPos.push("webinars or on-demand sessions");
  }
  if (maxVideoCount >= 10) { vidPts += 0.4; vidEv.push(`Public profile inventory includes ${maxVideoCount} videos; individual view performance is not verified.`); }
  if (vidPts === 0) vidEv.push("Video channels, embeds or webinars not verified in the pages read");
  vidPts = Math.min(1.5, vidPts);
  const vidSummary = summarize(vidPos, vidNeg, "No video presence was detected anywhere on the site.");

  /* ================================================================
     PILLAR 6 — Third-party validation (max 1.5)
     ================================================================ */
  let extPts = 0;
  const extEv: string[] = [];
  const extPos: string[] = [];
  const extNeg: string[] = [];
  const reviewSites = [
    ["G2", /g2\.com|g2crowd/i],
    ["Capterra", /capterra\.com/i],
    ["TrustRadius", /trustradius\.com/i],
    ["Trustpilot", /trustpilot\.com/i],
    ["Clutch", /clutch\.co/i],
    ["Software Advice", /softwareadvice\.com/i],
    ["Gartner Peer Insights", /gartner\.com\/reviews|peerinsights/i],
  ]
    .filter(([, re]) => (re as RegExp).test(allHtml))
    .map(([n]) => n as string);

  if (reviewSites.length) {
    extPts += Math.min(0.7, 0.4 + reviewSites.length * 0.15);
    extEv.push(`Listed on B2B review platforms: ${reviewSites.join(", ")}`);
    extPos.push(`listings on ${reviewSites.join(", ")}`);
  } else {
    extEv.push("No G2, Capterra, or comparable review-platform badges surfaced on the site");
    extNeg.push("any third-party review-platform presence");
  }

  const pressRoom = /\b(press|media kit|in the news|as seen (in|on)|newsroom|press release)\b/i.test(allText);
  if (pressRoom) {
    extPts += 0.3;
    extEv.push("Maintains a press/newsroom or earned-media section");
    extPos.push("a press or earned-media section");
  }
  const speaking = /\b(keynote|speaking|conference|summit|panel|award|recognized by|named a leader|top \d+)\b/i.test(allText);
  if (speaking) {
    extPts += 0.3;
    extEv.push("References speaking engagements, awards, or industry recognition");
    extPos.push("speaking engagements, awards, or industry recognition");
  }
  const socialProof = /\btestimonial|trusted by|case stud|client results|success stor/i.test(allText) || !!caseStudyUrl;
  if (socialProof) {
    extPts += 0.25;
    extEv.push("Publishes customer proof (case studies or testimonials)");
    extPos.push("published customer proof");
  }
  if (extPts === 0)
    extEv.push("Press, awards, speaking and customer proof were not verified in the pages read");
  if (founderEvidence?.companyMentionsName) {
    const corroborated = founderEvidence.sources.filter(source => source.matched && new URL(source.url).hostname.replace(/^www\./, "") !== domain);
    if (corroborated.length) {
      extPts += Math.min(0.3, corroborated.length * 0.15);
      extEv.push("Public pages mention the supplied person together with this company; the company website also mentions the name. Founder status is not independently verified.");
      extPos.push("corroborated name-and-company mentions on external pages");
    }
  }
  extPts = Math.min(1.5, extPts);
  const extSummary = summarize(
    extPos,
    extNeg,
    "Third-party validation was not verified in the pages read."
  );

  /* ================================================================
     Audience & offer classification
     ================================================================ */
  const b2bHits = [
    /\bb2b\b/i, /\benterprise\b/i, /request a demo|book a demo|schedule a demo|get a demo/i,
    /\bsaas\b/i, /\bplatform\b/i, /\bintegrations?\b/i, /\bapi\b/i, /\broi\b/i,
    /case stud/i, /\bwhite\s?paper\b/i, /\bprocurement\b/i, /\bsla\b/i,
    /per (seat|user|month)/i, /talk to sales|contact sales/i, /for (teams|businesses|companies|organizations)/i,
    /scale your business|business owners|business education/i, /workshop|training/i, /portfolio|businesses advised/i,
    /\bconsulting\b/i, /\bagency\b/i, /\bclients\b/i, /\bworkflow\b/i, /\bcompliance\b/i,
  ].filter((re) => re.test(textLower)).length;

  const b2cHits = [
    /add to (cart|bag)/i, /free shipping/i, /\bcheckout\b/i, /shop (now|all)/i,
    /my account/i, /\bsale\b.{0,12}\boff\b/i, /gift card/i, /\bmenu\b.{0,20}\border\b/i,
    /subscribe (and|&) save/i, /product reviews/i, /\bsizes?\b.{0,20}\bcolors?\b/i,
  ].filter((re) => re.test(textLower)).length;

  let audience: ScoreResult["audience"] = "Unclear";
  let audienceNote = "";
  if (b2bHits >= 3 && b2cHits >= 3) {
    audience = "Mixed";
    audienceNote = "Signals point to both business and consumer buyers.";
  } else if (b2bHits >= 3 && b2bHits > b2cHits) {
    audience = "B2B";
    audienceNote = "Language, CTAs, and proof points are aimed at business buyers.";
  } else if (b2cHits >= 3 && b2cHits > b2bHits) {
    audience = "B2C";
    audienceNote = "Commerce and consumer-facing language dominates the site.";
  } else if (b2bHits >= 1) {
    audience = "B2B";
    audienceNote = "Leans business-to-business, though positioning language is thin.";
  } else {
    audienceNote = "Not enough positioning language on the site to classify the buyer confidently.";
  }

  const ctaSignals = /contact us|get started|book a call|take this course|attend a workshop|schedule a call|request a quote|talk to us|free trial|sign up|get a demo|apply now/i.test(textLower);
  const offerNav = /\b(services|solutions|products?|what we do|pricing|plans|how it works|courses?|training|workshops?)\b/i.test(textLower);
  let sellingRealOffer: ScoreResult["sellingRealOffer"] = "Unclear";
  let sellingNote = "";
  if ((ctaSignals && offerNav) || pricingUrl) {
    sellingRealOffer = "Yes";
    sellingNote = pricingUrl
      ? "Clear offer with a published pricing or plans page and active conversion paths."
      : "Clear offer with defined services/products and active conversion CTAs.";
  } else if (ctaSignals || offerNav) {
    sellingRealOffer = "Likely";
    sellingNote = "An offer is implied, but the commercial path is underdeveloped.";
  } else {
    sellingNote = "No clear offer, pricing, or conversion path visible on the homepage.";
  }

  /* ================================================================
     Score assembly
     ================================================================ */
  const mk = (
    key: string,
    label: string,
    earned: number,
    max: number,
    summary: string,
    evidence: string[]
  ): Pillar => {
    const tier = tierOf(earned, max);
    return {
      key,
      label,
      earned: Math.round(earned * 100) / 100,
      max,
      status: earned === 0 ? "unverified" : tier,
      summary: earned === 0 ? "Not verified in the pages available to this scan; this is not evidence that the channel is absent." : summary,
      consequence: earned === 0 ? "No points are confirmed for this signal yet. Additional public evidence may change the result." : "Points reflect the evidence found in this scan, not a comparison of content quality or business performance.",
      evidence,
    };
  };

  const pillars: Pillar[] = [
    mk("social", "Social Presence", socialPts, 1.25, socialSummary, socialEv),
    mk("socialEff", "Social Effectiveness", socialEffPts, 1.25, socialEffSummary, socialEffEv),
    mk("content", "Content & SEO Footprint", contentPts, 3.0, contentSummary, contentEv),
    mk("podcast", "Podcast", podPts, 1.5, podSummary, podEv),
    mk("video", "Video", vidPts, 1.5, vidSummary, vidEv),
    mk("external", "Third-Party Validation", extPts, 1.5, extSummary, extEv),
  ];

  const raw = pillars.reduce((s, p) => s + p.earned, 0);
  const score = Math.max(0, Math.min(10, Math.round(raw)));

  const bands: Record<string, { band: string; label: string; headline: string }> = {
    invisible: { band: "0", label: "Invisible", headline: "No authority points verified in this scan." },
    minimal: { band: "1\u20132", label: "Minimal", headline: "Limited authority evidence verified in this scan." },
    emerging: { band: "3\u20134", label: "Emerging", headline: "Some authority signals verified; evidence remains incomplete." },
    moderate: { band: "5\u20137", label: "Established", headline: "A substantial set of public authority signals was found." },
    dominant: { band: "8\u201310", label: "Dominant", headline: "Broad public authority evidence across the assessed signals." },
  };
  const bandKey =
    score === 0 ? "invisible" : score <= 2 ? "minimal" : score <= 4 ? "emerging" : score <= 7 ? "moderate" : "dominant";
  const b = bands[bandKey];

  const sorted = [...pillars].sort((a, c) => a.earned / a.max - c.earned / c.max);
  const weakest = sorted[0];
  const recommended = score >= 2 && score <= 7 && audience !== "B2C";

  const presenceNotes: string[] = [];
  presenceNotes.push(
    socialFound.length ? `Social: ${socialFound.join(", ")}.` : "Social: no profiles linked from the site."
  );
  presenceNotes.push(
    blogUrl || contentUrlCount > 0
      ? `Content: ${contentUrlCount > 0 ? `${contentUrlCount} article-style URLs` : "content hub present"}${
          daysSinceUpdate !== null ? `, last updated ~${daysSinceUpdate} days ago` : ""
        }.`
      : "Content: no blog or resource hub found."
  );
  presenceNotes.push(podcastUrl || podPlatform ? "Podcast: show or distribution link found; see cadence evidence." : "Podcast: not verified.");
  presenceNotes.push(ytChannel || embeds > 0 ? "Video: in use." : "Video: none detected.");
  presenceNotes.push(
    reviewSites.length ? `Review platforms: ${reviewSites.join(", ")}.` : "Review platforms: not verified."
  );

  /* --- the three summary boxes ------------------------------------ */
  const offerAnswer =
    sellingRealOffer === "Yes" ? "Yes" : sellingRealOffer === "Likely" ? "Mostly" : "Not clearly";

  // Never a flat "Yes" — positioning is almost always partially legible at best.
  const audienceAnswer =
    audience === "Unclear"
      ? "Not clearly"
      : audience === "Mixed"
      ? "Somewhat"
      : b2bHits + b2cHits >= 8
      ? `Yes, ${audience}`
      : b2bHits + b2cHits >= 4
      ? `Mostly, ${audience}`
      : `Somewhat, ${audience}`;

  const supported = pillars.filter(p => p.status !== "unverified").length;
  const evidenceCoverage = Math.round(supported / pillars.length * 100);
  const hasMissingMetrics = !discovery.social.length || discovery.social.some(p => !p.metrics.length);
  const provisional = supported < 6 || hasMissingMetrics || discovery.social.some(p => p.supplied && !p.linkedFromWebsite) || discovery.sources.some(p => p.status === "unavailable") || !!(podcastEvidence && (!podcastEvidence.verified || !podcastEvidence.linkedFromWebsite)) || !!(founderEvidence && (!founderEvidence.companyMentionsName || founderEvidence.status !== "sources-found"));
  const confidence: ScoreResult["confidence"] = supported < 4 ? "Limited" : provisional ? "Moderate" : "High";
  const confidenceNote = "Read " + pagesScanned + " website pages. Evidence supports " + supported + " of 6 signals. Profile metrics may be unavailable; missing evidence is not proof of absence. The score is not a measured market ranking.";
  const standing = provisional ? "Provisional" : "Evidence supported";
  const standingNote = confidenceNote;

  return {
    companyName,
    url: base,
    domain,
    audience,
    audienceNote,
    audienceAnswer,
    sellingRealOffer,
    sellingNote,
    offerAnswer,
    standing,
    standingNote,
    score,
    band: b.band,
    bandLabel: b.label,
    headline: b.headline,
    rationale: `This scan verified ${score} out of 10 available points across ${supported} of 6 signals. ${confidenceNote}`,
    presenceNotes,
    recommended,
    recommendation: provisional ? "Review the evidence and add any missing competitor profile links before drawing conclusions. Unverified channels may contain substantial activity outside this scan." : "Review the confirmed signals and their sources to inform a competitive assessment. Reach alone does not establish content quality.",
    pillars,
    biggestGap: `${weakest.label} has the least confirmed evidence relative to its weight. This may be a discovery gap rather than a weakness in the business.`,
    confidence,
    confidenceNote,
    pagesScanned,
    provisional,
    evidenceCoverage,
    sources: discovery.sources,
    socialMetrics: discovery.social,
    podcastEvidence,
    founderEvidence,
  };
}


