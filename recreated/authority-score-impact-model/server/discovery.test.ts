import test from "node:test";
import assert from "node:assert/strict";
import { discover, extractMetrics, pageLinks, parseCount } from "./discovery";
import { normalizeSocialLink } from "../shared/social-input";

test("profile validation rejects lookalike hosts, credentials, ports and post links", () => {
  for (const raw of ["https://instagram.com.evil.test/brand", "https://instagram.com@evil.test/brand", "https://instagram.com:8080/brand", "https://instagram.com/p/abc", "https://instagram.com/"])
    assert.equal(normalizeSocialLink("instagram", raw), null);
  assert.equal(normalizeSocialLink("youtube", "youtube.com/@brand?feature=shared"), "https://www.youtube.com/@brand");
  assert.equal(normalizeSocialLink("tiktok", "tiktok.com/@brand"), "https://www.tiktok.com/@brand");
  assert.equal(normalizeSocialLink("instagram", "instagram.com/embed.js"), null);
  assert.equal(normalizeSocialLink("youtube", "youtube.com/brand"), "https://www.youtube.com/brand");
  assert.equal(normalizeSocialLink("youtube", "youtube.com/watch?v=abc"), null);
});

test("counts distinguish unknown from zero, and keep approximate units", () => {
  assert.equal(parseCount("1.2M"), 1200000);
  assert.equal(parseCount("1,234"), 1234);
  assert.equal(parseCount("0"), 0);
  assert.equal(parseCount("unknown"), null);
  const result = extractMetrics("youtube", '<script>{"pageHeaderRenderer":{"metadata":{"text":"2.1M subscribers · 352 videos"}},"videoRenderer":{"viewCountText":"999999 views"}}</script>');
  assert.deepEqual(result.map(m => [m.name,m.value]), [["subscribers",2100000],["videos",352]]);
  assert.equal(result[0].approximate, true);
  assert.equal(result.some(m => m.name === "views"), false);
});

test("only target TikTok user counts, not recommendations or likes, are accepted", () => {
  const html = '<script>{"userInfo":{"user":{"uniqueId":"brand"},"stats":{"followerCount":3000,"videoCount":28,"heartCount":2000000}}}</script>';
  assert.equal(extractMetrics("tiktok", html, "https://www.tiktok.com/@other").length, 0);
  assert.deepEqual(extractMetrics("tiktok", html, "https://www.tiktok.com/@brand").map(m=>m.name), ["followers","videos"]);
  assert.deepEqual(extractMetrics("instagram", '<html>Sign in to continue</html>'), []);
});

test("structured profile links are discovered without harvesting arbitrary scripts", () => {
  const html = '<script type="application/ld+json">{"@type":"Person","sameAs":["https://instagram.com/founder"]}</script><script>const ad="https://instagram.com/unrelated"</script>';
  assert.deepEqual(pageLinks(html,"https://example.com"), ["https://instagram.com/founder"]);
});

test("crawl discovers educational and leadership pages with a strict request budget", async () => {
  const calls: string[] = [];
  const html = '<h1>Training library</h1>' + '<p>Detailed educational content for business owners.</p>'.repeat(8);
  const initial = [{ url: "https://example.com/", html: '<a href="/training">Training</a><a href="https://example.com.evil.test/about">Fake</a>' }];
  const result = await discover("https://example.com/", initial, Array.from({length:60},(_,i)=>`https://example.com/course/${i}`), {}, async url => {
    calls.push(url); return {ok:true, body:html,status:200,finalUrl:url};
  });
  assert.equal(calls.length,16);
  assert.ok(calls.includes("https://example.com/training"));
  assert.ok(calls.every(u=>new URL(u).hostname === "example.com"));
  assert.equal(result.pages.length,17);
});

test("supplied social links remain distinguishable when public metrics are blocked", async () => {
  const result = await discover("https://example.com/", [{url:"https://example.com/",html:"<p>Home</p>"}], [], { instagram: "https://www.instagram.com/brand" }, async url => ({ok:false,body:"",status:403,finalUrl:url}));
  assert.equal(result.social[0].linkedFromWebsite,false);
  assert.equal(result.social[0].supplied,true);
  assert.equal(result.social[0].status,"metrics-unavailable");
  assert.deepEqual(result.social[0].metrics,[]);
});
