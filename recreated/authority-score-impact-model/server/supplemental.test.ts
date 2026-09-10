import test from "node:test";
import assert from "node:assert/strict";
import {matchesFounder,searchFounder,searchLinks,checkPodcast} from "./supplemental";
const page=(body:string,url="https://example.com",ok=true)=>({ok,body,status:ok?200:403,finalUrl:url});
test("founder matches need a full name and nearby company reference",()=>{
  assert.ok(matchesFounder("Alex Smith co-founded Example Labs.","Alex Smith","Example Labs","example.com"));
  assert.equal(matchesFounder("Alex Smith works elsewhere.","Alex Smith","Example Labs","example.com"),false);
  assert.equal(matchesFounder("Alexander Smith founded Example Labs.","Alex Smith","Example Labs","example.com"),false);
});
test("only search-result links are read, with redirect wrappers decoded",()=>{
  assert.deepEqual(searchLinks('<a href="https://ads.test">Advertisement</a><a class="result__a" href="//duckduckgo.com/l/?uddg=https%3A%2F%2Fnews.test%2Fperson">Person</a>'),["https://news.test/person"]);
});
test("search challenges are reported without following result links",async()=>{
  let calls=0;
  const r=await searchFounder("Alex Smith","Example Labs","example.com",[],async()=>{calls++;return page('<form id="challenge-form">');});
  assert.equal(r.status,"search-unavailable"); assert.equal(calls,1); assert.equal(r.sources.length,0);
});
test("search snippets alone never confirm a source",async()=>{
  const r=await searchFounder("Alex Smith","Example Labs","example.com",[{url:"https://example.com",html:"<p>Alex Smith</p>"}],async url=>url.includes("duckduckgo")?page('<a class="result__a" href="https://news.test/person">Alex Smith Example Labs</a>'):page("Other person entirely."));
  assert.equal(r.status,"no-confirmed-match"); assert.equal(r.companyMentionsName,true);
});
test("podcast RSS uses episode dates rather than copyright or feed build dates",async()=>{
  const xml='<rss xmlns:itunes="x"><channel><lastBuildDate>2099-01-01</lastBuildDate><item><enclosure type="audio/mpeg"/><pubDate>2025-01-02</pubDate></item></channel></rss>';
  const r=await checkPodcast("https://pod.test/rss",[],async()=>page(xml));
  assert.equal(r.verified,true); assert.equal(r.episodes,1); assert.equal(r.latestEpisode,"2025-01-02T00:00:00.000Z"); assert.equal(r.linkedFromWebsite,false);
});
test("generic feeds and inaccessible supplied podcasts earn no confirmation",async()=>{
  const r=await checkPodcast("https://pod.test/rss",[],async()=>page('<rss><channel><item><title>News</title></item></channel></rss>'));
  assert.equal(r.verified,false); assert.equal(r.episodes,0);
  const blocked=await checkPodcast("https://pod.test/rss",[],async()=>page("","https://pod.test/rss",false));
  assert.equal(blocked.readable,false); assert.equal(blocked.verified,false);
});
test("show distribution links count as podcast evidence, unrelated footer words do not",async()=>{
  const show=await checkPodcast("https://example.com/show",[],async()=>page('<a href="https://open.spotify.com/show/abc123">Listen</a>'));
  assert.equal(show.verified,true);
  const unrelated=await checkPodcast("https://example.com/",[],async()=>page('<h1>Products</h1><footer>Podcast · Subscribe to our newsletter</footer>'));
  assert.equal(unrelated.verified,false);
});
