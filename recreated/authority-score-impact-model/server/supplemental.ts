import { readableText, pageLinks } from "./discovery";
type Grab = (url: string, timeout: number) => Promise<{ok:boolean;body:string;status:number;finalUrl:string}>;
export type SupplementalInput = { podcastUrl?: string; founderName?: string };
export type PodcastEvidence = { url:string; readable:boolean; verified:boolean; linkedFromWebsite:boolean; episodes:number; latestEpisode:string|null; note:string };
export type FounderEvidence = { name:string; searchUrl:string; status:"sources-found"|"no-confirmed-match"|"search-unavailable"; companyMentionsName:boolean; sources:{url:string; matched:boolean; readable:boolean}[]; note:string };
const decode = (s:string) => s.replace(/&amp;/g,"&").replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&#x27;/gi,"'");
const normalized = (s:string) => s.normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{N}]+/gu," ").trim();
export function matchesFounder(text:string, name:string, company:string, domain:string) {
  const t = " " + normalized(text) + " ", n = normalized(name), c = normalized(company), d = normalized(domain);
  const i = t.indexOf(" " + n + " ");
  if (!n || i < 0) return false;
  const context = t.slice(Math.max(0,i-600), i+n.length+600);
  return context.includes(d) || (c.length >= 4 && context.includes(c));
}
export function searchLinks(html:string): string[] {
  const result:string[]=[];
  for(const a of html.matchAll(/<a\b[^>]*>[\s\S]*?<\/a>/gi)) {
    if (!/class=["'][^"']*result__a/.test(a[0])) continue;
    const href=a[0].match(/href=["']([^"']+)["']/i)?.[1]; if (!href) continue;
    try {
      let u=new URL(decode(href),"https://html.duckduckgo.com");
      if (u.hostname.endsWith("duckduckgo.com")) { const target=u.searchParams.get("uddg"); if(!target) continue; u=new URL(target); }
      if (/^https?:$/.test(u.protocol) && !u.username && !u.password) result.push(u.href);
    } catch { /* unusable search link */ }
  }
  return [...new Set(result)].slice(0,4);
}
export async function checkPodcast(url:string, ownedPages:{url:string;html:string}[], grab:Grab):Promise<PodcastEvidence> {
  const linkedFromWebsite = ownedPages.some(p=>pageLinks(p.html,p.url).some(u=>u.replace(/\/$/,"")===url.replace(/\/$/,"")));
  const r=await grab(url,7000);
  const body=r.ok?r.body:"";
  const feed=/<(?:rss|feed)\b/i.test(body) && /itunes:|podcast:|<enclosure[^>]+(?:audio|\.mp3|\.m4a)/i.test(body);
  const distribution = pageLinks(body,r.finalUrl).some(link => {
    const u=new URL(link);
    return (u.hostname === "open.spotify.com" && /^\/show\//.test(u.pathname)) || (u.hostname === "podcasts.apple.com" && /\/id\d+/.test(u.pathname));
  });
  const headingText = readableText([...body.matchAll(/<(?:title|h1|h2)\b[^>]*>([\s\S]*?)<\/(?:title|h1|h2)>/gi)].map(m=>m[1]).join(" "));
  const verified = feed || distribution || /"@type"\s*:\s*"PodcastSeries"/i.test(body) || (/\bpodcast\b/i.test(headingText) && /episode|listen|subscribe/i.test(readableText(body)));
  let items = feed ? [...body.matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/gi)].map(m=>m[1]) : [];
  let latestEpisode:string|null=null;
  // Follow one explicitly linked feed. A generic blog RSS feed does not establish podcast cadence.
  if(!feed && verified) {
    const feedUrl = pageLinks(body,r.finalUrl).find(u=>/\/feed\/?$|\.rss$|rss\.xml|feeds\./i.test(u));
    if(feedUrl) { const f=await grab(feedUrl,5000); if(f.ok && /itunes:|podcast:|<enclosure[^>]+(?:audio|\.mp3|\.m4a)/i.test(f.body)) items=[...f.body.matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/gi)].map(m=>m[1]); }
  }
  const stamps=items.flatMap(item=>[...item.matchAll(/<(?:pubDate|published)>\s*([^<]+)</gi)].map(m=>Date.parse(m[1]))).filter(n=>Number.isFinite(n)&&n<=Date.now());
  if(stamps.length) latestEpisode=new Date(Math.max(...stamps)).toISOString();
  return {url,readable:r.ok,verified,linkedFromWebsite,episodes:items.length,latestEpisode,
    note:verified?"Podcast evidence found at the supplied URL. Brand association is only corroborated when the company site links to it.":"Podcast evidence could not be verified from this public response; the link does not prove the show is absent."};
}
export async function searchFounder(name:string,company:string,domain:string,pages:{url:string;html:string}[],grab:Grab):Promise<FounderEvidence> {
  const query=`"${name}" "${domain}"`;
  const searchUrl=`https://duckduckgo.com/?q=${encodeURIComponent(query)}`;
  const r=await grab(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`,7000);
  const companyMentionsName=pages.some(p=>(" " + normalized(readableText(p.html)) + " ").includes(" " + normalized(name) + " "));
  if(!r.ok || /challenge-form|anomaly-modal|captcha/i.test(r.body)) return {name,searchUrl,status:"search-unavailable",companyMentionsName,sources:[],note:"Public search was unavailable or challenged. No search results were used. You can open the search manually."};
  const candidates=searchLinks(r.body);
  const sources=await Promise.all(candidates.map(async url=>{
    const page=await grab(url,6000);
    return {url,readable:page.ok,matched:page.ok&&matchesFounder(readableText(page.body),name,company,domain)};
  }));
  return {name,searchUrl,status:sources.some(s=>s.matched)?"sources-found":"no-confirmed-match",companyMentionsName,sources,
    note:"Targeted public-web search, limited to four pages. A match means the name and company appear together; it does not independently prove identity or founder status. Search snippets alone do not earn points."};
}
