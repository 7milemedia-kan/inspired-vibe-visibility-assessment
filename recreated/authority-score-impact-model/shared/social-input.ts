export const SOCIAL_PLATFORMS = ["instagram", "youtube", "tiktok"] as const;
export type SocialPlatform = typeof SOCIAL_PLATFORMS[number];
export type SocialLinks = Partial<Record<SocialPlatform, string>>;

/** Accept profile URLs only, never platform homepages, arbitrary hosts or post links. */
export function normalizeSocialLink(platform: SocialPlatform, raw: string): string | null {
  if (!raw.trim() || raw.length > 500) return null;
  try {
    const u = new URL(/^https?:\/\//i.test(raw.trim()) ? raw.trim() : `https://${raw.trim()}`);
    if (!/^https?:$/.test(u.protocol) || u.username || u.password || u.port) return null;
    const host = u.hostname.replace(/^www\./, "").toLowerCase();
    const p = u.pathname.replace(/\/+$/, "");
    const valid = platform === "instagram"
      ? host === "instagram.com" && /^\/[\w.]{1,30}$/.test(p) && !/^\/(p|reel|reels|stories|explore|accounts|direct|embed\.js)$/i.test(p)
      : platform === "tiktok"
        ? host === "tiktok.com" && /^\/@[\w.]{2,30}$/.test(p)
        : host === "youtube.com" && (/^\/@[\w.%\-]{2,100}$/.test(p) || /^\/(channel|c|user)\/[\w-]{2,100}$/.test(p) || (/^\/[\w-]{3,100}$/.test(p) && !/^\/(watch|embed|shorts|playlist|feed|results|redirect|signin|logout|account|premium|gaming|music|hashtag|channel)$/i.test(p)));
    return valid ? `https://www.${host}${p}` : null;
  } catch { return null; }
}
