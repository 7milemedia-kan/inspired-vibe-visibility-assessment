import { normalizeSocialLink, SOCIAL_PLATFORMS, type SocialLinks, type SocialPlatform } from "../shared/social-input";

type Page = { ok: boolean; body: string; status: number; finalUrl: string };
type FetchPage = (url: string, timeout: number) => Promise<Page>;
export type Source = { url: string; status: "read" | "unavailable"; kind: string };
export type Metric = { name: "followers" | "subscribers" | "videos" | "views"; value: number; approximate: boolean };
export type SocialEvidence = {
  platform: SocialPlatform; url: string; supplied: boolean; linkedFromWebsite: boolean;
  status: "public-metrics" | "metrics-unavailable"; metrics: Metric[]; note: string;
};
export function readableText(html: string) {
  return html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ").replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ").replace(/&(?:nbsp|amp);/g, " ").replace(/\s+/g, " ").trim();
}
export function pageLinks(html: string, base: string): string[] {
  // HTML links plus explicitly structured sameAs/url fields, not arbitrary script strings.
  const raw = [...html.matchAll(/\b(?:href|src)\s*=\s*["']([^"']+)["']/gi)].map(m => m[1]);
  for (const block of html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const visit = (v: unknown, depth = 0) => {
        if (!v || typeof v !== "object" || depth > 15) return;
        for (const [k, val] of Object.entries(v)) {
          if (["sameAs", "url", "contentUrl", "embedUrl"].includes(k)) {
            for (const u of Array.isArray(val) ? val : [val]) if (typeof u === "string") raw.push(u);
          }
          visit(val, depth + 1);
        }
      };
      visit(JSON.parse(block[1]));
    } catch { /* malformed structured data is not evidence */ }
  }
  return [...new Set(raw.flatMap(h => {
    try { const u = new URL(h.replace(/&amp;/g, "&"), base); if (!/^https?:$/.test(u.protocol) || u.username || u.password) return []; u.hash = ""; return [u.href]; }
    catch { return []; }
  }))];
}
export function parseCount(raw: string): number | null {
  const match = raw.trim().match(/^(\d[\d,]*(?:\.\d+)?)\s*([kmb])?$/i);
  if (!match) return null;
  const n = Number(match[1].replaceAll(",", "")) * ({ k: 1e3, m: 1e6, b: 1e9 }[match[2]?.toLowerCase() ?? ""] ?? 1);
  return Number.isSafeInteger(Math.round(n)) && n >= 0 ? Math.round(n) : null;
}
/** Read only profile-scoped objects, never recommended-video counters or page-wide numbers. */
export function extractMetrics(platform: SocialPlatform, html: string, profileUrl?: string): Metric[] {
  const metrics: Metric[] = [];
  const add = (name: Metric["name"], raw: string) => {
    const value = parseCount(raw);
    if (value !== null && !metrics.some(m => m.name === name)) metrics.push({ name, value, approximate: /[kmb]/i.test(raw) });
  };
  const jsonObject = (key: string): Record<string, any> | null => {
    const marker = new RegExp('"' + key + '"\\s*:\\s*\\{').exec(html);
    if (!marker) return null;
    const from = marker.index + marker[0].length - 1;
    let depth = 0, quoted = false, escaped = false;
    for (let i = from; i < Math.min(html.length, from + 120_000); i++) {
      const c = html[i];
      if (quoted) { if (escaped) escaped = false; else if (c === "\\") escaped = true; else if (c === '"') quoted = false; }
      else if (c === '"') quoted = true;
      else if (c === "{") depth++;
      else if (c === "}" && --depth === 0) { try { return JSON.parse(html.slice(from, i + 1)); } catch { return null; } }
    }
    return null;
  };
  if (platform === "tiktok") {
    const info = jsonObject("userInfo");
    if (info?.user?.uniqueId && info?.stats && (!profileUrl || new URL(profileUrl).pathname.toLowerCase() === `/@${String(info.user.uniqueId).toLowerCase()}`)) {
      for (const [key, name] of [["followerCount", "followers"], ["videoCount", "videos"]] as const)
        if (typeof info.stats[key] === "number") add(name, String(info.stats[key]));
    }
  } else if (platform === "instagram") {
    const user = jsonObject("user");
    if (user?.username && (!profileUrl || new URL(profileUrl).pathname.toLowerCase() === `/${String(user.username).toLowerCase()}`)) {
      if (typeof user.edge_followed_by?.count === "number") add("followers", String(user.edge_followed_by.count));
      // Instagram media_count counts images too; do not mislabel it as video count.
    }
    // Public profile description has a clear follower label, unlike arbitrary embedded JSON.
    const tags = [...html.matchAll(/<meta\b[^>]+>/gi)].map(m => m[0]);
    const desc = tags.filter(t => /(?:name|property)=["'](?:description|og:description)["']/i.test(t))
      .map(t => t.match(/content=["']([^"']*)["']/i)?.[1] ?? "").join(" ");
    const followers = desc.match(/([\d,.]+\s*[kmb]?)\s+followers/i);
    if (followers) add("followers", followers[1]);
  } else {
    for (const key of ["c4TabbedHeaderRenderer", "pageHeaderRenderer", "aboutChannelViewModel", "channelAboutFullMetadataRenderer"]) {
      const object = jsonObject(key); if (!object) continue;
      const serialized = JSON.stringify(object);
      for (const [name, label] of [["subscribers", "subscribers"], ["videos", "videos"], ["views", "views"]] as const) {
        const match = serialized.match(new RegExp(`([\\d,.]+\\s*[KMB]?)\\s+${label}\\b`, "i"));
        if (match) add(name, match[1]);
      }
    }
  }
  return metrics;
}

const RELEVANT = /leadership|founder|team|about|firm|bio|training|course|learn|book|guide|resource|research|insight|blog|article|podcast|episode|show|video|media|press|recognition|award|case-stud|testimonial|workshop/i;
export async function discover(base: string, initial: { url: string; html: string }[], sitemap: string[], supplied: SocialLinks, grab: FetchPage) {
  const host = new URL(base).hostname.replace(/^www\./, "");
  const sameSite = (url: string) => new URL(url).hostname.replace(/^www\./, "") === host;
  const seen = new Set(initial.map(p => p.url.replace(/\/$/, "")));
  const pages = [...initial];
  const sources: Source[] = initial.map(p => ({ url: p.url, status: "read", kind: "website" }));
  const queue: string[] = [];
  const offer = (url: string) => {
    const u = new URL(url);
    if (sameSite(url) && RELEVANT.test(u.pathname) && !u.search && !/thank|(?:^|[-/])ty(?:[-/]|$)|submission|intake|contest|request|\/tag\//i.test(u.pathname) && !/\.(?:pdf|jpg|png|svg|mp4|zip|woff2?)$/i.test(u.pathname) && !seen.has(url.replace(/\/$/, "")) && !queue.some(q => q.replace(/\/$/, "") === url.replace(/\/$/, ""))) queue.push(url);
  };
  for (const p of initial) pageLinks(p.html, p.url).forEach(offer);
  sitemap.slice(0, 2500).forEach(offer);
  // Prefer section roots and leadership over a long run of individual articles.
  const priority = (url: string) => {
    const p = new URL(url).pathname.replace(/\/$/, "");
    if (/^\/(leadership|founders?|about|team|firm|media|press|recognition|research|training|courses?|podcasts?|videos?|blog|books?|resources?)$/i.test(p)) return 0;
    if (/podcast|episode/i.test(p)) return 1;
    return p.split('/').filter(Boolean).length + 1;
  };
  const deadline = Date.now() + 24_000;
  let requests = 0;
  while (queue.length && requests < 16 && Date.now() < deadline) {
    queue.sort((a,b) => priority(a) - priority(b));
    const batch = queue.splice(0, Math.min(4, 16 - requests));
    requests += batch.length;
    await Promise.all(batch.map(async url => {
      seen.add(url.replace(/\/$/, ""));
      const r = await grab(url, Math.min(5500, Math.max(1, deadline - Date.now())));
      const ok = r.ok && sameSite(r.finalUrl) && readableText(r.body).length >= 100;
      sources.push({ url, status: ok ? "read" : "unavailable", kind: "website" });
      if (ok) { pages.push({ url: r.finalUrl, html: r.body }); pageLinks(r.body, r.finalUrl).forEach(offer); }
    }));
  }
  const profiles = new Map<string, { platform: SocialPlatform; linked: boolean; supplied: boolean }>();
  for (const p of pages) for (const url of pageLinks(p.html, p.url)) for (const platform of SOCIAL_PLATFORMS) {
    const normalized = normalizeSocialLink(platform, url);
    if (normalized && profiles.size < 12) profiles.set(normalized, { platform, linked: true, supplied: false });
  }
  for (const platform of SOCIAL_PLATFORMS) if (supplied[platform]) {
    const url = supplied[platform]!;
    profiles.set(url, { platform, linked: profiles.has(url), supplied: true });
  }
  const candidates = [...profiles.entries()].sort((a,b) => Number(b[1].supplied) - Number(a[1].supplied));
  const social: SocialEvidence[] = [];
  for (let i = 0; i < candidates.length; i += 4) {
    await Promise.all(candidates.slice(i, i + 4).map(async ([url, info]) => {
      const r = await grab(url, 6000);
      const finalProfile = normalizeSocialLink(info.platform, r.finalUrl);
      const metrics = r.ok && finalProfile ? extractMetrics(info.platform, r.body, finalProfile) : [];
      social.push({ platform: info.platform, url, supplied: info.supplied, linkedFromWebsite: info.linked,
        status: metrics.length ? "public-metrics" : "metrics-unavailable", metrics,
        note: metrics.length ? "Counts exposed on the public profile at scan time; not an authenticated analytics report."
          : "Profile counts were not extractable from the public response. They are unknown, not zero." });
    }));
  }
  return { pages, sources, social: social.sort((a,b) => a.url.localeCompare(b.url)) };
}
