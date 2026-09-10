import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "wouter";
import {
  runModel,
  targetLadder,
  tierFor,
  fmtMoney,
  fmtPct,
  TIERS,
  DEFAULT_INPUT,
  type ModelInput,
} from "@shared/impact-model";
import { Logo, Eyebrow, NumberField } from "@/components/brand";
import { API_BASE } from "@/lib/queryClient";
import { readHandoff, readScoreParam } from "@/lib/handoff";
import { cn } from "@/lib/utils";

/* ==========================================================================
 * PROSPECT-FACING IMPACT MODEL
 *
 * Four inputs. One screen. No tabs.
 *
 * Deliberately excluded, and why:
 *   win rate     — the model's win-rate lift is multiplicative, so the entered
 *                  win rate cancels out of every revenue figure. Asking for it
 *                  would imply it changes the answer. It does not.
 *   CAC          — only feeds CAC savings, which we do not show here.
 *   investment   — only feeds ROI and payback. A self-entered investment figure
 *                  produces a self-flattering ROI, which is worth nothing in
 *                  front of a buyer. ROI belongs in the review conversation.
 *   elasticities, curve choice, lead-quality toggle — internal knobs.
 *
 * Reachable three ways, by design:
 *   1. handed off from a scan, with the score and company already known
 *   2. a bare link carrying ?score=
 *   3. cold, with nothing, defaulting to 5
 * ========================================================================== */

const BOOKING_URL = "https://inspiredvibe.com/contact-us/";
const CTA = "Book an Authority Impact Review";

export default function Impact() {
  // Scan context, if the visitor came through the Authority Score.
  const handoff = useMemo(() => readHandoff(), []);
  const seeded = useMemo(() => handoff?.score ?? readScoreParam(), [handoff]);

  const [dealVolume, setDealVolume] = useState(DEFAULT_INPUT.dealVolume);
  const [dealSize, setDealSize] = useState(DEFAULT_INPUT.dealSize);
  const [current, setCurrent] = useState(seeded ?? 5);
  const [target, setTarget] = useState(Math.min(10, (seeded ?? 5) + 2));

  const input: ModelInput = {
    ...DEFAULT_INPUT,
    dealVolume: dealVolume > 0 ? dealVolume : 0,
    dealSize: dealSize > 0 ? dealSize : 0,
    currentScore: current,
    targetScore: target,
  };

  const result = runModel(input);
  const ladder = targetLadder(input).filter((r) => r.target > current);

  const noMove = target <= current;
  const oppLift =
    result.opportunities > 0 ? (result.opportunitiesAdj / result.opportunities - 1) * 100 : 0;
  const dealLift = input.dealVolume > 0 ? (result.closedDeals / input.dealVolume - 1) * 100 : 0;
  const acvLift = input.dealSize > 0 ? (result.dealSizeAdj / input.dealSize - 1) * 100 : 0;

  /* ---- write the modeled figures back onto the lead --------------------- */
  // Only if the visitor gave us their details. Debounced, because these are
  // live inputs and we want the shape they settled on, not every keystroke.
  const leadId = handoff?.leadId ?? null;
  const leadToken = handoff?.leadToken ?? null;
  const lastSent = useRef("");

  useEffect(() => {
    if (leadId === null || !leadToken || noMove) return;
    const payload = {
      id: leadId,
      token: leadToken,
      targetScore: target,
      dealVolume: input.dealVolume,
      dealSize: input.dealSize,
      modeledDelta: Math.round(result.revenueDelta),
    };
    const sig = JSON.stringify(payload);
    if (sig === lastSent.current) return;

    const t = setTimeout(() => {
      lastSent.current = sig;
      void fetch(`${API_BASE}/api/lead/model`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(payload),
        keepalive: true,
      }).catch(() => {
        // Enrichment, not the lead itself. Silence is the right failure mode.
        lastSent.current = "";
      });
    }, 1800);
    return () => clearTimeout(t);
  }, [leadId, leadToken, target, input.dealVolume, input.dealSize, result.revenueDelta, noMove]);

  return (
    <div className="min-h-screen bg-background">
      {/* ---------------- HEADER ---------------- */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex min-h-14 max-w-[900px] items-center justify-between gap-4 px-4 py-2 sm:px-6">
          <Link
            href="/"
            className="flex items-center gap-2.5"
            data-testid="link-back-to-score"
          >
            <Logo className="h-6 w-6 shrink-0 text-brand-teal" />
            <span className="text-[13px] font-extrabold uppercase leading-none tracking-tight text-foreground">
              Authority Impact
            </span>
          </Link>
          <a
            href={BOOKING_URL}
            target="_blank"
            rel="noopener noreferrer"
            data-testid="link-cta-header"
            className="rounded-sm bg-brand-red px-3 py-2 text-[11px] font-bold uppercase tracking-[0.09em] text-white transition-colors hover:bg-brand-red/90"
          >
            Book a review
          </a>
        </div>
      </header>

      {/* ---------------- INTRO ---------------- */}
      <div className="border-b border-border bg-brand-shell">
        <div className="mx-auto max-w-[900px] px-4 py-9 sm:px-6 sm:py-12">
          <Eyebrow className="text-brand-red">INSPIRED Vibe</Eyebrow>
          <h1 className="mt-3 max-w-2xl text-2xl font-extrabold uppercase leading-[1.12] tracking-tight text-foreground sm:text-3xl">
            What could stronger authority mean for this competitor?
          </h1>
          {handoff ? (
            <p
              className="mt-3 max-w-xl text-[15px] leading-relaxed text-muted-foreground"
              data-testid="text-handoff-context"
            >
              Modeled for{" "}
              <span className="font-bold text-foreground">{handoff.company || handoff.domain}</span>
              , starting from the score of{" "}
              <span className="font-bold text-foreground">{handoff.score}</span> your scan returned.
              Enter estimates for their deal volume and deal size to explore a scenario—not their verified revenue.
            </p>
          ) : (
            <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-muted-foreground">
              Estimate a competitor’s deal volume and deal size, then compare authority scores.{" "}
              <Link
                href="/"
                className="font-semibold text-brand-teal underline decoration-brand-teal/40 underline-offset-4 hover:decoration-brand-teal"
                data-testid="link-get-score"
              >
                Evaluate a competitor first.
              </Link>
            </p>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-[900px] space-y-5 px-4 py-8 sm:px-6">
        {/* ---------------- STEP 1 ---------------- */}
        <section className="rounded-lg border border-card-border bg-card p-5 sm:p-6">
          <div className="mb-4 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <div>
              <Eyebrow className="mb-1">Step 1</Eyebrow>
              <h2 className="text-lg font-extrabold uppercase tracking-tight text-foreground">
                Competitor business assumptions
              </h2>
            </div>
            <div className="text-[13px] font-semibold tabular-nums text-muted-foreground">
              Annual revenue{" "}
              <span className="font-extrabold text-foreground" data-testid="text-baseline">
                {fmtMoney(result.baselineRevenue, true)}
              </span>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <NumberField
              label="Estimated deals per year"
              value={dealVolume}
              onChange={setDealVolume}
              testId="deal-volume"
            />
            <NumberField
              label="Estimated average deal size"
              value={dealSize}
              onChange={setDealSize}
              prefix="$"
              step={1000}
              testId="deal-size"
            />
          </div>
        </section>

        {/* ---------------- STEP 2 ---------------- */}
        <section className="rounded-lg border border-card-border bg-card p-5 sm:p-6">
          <div className="mb-4">
            <Eyebrow className="mb-1">Step 2</Eyebrow>
            <h2 className="text-lg font-extrabold uppercase tracking-tight text-foreground">
              Competitor authority
            </h2>
          </div>
          <div className="space-y-5">
            <ScoreRow
              label="Their current score"
              value={current}
              onChange={(v) => {
                setCurrent(v);
                if (target <= v) setTarget(Math.min(10, v + 1));
              }}
              accent="teal"
              testId="current"
            />
            <ScoreRow
              label="Scenario target score"
              value={target}
              onChange={setTarget}
              accent="red"
              testId="target"
            />
          </div>
        </section>

        {/* ---------------- RESULT ---------------- */}
        <section className="overflow-hidden rounded-lg bg-brand-ink" data-testid="section-result">
          <div className="p-5 sm:p-7">
            {noMove ? (
              <div className="py-4 text-center">
                <div className="text-[13px] font-semibold leading-relaxed text-white/70">
                  Pick a target above {current} to see what the move is worth.
                </div>
              </div>
            ) : (
              <>
                <Eyebrow className="text-white/45">
                  Modeled annual revenue at score {target}
                </Eyebrow>
                <div className="mt-2 flex flex-wrap items-end gap-x-5 gap-y-2">
                  <div
                    className="text-4xl font-extrabold tabular-nums leading-none tracking-tight text-white sm:text-5xl"
                    data-testid="text-projected"
                  >
                    {fmtMoney(result.projectedRevenue, true)}
                  </div>
                  <div className="pb-1 text-[14px] font-semibold tabular-nums text-white/55">
                    from {fmtMoney(result.baselineRevenue, true)} today
                  </div>
                </div>

                <div className="mt-6 flex flex-wrap items-center gap-x-8 gap-y-4 border-t border-white/12 pt-5">
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-[0.11em] text-white/45">
                      Added revenue
                    </div>
                    <div
                      className="mt-1 text-2xl font-extrabold tabular-nums leading-none text-white"
                      data-testid="text-delta"
                    >
                      {fmtMoney(result.revenueDelta, true)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-[0.11em] text-white/45">
                      Growth
                    </div>
                    <div className="mt-1 text-2xl font-extrabold tabular-nums leading-none text-brand-red">
                      {fmtPct(result.revenueDeltaPct)}
                    </div>
                  </div>
                  <div className="min-w-0">
                    <div className="text-[10px] font-bold uppercase tracking-[0.11em] text-white/45">
                      Scenario change
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px] font-bold uppercase tracking-[0.06em] text-white/75">
                      <span>{tierFor(current)}</span>
                      <span aria-hidden className="text-white/35">
                        →
                      </span>
                      <span className="text-white">{tierFor(target)}</span>
                    </div>
                  </div>
                </div>

                {/* what changes */}
                <div className="mt-6 grid gap-3 border-t border-white/12 pt-5 sm:grid-cols-3">
                  <Change label="Buyers in their pipeline" value={fmtPct(oppLift)} />
                  <Change label="Deals they close" value={fmtPct(dealLift)} />
                  <Change label="Estimated average deal size" value={fmtPct(acvLift)} />
                </div>
              </>
            )}
          </div>
        </section>

        {/* ---------------- LADDER ---------------- */}
        {ladder.length > 0 ? (
          <section className="rounded-lg border border-card-border bg-card p-5 sm:p-6">
            <div className="mb-4">
              <Eyebrow className="mb-1">Every target from here</Eyebrow>
              <h2 className="text-lg font-extrabold uppercase tracking-tight text-foreground">
                What each point is worth
              </h2>
            </div>
            <div className="space-y-1.5">
              {ladder.map((r) => {
                const sel = r.target === target;
                const width =
                  ladder[ladder.length - 1].revenueDelta > 0
                    ? (r.revenueDelta / ladder[ladder.length - 1].revenueDelta) * 100
                    : 0;
                return (
                  <button
                    key={r.target}
                    type="button"
                    onClick={() => setTarget(r.target)}
                    data-testid={`row-target-${r.target}`}
                    className={cn(
                      "relative flex w-full items-center gap-3 overflow-hidden rounded-sm border px-3 py-2.5 text-left transition-colors",
                      sel
                        ? "border-brand-red/60 bg-brand-red/[0.05]"
                        : "border-border bg-background hover:border-brand-teal/50",
                    )}
                  >
                    <span
                      aria-hidden
                      className={cn(
                        "absolute inset-y-0 left-0 transition-all",
                        sel ? "bg-brand-red/[0.10]" : "bg-brand-teal/[0.07]",
                      )}
                      style={{ width: `${Math.max(width, 2)}%` }}
                    />
                    <span
                      className={cn(
                        "relative z-10 w-6 shrink-0 text-[15px] font-extrabold tabular-nums",
                        sel ? "text-brand-red" : "text-foreground",
                      )}
                    >
                      {r.target}
                    </span>
                    <span className="relative z-10 hidden min-w-0 flex-1 truncate text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground sm:block">
                      {tierFor(r.target)}
                    </span>
                    <span
                      className={cn(
                        "relative z-10 ml-auto shrink-0 text-[14px] font-extrabold tabular-nums",
                        sel ? "text-brand-red" : "text-foreground",
                      )}
                    >
                      +{fmtMoney(r.revenueDelta, true)}
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="mt-3 text-[11px] leading-snug text-muted-foreground">
              Added annual revenue for each target, measured from their score of {current}. Tap a row
              to model it.
            </p>
          </section>
        ) : null}

        {/* ---------------- CTA ---------------- */}
        <section
          id="book"
          className="rounded-lg border border-brand-red/30 bg-brand-red/[0.04] p-5 text-center sm:p-7"
        >
          <h2 className="text-lg font-extrabold uppercase tracking-tight text-foreground sm:text-xl">
            {noMove
              ? "See what the move would be worth"
              : `${fmtMoney(result.revenueDelta, true)} is the number. Now the plan.`}
          </h2>
          <p className="mx-auto mt-2.5 max-w-lg text-[13px] leading-relaxed text-muted-foreground">
            Review this competitor’s authority and discuss what the findings could mean
            for your own visibility strategy.
          </p>
          <a
            href={BOOKING_URL}
            target="_blank"
            rel="noopener noreferrer"
            data-testid="link-cta-main"
            className="mt-5 inline-block rounded-sm bg-brand-red px-6 py-3 text-[12px] font-bold uppercase tracking-[0.1em] text-white transition-colors hover:bg-brand-red/90"
          >
            {CTA}
          </a>
        </section>
      </div>

      {/* ---------------- FOOTER ---------------- */}
      <footer className="border-t border-border bg-brand-shell">
        <div className="mx-auto max-w-[900px] px-4 py-6 text-[11px] leading-relaxed text-muted-foreground sm:px-6">
          <span className="font-bold uppercase tracking-[0.1em] text-foreground">INSPIRED Vibe</span>{" "}
          · Figures are directional planning estimates modeled from the two numbers you entered, not
          forecasts or guarantees. The entered deal volume and deal size are assumptions about this competitor at their
          current authority level, so only the difference between their current and target
          score is applied. These figures are not verified competitor financial data.
        </div>
      </footer>
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function Change({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-sm border border-white/12 bg-white/[0.04] px-3.5 py-3">
      <div className="text-[10px] font-bold uppercase leading-tight tracking-[0.09em] text-white/45">
        {label}
      </div>
      <div className="mt-1.5 text-lg font-extrabold tabular-nums leading-none text-white">
        {value}
      </div>
    </div>
  );
}

/** Column spans matching the tier bands: 0 / 1-2 / 3-4 / 5-7 / 8-10. */
const TIER_SPANS = [
  { name: TIERS[0].name, span: "col-span-1" },
  { name: TIERS[1].name, span: "col-span-2" },
  { name: TIERS[2].name, span: "col-span-2" },
  { name: TIERS[3].name, span: "col-span-3" },
  { name: TIERS[4].name, span: "col-span-3" },
] as const;

/** Light-panel score picker. */
function ScoreRow({
  label,
  value,
  onChange,
  accent,
  testId,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  accent: "teal" | "red";
  testId: string;
}) {
  const active =
    accent === "red"
      ? "border-brand-red bg-brand-red text-white"
      : "border-brand-teal bg-brand-teal text-brand-navy";
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <span className="text-[11px] font-bold uppercase tracking-[0.11em] text-foreground">
          {label}
        </span>
        <span
          className={cn(
            "text-[11px] font-bold uppercase tracking-[0.08em]",
            accent === "red" ? "text-brand-red" : "text-brand-teal",
          )}
          data-testid={`text-${testId}-tier`}
        >
          {tierFor(value)}
        </span>
      </div>
      <div className="grid grid-cols-11 gap-1" role="group" aria-label={label}>
        {Array.from({ length: 11 }, (_, i) => i).map((i) => (
          <button
            key={i}
            type="button"
            aria-pressed={i === value}
            aria-label={`${label} ${i}`}
            onClick={() => onChange(i)}
            data-testid={`button-${testId}-${i}`}
            className={cn(
              "h-9 rounded-sm border text-[13px] font-bold tabular-nums transition-colors",
              i === value
                ? active
                : "border-input bg-background text-muted-foreground hover:border-brand-teal/60 hover:text-foreground",
            )}
          >
            {i}
          </button>
        ))}
      </div>
      {/* Labels are span-aligned to the scores each tier actually covers, so
          nobody reads the wrong band off a justify-between row. Hidden on
          mobile — the names truncate at 375px, and the selected tier is
          already named beside the label. */}
      <div className="mt-1.5 hidden grid-cols-11 text-[9px] font-semibold uppercase tracking-[0.04em] text-muted-foreground sm:grid">
        {TIER_SPANS.map((t) => (
          <span key={t.name} className={cn("truncate text-center", t.span)}>
            {t.name}
          </span>
        ))}
      </div>
    </div>
  );
}
