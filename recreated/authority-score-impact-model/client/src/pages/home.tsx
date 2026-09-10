import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Capture, CaptureDone } from "@/components/capture";
import { saveHandoff, clearHandoff } from "@/lib/handoff";
import { Input } from "@/components/ui/input";
import { SOCIAL_PLATFORMS, type SocialLinks } from "@shared/social-input";
import type { SocialEvidence, Source } from "../../../server/discovery";
import type { PodcastEvidence, FounderEvidence } from "../../../server/supplemental";
import {
  ArrowRight,
  Radio,
  Video,
  FileText,
  Share2,
  Globe2,
  Check,
  Minus,
  X,
  AlertTriangle,
  RotateCcw,
  Activity,
  Download,
  CalendarCheck,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/* outbound destinations                                               */
/* ------------------------------------------------------------------ */

/** Where "book a conversation" sends people. */
/** Renders a pillar max without rounding fractional weights (1.25 must not become 1.3). */
const fmtMax = (n: number) => (Number.isInteger(n) ? n.toFixed(1) : String(n));

const BOOKING_URL = "https://inspiredvibe.com/contact-us/";
/** Where the downloadable Authority Playbook lives. */
const PLAYBOOK_URL = "https://inspiredvibe.com/tllp/";

/* ------------------------------------------------------------------ */
/* types                                                               */
/* ------------------------------------------------------------------ */

type Pillar = {
  key: string;
  label: string;
  earned: number;
  max: number;
  status: "strong" | "moderate" | "weak" | "absent" | "unverified";
  summary: string;
  consequence: string;
  evidence: string[];
};

type ScoreResult = {
  companyName: string;
  url: string;
  domain: string;
  audience: string;
  audienceNote: string;
  audienceAnswer: string;
  sellingRealOffer: string;
  sellingNote: string;
  offerAnswer: string;
  standing: string;
  standingNote: string;
  scanId: number | null;
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
  confidence: string;
  confidenceNote: string;
  pagesScanned: number;
  provisional: boolean;
  evidenceCoverage: number;
  socialMetrics: SocialEvidence[];
  sources: Source[];
  podcastEvidence: PodcastEvidence | null;
  founderEvidence: FounderEvidence | null;
};

/* ------------------------------------------------------------------ */
/* brand mark                                                          */
/* ------------------------------------------------------------------ */

function Mark({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      className={className}
      aria-label="Authority Score"
      role="img"
    >
      <circle cx="16" cy="16" r="13" stroke="currentColor" strokeWidth="1.5" opacity="0.35" />
      <path
        d="M16 3a13 13 0 0 1 11.3 6.6"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <path d="M9 20.5 13.5 14l4 4L23 10" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="23" cy="10" r="2.4" fill="currentColor" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* score dial                                                          */
/* ------------------------------------------------------------------ */

const ARC = "M 69.3 224.3 A 110 110 0 1 1 210.7 224.3";

function toneFor(score: number) {
  if (score <= 2) return { stroke: "hsl(6 72% 55%)", text: "text-[hsl(358_62%_46%)]" };
  if (score <= 4) return { stroke: "hsl(30 85% 55%)", text: "text-[hsl(30_85%_32%)]" };
  if (score <= 7) return { stroke: "hsl(187 75% 48%)", text: "text-[hsl(187_75%_28%)]" };
  return { stroke: "hsl(160 65% 48%)", text: "text-[hsl(160_65%_28%)]" };
}

function Dial({ score }: { score: number }) {
  const [shown, setShown] = useState(0);
  const tone = toneFor(score);

  useEffect(() => {
    let frame = 0;
    const dur = 1100;
    const t0 = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      setShown(score * eased);
      if (p < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [score]);

  const pct = (shown / 10) * 100;

  return (
    <div className="relative mx-auto w-[240px] sm:w-[280px]" data-testid="dial-score">
      <svg viewBox="0 0 280 280" className="w-full overflow-visible">
        <path d={ARC} fill="none" stroke="hsl(var(--border))" strokeWidth="14" strokeLinecap="round" />
        <path
          d={ARC}
          fill="none"
          stroke={tone.stroke}
          strokeWidth="14"
          strokeLinecap="round"
          pathLength={100}
          strokeDasharray={`${pct} 100`}
          style={{ filter: `drop-shadow(0 0 14px ${tone.stroke}55)` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center pt-2">
        <div
          className={`font-serif font-bold leading-none tabular-nums ${tone.text}`}
          style={{ fontSize: "clamp(5rem, 18vw, 7.5rem)" }}
          data-testid="text-score-value"
        >
          {Math.round(shown)}
        </div>
        <div className="mt-1 text-[0.7rem] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
          out of 10
        </div>
      </div>
      <div className="absolute inset-x-0 bottom-[0.5rem] flex justify-center gap-[7.5rem] text-[0.7rem] font-medium tabular-nums text-muted-foreground sm:gap-[9rem]">
        <span>0</span>
        <span>10</span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* pillars                                                             */
/* ------------------------------------------------------------------ */

const PILLAR_ICON: Record<string, typeof Radio> = {
  social: Share2,
  socialEff: Activity,
  content: FileText,
  podcast: Radio,
  video: Video,
  external: Globe2,
};

const STATUS_META: Record<Pillar["status"], { label: string; cls: string; Icon: typeof Check }> = {
  unverified: { label: "Not verified", cls: "text-muted-foreground", Icon: Minus },
  strong: { label: "Strong", cls: "text-[hsl(160_65%_28%)]", Icon: Check },
  moderate: { label: "Moderate", cls: "text-[hsl(187_75%_28%)]", Icon: Check },
  weak: { label: "Weak", cls: "text-[hsl(30_85%_32%)]", Icon: Minus },
  absent: { label: "Absent", cls: "text-[hsl(358_62%_46%)]", Icon: X },
};

function PillarRow({ p, index }: { p: Pillar; index: number }) {
  const Icon = PILLAR_ICON[p.key] ?? FileText;
  const meta = STATUS_META[p.status];
  const pct = Math.round((p.earned / p.max) * 100);
  const [w, setW] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setW(pct), 220 + index * 110);
    return () => clearTimeout(t);
  }, [pct, index]);

  return (
    <div className="border-t border-border py-5 first:border-t-0" data-testid={`pillar-${p.key}`}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <Icon className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={1.75} />
        <span className="text-sm font-semibold">{p.label}</span>
        <span className={`flex items-center gap-1 text-xs font-semibold uppercase tracking-wider ${meta.cls}`}>
          <meta.Icon className="h-3.5 w-3.5" strokeWidth={2.5} />
          {meta.label}
        </span>
        <span className="ml-auto font-mono text-xs text-muted-foreground tabular-nums">
          {p.earned.toFixed(2)} / {fmtMax(p.max)}
        </span>
      </div>

      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-700 ease-out"
          style={{ width: `${w}%` }}
        />
      </div>

      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{p.summary}</p>
      <p className="mt-2 text-sm font-medium leading-relaxed text-foreground/90">{p.consequence}</p>
      <details className="mt-3 text-xs text-muted-foreground">
        <summary className="cursor-pointer font-semibold">Evidence found</summary>
        <ul className="mt-2 list-disc space-y-1 pl-5">{p.evidence.map((item, i) => <li key={i}>{item}</li>)}</ul>
      </details>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* loading                                                             */
/* ------------------------------------------------------------------ */

const STEPS = [
  "Reading the homepage",
  "Mapping the sitemap and content depth",
  "Checking social channels",
  "Looking for podcast and video signals",
  "Scanning third-party validation",
  "Scoring authority footprint",
];

function Scanning({ domain }: { domain: string }) {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setStep((s) => Math.min(STEPS.length - 1, s + 1)), 2400);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="mx-auto max-w-md py-4" data-testid="status-scanning">
      <div className="mb-8 text-center">
        <div className="font-mono text-xs uppercase tracking-[0.2em] text-primary">
          Analyzing
        </div>
        <div className="mt-2 break-all text-lg font-semibold">{domain}</div>
      </div>
      <ol className="space-y-3">
        {STEPS.map((s, i) => (
          <li
            key={s}
            className={`flex items-center gap-3 text-sm transition-opacity duration-300 ${
              i <= step ? "opacity-100" : "opacity-35"
            }`}
          >
            <span
              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                i < step
                  ? "border-primary bg-primary text-primary-foreground"
                  : i === step
                  ? "border-primary text-primary"
                  : "border-border text-transparent"
              }`}
            >
              {i < step ? (
                <Check className="h-3 w-3" strokeWidth={3} />
              ) : i === step ? (
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
              ) : null}
            </span>
            <span className={i <= step ? "text-foreground" : "text-muted-foreground"}>{s}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* page                                                                */
/* ------------------------------------------------------------------ */

export default function Home() {
  const [, navigate] = useLocation();
  const [url, setUrl] = useState("");
  const [socialLinks, setSocialLinks] = useState<SocialLinks>({});
  const [podcastUrl, setPodcastUrl] = useState("");
  const [founderName, setFounderName] = useState("");
  const [pending, setPending] = useState("");
  const [captured, setCaptured] = useState(false);
  const resultRef = useRef<HTMLDivElement>(null);

  const mutation = useMutation<ScoreResult, Error, string>({
    mutationFn: async (value: string) => {
      const res = await apiRequest("POST", "/api/score", { url: value, socialLinks, podcastUrl, founderName });
      return res.json();
    },
  });

  useEffect(() => {
    if (mutation.data && resultRef.current) {
      resultRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [mutation.data]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const v = url.trim();
    if (!v) return;
    setPending(v.replace(/^https?:\/\//, "").replace(/\/.*$/, ""));
    mutation.mutate(v);
  };

  const reset = () => {
    mutation.reset();
    setCaptured(false);
    clearHandoff();
    setUrl("");
    setSocialLinks({});
    setPodcastUrl("");
    setFounderName("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const errorMessage = (() => {
    if (!mutation.error) return null;
    const raw = mutation.error.message || "";
    const json = raw.slice(raw.indexOf("{"));
    try {
      return JSON.parse(json).error as string;
    } catch {
      return "We couldn't analyze that site. Check the URL and try again.";
    }
  })();

  const r = mutation.data;
  const tone = r ? toneFor(r.score) : null;

  return (
    <div className="min-h-screen bg-background text-foreground antialiased">
      {/* header */}
      <header className="border-b border-border/60">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4 sm:px-8">
          <div className="flex items-center gap-2.5">
            <Mark className="h-6 w-6 text-primary" />
            <span className="text-sm font-bold uppercase tracking-[0.14em]">Authority Score</span>
          </div>
          <a
            href="https://inspiredvibe.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:text-primary"
            data-testid="link-brand"
          >
            INSPIRED Vibe
          </a>
        </div>
      </header>

      {/* hero */}
      <section className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-[420px] opacity-[0.16]"
          style={{
            background:
              "radial-gradient(ellipse 70% 100% at 50% 0%, hsl(var(--brand-teal)), transparent 70%)",
          }}
        />
        <div className="relative mx-auto max-w-3xl px-5 pb-14 pt-16 text-center sm:px-8 sm:pt-24">
          <div className="font-mono text-[0.7rem] uppercase tracking-[0.3em] text-primary">
            One competitor. Six authority signals.
          </div>
          <h1
            className="mt-5 font-medium leading-[1.05] tracking-tight text-brand-navy"
            style={{ fontSize: "clamp(2.25rem, 6vw, 3.75rem)" }}
          >
            How visible is your competitor
            <br className="hidden sm:block" /> to potential buyers?
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            Enter a competitor’s website to assess their public authority —
            across social, content, podcast, video, and third-party validation — on a 0 to 10 scale.
          </p>

          <form onSubmit={submit} className="mx-auto mt-9 max-w-xl">
            <div className="flex flex-col gap-3 sm:flex-row">
              <Input
                type="text"
                inputMode="url"
                autoComplete="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="competitor.com"
                aria-label="Competitor website URL"
                required
                disabled={mutation.isPending}
                className="h-13 flex-1 rounded-lg border-input bg-card px-4 text-base"
                style={{ height: "3.25rem" }}
                data-testid="input-url"
              />
              <Button
                type="submit"
                disabled={mutation.isPending || !url.trim()}
                className="gap-2 rounded-lg px-7 text-sm font-bold uppercase tracking-wider"
                style={{ height: "3.25rem" }}
                data-testid="button-score"
              >
                {mutation.isPending ? "Analyzing…" : "Evaluate competitor"}
                {!mutation.isPending && <ArrowRight className="h-4 w-4" strokeWidth={2.5} />}
              </Button>
            </div>
            <fieldset className="mt-5 text-left">
              <legend className="text-sm font-semibold">Add the competitor’s social profiles <span className="font-normal text-muted-foreground">(optional)</span></legend>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">Include company or associated founder profiles. We’ll check public metrics where available.</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                {SOCIAL_PLATFORMS.map(platform => <label key={platform} className="text-xs font-semibold">
                  {{ instagram: "Instagram", youtube: "YouTube", tiktok: "TikTok" }[platform]}
                  <Input className="mt-1.5 bg-card text-sm" type="text" inputMode="url" autoComplete="off"
                    aria-label={`${platform} profile URL (optional)`} disabled={mutation.isPending}
                    placeholder={{ instagram: "instagram.com/brand", youtube: "youtube.com/@brand", tiktok: "tiktok.com/@brand" }[platform]}
                    value={socialLinks[platform] ?? ""} onChange={e => setSocialLinks(prev => ({ ...prev, [platform]: e.target.value }))} />
                </label>)}
              </div>
            </fieldset>
            <div className="mt-4 grid gap-4 text-left sm:grid-cols-2">
              <label className="text-xs font-semibold">Podcast link <span className="font-normal text-muted-foreground">(optional)</span>
                <Input className="mt-1.5 bg-card text-sm" inputMode="url" placeholder="Show page or RSS feed URL" value={podcastUrl} onChange={e=>setPodcastUrl(e.target.value)} disabled={mutation.isPending} maxLength={500} />
              </label>
              <label className="text-xs font-semibold">Founder’s name <span className="font-normal text-muted-foreground">(optional)</span>
                <Input className="mt-1.5 bg-card text-sm" placeholder="Full name" value={founderName} onChange={e=>setFounderName(e.target.value)} disabled={mutation.isPending} maxLength={100} />
              </label>
            </div>
            <p className="mt-2 text-left text-xs leading-relaxed text-muted-foreground">Founder lookup searches public web results for the name and company together. Coverage is limited, and matching names are not proof of identity.</p>
            <p className="mt-3 text-xs text-muted-foreground">
              Free. No email required. Deeper scans may take a minute or longer.
            </p>
          </form>
        </div>
      </section>

      <main className="mx-auto max-w-3xl px-5 pb-24 sm:px-8">
        {/* loading */}
        {mutation.isPending && (
          <div className="rounded-xl border border-border bg-card p-6 sm:p-10">
            <Scanning domain={pending} />
          </div>
        )}

        {/* error */}
        {errorMessage && !mutation.isPending && (
          <div
            className="flex items-start gap-3 rounded-xl border border-destructive/40 bg-destructive/10 p-5"
            data-testid="status-error"
          >
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" strokeWidth={2} />
            <div>
              <div className="text-sm font-semibold">Couldn't score that site</div>
              <p className="mt-1 text-sm text-muted-foreground">{errorMessage}</p>
            </div>
          </div>
        )}

        {/* result */}
        {r && !mutation.isPending && (
          <div ref={resultRef} className="scroll-mt-6" data-testid="section-result">
            {/* score stage */}
            <div className="rounded-xl border border-border bg-card px-5 py-10 text-center sm:px-10">
              <div className="font-mono text-[0.7rem] uppercase tracking-[0.24em] text-muted-foreground">
                Authority Score
              </div>
              <h2 className="mt-2 text-xl font-bold" data-testid="text-company-name">
                {r.companyName}
              </h2>
              <div className="text-sm text-muted-foreground">{r.domain}</div>
              <p className="mt-3 text-xs font-semibold text-muted-foreground">
                {r.provisional ? "Provisional score · " : "Evidence-supported score · "}{r.evidenceCoverage}% signal coverage
              </p>

              <div className="mt-6">
                <Dial score={r.score} />
              </div>

              <div
                className={`mt-3 text-sm font-bold uppercase tracking-[0.22em] ${tone?.text}`}
                data-testid="text-band-label"
              >
                {r.bandLabel} · Band {r.band}
              </div>
              <p className="mx-auto mt-4 max-w-md text-lg font-semibold leading-snug">
                {r.headline}
              </p>
            </div>

            {/* facts */}
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
              {[
                { k: "Is their offer clear?", v: r.offerAnswer, note: r.sellingNote },
                { k: "Is their audience clear?", v: r.audienceAnswer, note: r.audienceNote },
                { k: "Evidence coverage", v: r.standing, note: r.standingNote },
              ].map((f, i) => (
                <div
                  key={f.k}
                  className="rounded-xl border border-border bg-card p-5"
                  data-testid={`card-fact-${i}`}
                >
                  <div className="font-mono text-[0.65rem] uppercase tracking-[0.18em] text-muted-foreground">
                    {f.k}
                  </div>
                  <div className="mt-1.5 text-base font-bold text-primary">{f.v}</div>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{f.note}</p>
                </div>
              ))}
            </div>

            {/* verdict */}
            <div className="mt-4 rounded-xl border border-border bg-card p-6 sm:p-8">
              <h3 className="text-base font-bold">Why this competitor scored a {r.score}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">
                What potential buyers can find about this competitor before making contact.
              </p>
              <p className="mt-4 text-[0.9375rem] leading-relaxed text-foreground/90">
                {r.rationale}
              </p>

              <div className="mt-5 rounded-lg border-l-2 border-primary bg-primary/5 px-4 py-3">
                <div className="font-mono text-[0.65rem] uppercase tracking-[0.18em] text-primary">
                  Biggest constraint
                </div>
                <p className="mt-1.5 text-sm font-medium leading-relaxed">{r.biggestGap}</p>
              </div>

              {/* dual path: ready to talk, or not ready yet */}
              <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <a
                  href={BOOKING_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-start gap-3 rounded-lg border border-primary/50 bg-primary/5 p-4 transition-colors hover:border-primary"
                  data-testid="link-book"
                >
                  <CalendarCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" strokeWidth={2} />
                  <div>
                    <div className="text-sm font-bold">Plan your competitive response</div>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                      Discuss this competitor’s strengths and gaps with INSPIRED Vibe and identify opportunities for your brand.
                    </p>
                  </div>
                </a>
                <a
                  href={PLAYBOOK_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-start gap-3 rounded-lg border border-border p-4 transition-colors hover:border-primary/50"
                  data-testid="link-playbook"
                >
                  <Download className="mt-0.5 h-4 w-4 shrink-0 text-primary" strokeWidth={2} />
                  <div>
                    <div className="text-sm font-bold">Explore the Authority Playbook</div>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                      Use the Authority Playbook to plan your own visibility strategy. No call required.
                    </p>
                  </div>
                </a>
              </div>
            </div>

            {/* breakdown */}
            <div className="mt-4 rounded-xl border border-border bg-card p-6 sm:p-8">
              <h3 className="text-base font-bold">The six signals behind the number</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">
                Every point is traceable to something publicly visible. Nothing here is a black box.
              </p>
              <div className="mt-5">
                {r.pillars.map((p, i) => (
                  <PillarRow key={p.key} p={p} index={i} />
                ))}
              </div>
              <p className="mt-5 border-t border-border pt-4 text-xs leading-relaxed text-muted-foreground">
                Scan reliability: {r.confidence.toLowerCase()}. {r.confidenceNote}
              </p>
            </div>

            {/* impact hand-off */}
            <section className="mt-4 rounded-xl border border-border bg-card p-6 sm:p-8">
              <h3 className="text-base font-bold">Public social metrics</h3>
              <p className="mt-2 text-sm text-muted-foreground">Unavailable counts are unknown, not zero. Followers and views do not establish content quality or organic performance.</p>
              {!r.socialMetrics.length && <p className="mt-4 text-sm">No supported profile metrics were verified. Add a profile URL above and run a new assessment.</p>}
              {r.socialMetrics.map(profile => <div key={profile.url} className="mt-4 border-t border-border pt-4">
                <a href={profile.url} target="_blank" rel="noopener noreferrer" className="break-all text-sm font-semibold text-primary underline">{profile.url}</a>
                <p className="mt-1 text-xs text-muted-foreground">{profile.linkedFromWebsite ? "Linked from the scanned website" : "User-supplied · brand association not independently verified"}</p>
                <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2 text-sm">{profile.metrics.map(metric => <span key={metric.name}><strong>{metric.approximate ? "≈ " : ""}{metric.value.toLocaleString()}</strong> {metric.name}</span>)}</div>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{profile.note}</p>
              </div>)}
              <details className="mt-5 text-xs text-muted-foreground"><summary className="cursor-pointer font-semibold">Pages checked ({r.sources.length})</summary>
                <ul className="mt-3 space-y-2">{r.sources.map((source, i) => <li key={i}><a className="break-all underline" href={source.url} target="_blank" rel="noopener noreferrer">{source.url}</a> — {source.status === "read" ? "Read" : "Not readable"}</li>)}</ul>
              </details>
              {r.podcastEvidence && <div className="mt-5 border-t border-border pt-4">
                <h3 className="text-base font-bold">Supplied podcast</h3>
                <a className="mt-2 block break-all text-sm text-primary underline" href={r.podcastEvidence.url} target="_blank" rel="noopener noreferrer">{r.podcastEvidence.url}</a>
                <p className="mt-2 text-sm">{r.podcastEvidence.verified ? "Podcast evidence found" : "Not verified"} · {r.podcastEvidence.linkedFromWebsite ? "Linked from the company website" : "User-supplied; association not verified"}</p>
                {r.podcastEvidence.episodes > 0 && <p className="mt-1 text-xs">{r.podcastEvidence.episodes} episodes in the readable feed{r.podcastEvidence.latestEpisode ? ` · Latest: ${r.podcastEvidence.latestEpisode.slice(0,10)}` : ""}</p>}
                <p className="mt-2 text-xs text-muted-foreground">{r.podcastEvidence.note}</p>
              </div>}
              {r.founderEvidence && <div className="mt-5 border-t border-border pt-4">
                <h3 className="text-base font-bold">Founder search: {r.founderEvidence.name}</h3>
                <p className="mt-2 text-sm">{{"sources-found":"Name-and-company mentions found","no-confirmed-match":"No corroborated match found","search-unavailable":"Public search unavailable"}[r.founderEvidence.status]}</p>
                <p className="mt-1 text-xs text-muted-foreground">{r.founderEvidence.companyMentionsName ? "The company website also mentions this name." : "This name was not verified on the scanned company pages."}</p>
                <ul className="mt-3 space-y-2 text-xs">{r.founderEvidence.sources.map(source=><li key={source.url}><a className="break-all text-primary underline" href={source.url} target="_blank" rel="noopener noreferrer">{source.url}</a> — {source.matched ? "Name and company match" : source.readable ? "Match not confirmed" : "Not readable"}</li>)}</ul>
                <p className="mt-3 text-xs text-muted-foreground">{r.founderEvidence.note}</p>
                <a className="mt-2 inline-block text-xs font-semibold text-primary underline" href={r.founderEvidence.searchUrl} target="_blank" rel="noopener noreferrer">Open web search</a>
              </div>}
            </section>
            {captured ? (
              <CaptureDone />
            ) : (
              <Capture
                ctx={{
                  scanId: r.scanId ?? null,
                  score: r.score,
                  band: r.bandLabel,
                  company: r.companyName,
                  domain: r.domain,
                }}
                onDone={({ leadId, leadToken }) => {
                  setCaptured(true);
                  saveHandoff({
                    scanId: r.scanId ?? null,
                    score: r.score,
                    band: r.bandLabel,
                    company: r.companyName,
                    domain: r.domain,
                    leadId,
                    leadToken,
                  });
                  // Brief acknowledgement, then hand off. Long enough to read,
                  // short enough that it doesn't feel like a wait.
                  window.setTimeout(() => navigate(`/impact?score=${r.score}`), 900);
                }}
              />
            )}

            {/* recommendation + CTA */}
            <div className="mt-4 overflow-hidden rounded-xl border border-primary/40 bg-card">
              <div className="p-6 sm:p-8">
                <div className="font-mono text-[0.65rem] uppercase tracking-[0.18em] text-primary">
                  {r.recommended ? "Their growth potential" : "Competitor outlook"}
                </div>
                {r.recommended && (
                  <h3
                    className="mt-2 font-bold leading-[1.15] tracking-tight"
                    style={{ fontSize: "clamp(1.5rem, 4vw, 2rem)" }}
                    data-testid="text-recommendation-headline"
                  >
                    Explore the authority evidence
                  </h3>
                )}
                <p className="mt-3 text-base font-medium leading-relaxed">{r.recommendation}</p>
                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                  <a
                    href="https://inspiredvibe.com/tllp/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-12 items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-primary px-5 text-[0.8125rem] font-bold uppercase tracking-wide text-primary-foreground transition-opacity hover:opacity-90 sm:px-6 sm:text-sm sm:tracking-wider"
                    data-testid="link-cta"
                  >
                    Get the Authority Playbook
                    <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
                  </a>
                  <button
                    type="button"
                    onClick={reset}
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-lg border border-border px-6 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
                    data-testid="button-reset"
                  >
                    <RotateCcw className="h-4 w-4" strokeWidth={2} />
                    Evaluate another competitor
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* how it works — only before a result */}
        {!r && !mutation.isPending && !errorMessage && (
          <div className="rounded-xl border border-border bg-card p-6 sm:p-8">
            <h3 className="text-base font-bold">What gets measured</h3>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Six weighted signals — what buyers can find about this competitor online before deciding
              whether to contact them.
            </p>
            <div className="mt-6 grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
              {[
                { i: Share2, t: "Social Presence", w: "1.25 pts" },
                { i: Activity, t: "Social Effectiveness", w: "1.25 pts" },
                { i: FileText, t: "Content & SEO Footprint", w: "3.0 pts" },
                { i: Radio, t: "Podcast", w: "1.5 pts" },
                { i: Video, t: "Video", w: "1.5 pts" },
                { i: Globe2, t: "Third-Party Validation", w: "1.5 pts" },
              ].map((s) => (
                <div key={s.t} className="flex items-center gap-3">
                  <s.i className="h-4 w-4 shrink-0 text-primary" strokeWidth={1.75} />
                  <span className="text-sm font-semibold">{s.t}</span>
                  <span className="ml-auto font-mono text-[0.7rem] text-muted-foreground">
                    {s.w}
                  </span>
                </div>
              ))}
            </div>
            <p className="mt-6 border-t border-border pt-5 text-sm leading-relaxed text-foreground/90">
              See how this competitor presents their expertise, where their authority is strongest,
              and where their public presence has gaps.
            </p>
          </div>
        )}
      </main>

      <footer className="border-t border-border/60">
        <div className="mx-auto flex max-w-5xl flex-col gap-2 px-5 py-8 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <span>
            Scores are directional, built from publicly visible signals at the time of the scan.
          </span>
          <a
            href="https://inspiredvibe.com"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-foreground transition-colors hover:text-primary"
          >
            INSPIRED Vibe
          </a>
        </div>
      </footer>
    </div>
  );
}
