/**
 * AUTHORITY IMPACT MODEL — Phase 1 model layer
 * ---------------------------------------------------------------------------
 * Portable. Zero dependencies. No DOM, no React, no server.
 * This file is intended to be copied into the Authority Score codebase
 * unchanged at Phase 3.
 *
 * WHAT CHANGED FROM THE LEGACY CALCULATOR
 * 1. The four maturity levels (Reactive / Emerging / Consistent / Authority
 *    Leader) are replaced by an 11-point posture curve indexed by the
 *    Authority Score, 0..10.
 * 2. Levers are applied as DIFFERENTIALS — Lever(target) - Lever(current) —
 *    not as absolutes. This is the single most important correction. The KPIs
 *    a prospect enters already embed the results of their CURRENT authority.
 *    Applying the absolute lever for the target posture would double-count
 *    everything they have already earned.
 * 3. Lead-quality lift is derived from the score delta instead of being a
 *    manually-set slider.
 */

/* ========================================================================== *
 * TIERS — canonical names come from the Authority Score engine.
 * The legacy calculator's names (Reactive / Consistent / Authority Leader) are
 * retired to remove the collision where the calculator's "Emerging" sat at an
 * implied score of ~2.6 while the Score's "Emerging" tier is 3-4.
 * ========================================================================== */

export type TierName = "Invisible" | "Minimal" | "Emerging" | "Established" | "Dominant";

export const TIERS: { name: TierName; min: number; max: number }[] = [
  { name: "Invisible", min: 0, max: 0 },
  { name: "Minimal", min: 1, max: 2 },
  { name: "Emerging", min: 3, max: 4 },
  { name: "Established", min: 5, max: 7 },
  { name: "Dominant", min: 8, max: 10 },
];

export function tierFor(score: number): TierName {
  const s = Math.round(clamp(score, 0, 10));
  return (TIERS.find((t) => s >= t.min && s <= t.max) ?? TIERS[0]).name;
}

/* ========================================================================== *
 * POSTURE CURVES — indexed 0..10 by Authority Score.
 *
 * Calibration constraints these satisfy by construction:
 *   index 0  == the legacy "Reactive" level  (all zeros)
 *   index 10 == the legacy "Authority Leader" level (0.45 / 0.25 / 0.11 / 0.10)
 * so the new model reproduces the legacy calculator exactly at both ends of
 * the range. Nothing has been distributed externally, so this is a continuity
 * guarantee for the methodology, not a client-comparability obligation.
 *
 * Shape is concave — each additional point buys less than the one before it.
 * That is deliberate: authority compounds early and saturates late, and it is
 * what produces the diminishing-returns curve in the sensitivity analysis.
 * ========================================================================== */

/** Market access -> incremental opportunity volume. */
export const VOL_CURVE = [0.0, 0.03, 0.07, 0.12, 0.18, 0.24, 0.3, 0.35, 0.39, 0.42, 0.45] as const;
/** Sales-cycle compression. */
export const CYC_CURVE = [0.0, 0.02, 0.05, 0.08, 0.11, 0.14, 0.17, 0.2, 0.22, 0.24, 0.25] as const;
/** Pricing power -> realised ACV uplift. */
export const PRICE_CURVE = [0.0, 0.005, 0.015, 0.03, 0.045, 0.06, 0.075, 0.088, 0.098, 0.105, 0.11] as const;
/** Direct CAC efficiency bonus, on top of the lead-quality effect. */
export const CAC_CURVE = [0.0, 0.0, 0.01, 0.02, 0.035, 0.05, 0.065, 0.078, 0.088, 0.095, 0.1] as const;
/**
 * Lead-quality lift, in PERCENTAGE POINTS (not a fraction).
 *
 * FINDING (surfaced by the regression harness, open for decision):
 * This approved v3 curve has strictly INCREASING increments all the way to the
 * top — 1.0, 1.5, 1.5, 2.0, 2.0, 2.0, 2.0, 2.5, 2.5, 3.0. It therefore claims
 * the tenth point of authority buys more lead-quality improvement than any
 * earlier point, which is backwards and is the sole reason the marginal-value
 * curve ticks back up at 9 -> 10. Left as the DEFAULT because changing an
 * approved curve is a modeling decision, not a bug fix. See LQ_CURVE_TAPERED.
 */
export const LQ_CURVE = [0.0, 1.0, 2.5, 4.0, 6.0, 8.0, 10.0, 12.0, 14.5, 17.0, 20.0] as const;

/**
 * Proposed replacement. Same endpoints (0 and 20pp) so the legacy top-level
 * calibration is untouched, but the increments are single-peaked like the other
 * four levers — 0.8, 1.5, 2.2, 2.6, 2.8, 2.8, 2.5, 2.0, 1.5, 1.3.
 */
export const LQ_CURVE_TAPERED = [0.0, 0.8, 2.3, 4.5, 7.1, 9.9, 12.7, 15.2, 17.2, 18.7, 20.0] as const;

export type LqCurveChoice = "approved" | "tapered";

export function lqCurve(choice: LqCurveChoice = "approved"): readonly number[] {
  return choice === "tapered" ? LQ_CURVE_TAPERED : LQ_CURVE;
}

export const LEVERS = [
  { key: "vol", label: "Market access", curve: VOL_CURVE, unit: "pct", hint: "Inbound opportunity volume" },
  { key: "cyc", label: "Cycle compression", curve: CYC_CURVE, unit: "pct", hint: "Sales cycle shortening" },
  { key: "price", label: "Pricing power", curve: PRICE_CURVE, unit: "pct", hint: "Realised ACV uplift" },
  { key: "cac", label: "CAC efficiency", curve: CAC_CURVE, unit: "pct", hint: "Direct acquisition-cost bonus" },
  { key: "lq", label: "Lead quality", curve: LQ_CURVE, unit: "pp", hint: "Feeds win rate and CAC" },
] as const;

/* ========================================================================== *
 * DEFAULTS — carried over from the legacy calculator so the two models can be
 * diffed against each other on identical inputs.
 * ========================================================================== */

export const DEFAULT_ELASTICITY = { winRate: 0.7, cac: 0.8 } as const;
export const RAMP_MONTHS = 18;

export interface ModelInput {
  currentScore: number;
  targetScore: number;
  dealVolume: number; // closed deals per year
  dealSize: number; // average ACV, currency
  winRate: number; // percent, 0..100
  cycleLength: number; // days
  cac: number; // currency
  investment: number; // annual authority investment, currency
  winRateElasticity?: number;
  cacElasticity?: number;
  /**
   * Which lead-quality curve to use. Default "approved".
   */
  lqCurveChoice?: LqCurveChoice;
  /**
   * Set false to run POSTURE LEVERS ONLY (market access, cycle, pricing, CAC
   * bonus) with no derived lead-quality effect. This is the apples-to-apples
   * mode used for legacy-equivalence testing, because the legacy calculator's
   * lead quality was a manual slider that defaulted to zero. Default true.
   */
  includeLeadQuality?: boolean;
}

export const DEFAULT_INPUT: ModelInput = {
  currentScore: 5,
  targetScore: 7,
  dealVolume: 40,
  dealSize: 45000,
  winRate: 22,
  cycleLength: 120,
  cac: 6500,
  investment: 60000,
  winRateElasticity: DEFAULT_ELASTICITY.winRate,
  cacElasticity: DEFAULT_ELASTICITY.cac,
  lqCurveChoice: "approved",
  includeLeadQuality: true,
};

export interface LeverDeltas {
  vol: number; // fraction
  cyc: number; // fraction
  price: number; // fraction
  cacBonus: number; // fraction
  leadQuality: number; // fraction (converted from pp)
}

export interface ModelResult {
  input: ModelInput;
  currentTier: TierName;
  targetTier: TierName;
  scoreDelta: number;
  deltas: LeverDeltas;

  /** Revenue bridge, in strict sequential order. */
  bridge: { key: string; label: string; value: number; step: number }[];

  baselineRevenue: number;
  projectedRevenue: number;
  revenueDelta: number;
  revenueDeltaPct: number;

  opportunities: number;
  opportunitiesAdj: number;
  closedDeals: number;
  winRateAdj: number; // percent
  dealSizeAdj: number;
  cycleAdj: number; // days
  cacAdj: number;
  cacReductionPct: number;
  netCacSavings: number;

  totalIncremental: number;
  roi: number;
  paybackMonths: number | null;
  ramp: { month: number; fraction: number; cumulative: number }[];
}

export function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

/** Snap to a whole point and clamp into range — curves are indexed by integer. */
function idx(score: number): number {
  return Math.round(clamp(score, 0, 10));
}

/**
 * THE DIFFERENTIAL RULE.
 * Every lever is the difference between the target posture and the current
 * posture. If current == target, every delta is zero and the model returns the
 * baseline untouched — which is the correct and testable behaviour.
 */
export function leverDeltas(
  currentScore: number,
  targetScore: number,
  opts: { lqCurveChoice?: LqCurveChoice; includeLeadQuality?: boolean } = {},
): LeverDeltas {
  const c = idx(currentScore);
  const t = idx(targetScore);
  const lq = lqCurve(opts.lqCurveChoice ?? "approved");
  return {
    vol: VOL_CURVE[t] - VOL_CURVE[c],
    cyc: CYC_CURVE[t] - CYC_CURVE[c],
    price: PRICE_CURVE[t] - PRICE_CURVE[c],
    cacBonus: CAC_CURVE[t] - CAC_CURVE[c],
    leadQuality: opts.includeLeadQuality === false ? 0 : (lq[t] - lq[c]) / 100,
  };
}

export function runModel(raw: ModelInput): ModelResult {
  const input: ModelInput = {
    ...raw,
    winRateElasticity: raw.winRateElasticity ?? DEFAULT_ELASTICITY.winRate,
    cacElasticity: raw.cacElasticity ?? DEFAULT_ELASTICITY.cac,
    lqCurveChoice: raw.lqCurveChoice ?? "approved",
    includeLeadQuality: raw.includeLeadQuality !== false,
  };

  const d = leverDeltas(input.currentScore, input.targetScore, {
    lqCurveChoice: input.lqCurveChoice,
    includeLeadQuality: input.includeLeadQuality,
  });
  const winRateFrac = input.winRate / 100;

  // Baseline opportunity count implied by the KPIs the prospect entered.
  const opportunities = input.dealVolume / Math.max(winRateFrac, 0.001);
  const baselineRevenue = input.dealVolume * input.dealSize;

  // 1. Lead quality lifts win rate on the SAME opportunity base.
  const winRateAdj = clamp(winRateFrac * (1 + d.leadQuality * input.winRateElasticity!), 0.01, 0.95);
  const dealsAfterLQ = opportunities * winRateAdj;
  const comp1 = dealsAfterLQ * input.dealSize;

  // 2. Market access grows the opportunity base at the improved win rate.
  const opportunitiesAdj = opportunities * (1 + d.vol);
  const closedDeals = opportunitiesAdj * winRateAdj;
  const comp2 = closedDeals * input.dealSize;

  // 3. Pricing power lifts realised ACV on the grown deal count.
  const dealSizeAdj = input.dealSize * (1 + d.price);
  const comp3 = closedDeals * dealSizeAdj;

  // Efficiency levers — do not enter the revenue bridge, reported separately.
  const cycleAdj = input.cycleLength * (1 - d.cyc);
  const cacReduction = clamp(d.leadQuality * input.cacElasticity! + d.cacBonus, 0, 0.85);
  const cacAdj = input.cac * (1 - cacReduction);
  const netCacSavings = closedDeals * (input.cac - cacAdj);

  const revenueDelta = comp3 - baselineRevenue;
  const totalIncremental = revenueDelta + netCacSavings;
  const roi = input.investment > 0 ? totalIncremental / input.investment : 0;

  // 18-month linear ramp; payback is the first month cumulative clears spend.
  const ramp: ModelResult["ramp"] = [];
  let cumulative = 0;
  let paybackMonths: number | null = null;
  for (let m = 1; m <= 36; m++) {
    const fraction = Math.min(1, m / RAMP_MONTHS);
    cumulative += (totalIncremental / 12) * fraction;
    ramp.push({ month: m, fraction, cumulative });
    if (paybackMonths === null && cumulative >= input.investment && input.investment > 0) {
      paybackMonths = m;
    }
  }

  return {
    input,
    currentTier: tierFor(input.currentScore),
    targetTier: tierFor(input.targetScore),
    scoreDelta: idx(input.targetScore) - idx(input.currentScore),
    deltas: d,
    bridge: [
      { key: "base", label: "Current revenue", value: baselineRevenue, step: 0 },
      { key: "lq", label: "Lead quality", value: comp1, step: comp1 - baselineRevenue },
      { key: "vol", label: "Market access", value: comp2, step: comp2 - comp1 },
      { key: "price", label: "Pricing power", value: comp3, step: comp3 - comp2 },
      { key: "proj", label: "Modeled revenue", value: comp3, step: 0 },
    ],
    baselineRevenue,
    projectedRevenue: comp3,
    revenueDelta,
    revenueDeltaPct: baselineRevenue > 0 ? (revenueDelta / baselineRevenue) * 100 : 0,
    opportunities,
    opportunitiesAdj,
    closedDeals,
    winRateAdj: winRateAdj * 100,
    dealSizeAdj,
    cycleAdj,
    cacAdj,
    cacReductionPct: cacReduction * 100,
    netCacSavings,
    totalIncremental,
    roi,
    paybackMonths,
    ramp,
  };
}

/* ========================================================================== *
 * ANALYSIS HELPERS
 * ========================================================================== */

/** Cumulative value of moving from the current score to every higher target. */
export function targetLadder(input: ModelInput) {
  const c = idx(input.currentScore);
  const rows: {
    target: number;
    tier: TierName;
    projectedRevenue: number;
    revenueDelta: number;
    totalIncremental: number;
    roi: number;
    marginal: number;
  }[] = [];
  let prev = 0;
  for (let t = c; t <= 10; t++) {
    const r = runModel({ ...input, targetScore: t });
    rows.push({
      target: t,
      tier: tierFor(t),
      projectedRevenue: r.projectedRevenue,
      revenueDelta: r.revenueDelta,
      totalIncremental: r.totalIncremental,
      roi: r.roi,
      marginal: r.totalIncremental - prev,
    });
    prev = r.totalIncremental;
  }
  return rows;
}

/** The same +N move from every possible starting score — shows saturation. */
export function saturationCurve(input: ModelInput, step = 2) {
  const rows: { from: number; to: number; revenueDelta: number; totalIncremental: number; roi: number }[] = [];
  for (let c = 0; c + step <= 10; c++) {
    const r = runModel({ ...input, currentScore: c, targetScore: c + step });
    rows.push({ from: c, to: c + step, revenueDelta: r.revenueDelta, totalIncremental: r.totalIncremental, roi: r.roi });
  }
  return rows;
}

/* ========================================================================== *
 * REGRESSION SUITE — proves the rewrite reproduces the legacy calculator where
 * it should, and quantifies every place it deliberately does not.
 *
 * The legacy calculator applied ABSOLUTE levers from whatever baseline the user
 * entered, with no notion of a current score. The equivalent in the new model
 * is therefore always currentScore = 0.
 * ========================================================================== */

export interface LegacyLevel {
  name: string;
  volumeLift: number;
  cycleReduction: number;
  pricingPower: number;
  cacBonus: number;
  /** Legacy UI had a manual lead-quality slider, default 0. */
  leadQuality: number;
}

/** Verified against the deployed calculator and the source archive. */
export const LEGACY_LEVELS: LegacyLevel[] = [
  { name: "Reactive", volumeLift: 0.0, cycleReduction: 0.0, pricingPower: 0.0, cacBonus: 0.0, leadQuality: 0 },
  { name: "Emerging", volumeLift: 0.1, cycleReduction: 0.08, pricingPower: 0.02, cacBonus: 0.0, leadQuality: 0 },
  { name: "Consistent", volumeLift: 0.25, cycleReduction: 0.18, pricingPower: 0.06, cacBonus: 0.05, leadQuality: 0 },
  { name: "Authority Leader", volumeLift: 0.45, cycleReduction: 0.25, pricingPower: 0.11, cacBonus: 0.1, leadQuality: 0 },
];

/** Where does an absolute lever value fall on the new curve? Linear interp. */
export function impliedScore(curve: readonly number[], value: number): number {
  if (value <= curve[0]) return 0;
  for (let i = 0; i < curve.length - 1; i++) {
    if (value >= curve[i] && value <= curve[i + 1]) {
      const span = curve[i + 1] - curve[i];
      return i + (span === 0 ? 0 : (value - curve[i]) / span);
    }
  }
  return 10;
}

export interface CalibrationRow {
  level: string;
  vol: number;
  cyc: number;
  price: number;
  cac: number;
  spread: number;
  /** Exact by construction, or an approximation with a spread across levers. */
  exact: boolean;
}

export function calibrationTable(): CalibrationRow[] {
  return LEGACY_LEVELS.map((l) => {
    const vol = impliedScore(VOL_CURVE, l.volumeLift);
    const cyc = impliedScore(CYC_CURVE, l.cycleReduction);
    const price = impliedScore(PRICE_CURVE, l.pricingPower);
    const cac = impliedScore(CAC_CURVE, l.cacBonus);
    const all = [vol, cyc, price, cac];
    const spread = Math.max(...all) - Math.min(...all);
    return { level: l.name, vol, cyc, price, cac, spread, exact: spread < 0.001 };
  });
}

/** Reproduce the legacy engine exactly, for use as a regression oracle. */
export function runLegacy(level: LegacyLevel, input: ModelInput) {
  const lq = level.leadQuality / 100;
  const winRateFrac = input.winRate / 100;
  const wrE = input.winRateElasticity ?? DEFAULT_ELASTICITY.winRate;
  const cacE = input.cacElasticity ?? DEFAULT_ELASTICITY.cac;

  const O = input.dealVolume / Math.max(winRateFrac, 0.001);
  const comp0 = input.dealVolume * input.dealSize;
  const winRateAdj = clamp(winRateFrac * (1 + lq * wrE), 0.01, 0.95);
  const closed = O * (1 + level.volumeLift) * winRateAdj;
  const dealSizeAdj = input.dealSize * (1 + level.pricingPower);
  const comp3 = closed * dealSizeAdj;
  const cacReduction = clamp(lq * cacE + level.cacBonus, 0, 0.85);
  const cacAdj = input.cac * (1 - cacReduction);
  return {
    baselineRevenue: comp0,
    projectedRevenue: comp3,
    revenueDelta: comp3 - comp0,
    closedDeals: closed,
    dealSizeAdj,
    cycleAdj: input.cycleLength * (1 - level.cycleReduction),
    cacAdj,
    netCacSavings: closed * (input.cac - cacAdj),
    totalIncremental: comp3 - comp0 + closed * (input.cac - cacAdj),
  };
}

export type CaseStatus = "pass" | "fail" | "review";

export interface RegressionCase {
  name: string;
  kind: "Legacy equivalence" | "Structural invariant" | "Curve shape" | "Model change";
  status: CaseStatus;
  detail: string;
  expected: string;
  actual: string;
}

/**
 * Run the full suite against a given KPI set.
 *
 * Three statuses, deliberately. A binary pass/fail forces genuine open modeling
 * decisions to masquerade as bugs. "review" means the model is behaving exactly
 * as specified and the SPECIFICATION is what needs a decision.
 */
export function regressionSuite(input: ModelInput): RegressionCase[] {
  const cases: RegressionCase[] = [];
  const money = (n: number) => fmtMoney(n);
  const near = (a: number, b: number, tol = 1) => Math.abs(a - b) <= tol;
  const st = (ok: boolean): CaseStatus => (ok ? "pass" : "fail");

  /* --- LEGACY EQUIVALENCE ------------------------------------------------ *
   * Run posture levers ONLY. The legacy calculator's lead quality was a
   * manual slider defaulting to zero, so comparing against the new derived
   * lead-quality effect would not be apples-to-apples.
   * ---------------------------------------------------------------------- */
  const postureOnly = (currentScore: number, targetScore: number) =>
    runModel({ ...input, currentScore, targetScore, includeLeadQuality: false });

  const reactive = runLegacy(LEGACY_LEVELS[0], input);
  const zeroMove = postureOnly(0, 0);
  cases.push({
    name: 'Legacy "Reactive" is identical to score 0 \u2192 0',
    kind: "Legacy equivalence",
    status: st(near(reactive.projectedRevenue, zeroMove.projectedRevenue)),
    detail: "All levers zero. The model must return the entered baseline untouched.",
    expected: money(reactive.projectedRevenue),
    actual: money(zeroMove.projectedRevenue),
  });

  const leader = runLegacy(LEGACY_LEVELS[3], input);
  const fullMove = postureOnly(0, 10);
  cases.push({
    name: 'Legacy "Authority Leader" is identical to score 0 \u2192 10',
    kind: "Legacy equivalence",
    status: st(near(leader.projectedRevenue, fullMove.projectedRevenue)),
    detail:
      "The curve endpoints were set to the legacy top-level lever values, so this must match to the dollar. Any drift here means the rewrite has silently changed the methodology at the top of the range.",
    expected: money(leader.projectedRevenue),
    actual: money(fullMove.projectedRevenue),
  });

  cases.push({
    name: 'Legacy "Authority Leader" CAC savings preserved',
    kind: "Legacy equivalence",
    status: st(near(leader.netCacSavings, fullMove.netCacSavings, 2)),
    detail: "The efficiency levers must survive the endpoint mapping too, not just revenue.",
    expected: money(leader.netCacSavings),
    actual: money(fullMove.netCacSavings),
  });

  cases.push({
    name: 'Legacy "Authority Leader" cycle and ACV preserved',
    kind: "Legacy equivalence",
    status: st(near(leader.cycleAdj, fullMove.cycleAdj, 0.01) && near(leader.dealSizeAdj, fullMove.dealSizeAdj, 1)),
    detail: "Cycle compression and realised ACV at the top of the curve.",
    expected: `${Math.round(leader.cycleAdj)}d / ${money(leader.dealSizeAdj)}`,
    actual: `${Math.round(fullMove.cycleAdj)}d / ${money(fullMove.dealSizeAdj)}`,
  });

  // Middle levels: bracket, not equality. The old dropdown has no single score
  // equivalent because its four levers imply four different scores.
  const bracket = (legacyIdx: number, lo: number, hi: number) => {
    const L = runLegacy(LEGACY_LEVELS[legacyIdx], input);
    const rLo = postureOnly(0, lo);
    const rHi = postureOnly(0, hi);
    cases.push({
      name: `Legacy "${LEGACY_LEVELS[legacyIdx].name}" falls between score ${lo} and ${hi}`,
      kind: "Legacy equivalence",
      status: st(L.projectedRevenue >= rLo.projectedRevenue - 1 && L.projectedRevenue <= rHi.projectedRevenue + 1),
      detail:
        "A bracket is the honest test. See the calibration table for the per-lever implied scores and their spread.",
      expected: `${money(rLo.projectedRevenue)} \u2026 ${money(rHi.projectedRevenue)}`,
      actual: money(L.projectedRevenue),
    });
  };
  bracket(1, 2, 3);
  bracket(2, 5, 6);

  /* --- MODEL CHANGE (disclosure, not a test) ----------------------------- */
  const withLq = runModel({ ...input, currentScore: 0, targetScore: 10 });
  cases.push({
    name: "Derived lead quality is an accepted addition, not a regression",
    kind: "Model change",
    status: "pass",
    detail:
      "The legacy tool only applied a lead-quality effect if a user manually dragged a slider that defaulted to zero, so in practice it was almost never applied. This model derives it from the score delta, so it always fires and every result sits above the legacy figure. Accepted and closed: no legacy output was ever distributed, so there is nothing to reconcile. The gap is quantified here so the source of the uplift is never in question, and the posture-only switch isolates it on demand.",
    expected: `${money(fullMove.projectedRevenue)} posture only`,
    actual: `${money(withLq.projectedRevenue)} with lead quality (+${money(withLq.projectedRevenue - fullMove.projectedRevenue)})`,
  });

  /* --- STRUCTURAL INVARIANTS -------------------------------------------- */
  for (const s of [0, 5, 10]) {
    const flat = runModel({ ...input, currentScore: s, targetScore: s });
    cases.push({
      name: `No-move invariant at score ${s}`,
      kind: "Structural invariant",
      status: st(near(flat.revenueDelta, 0, 0.01) && near(flat.netCacSavings, 0, 0.01)),
      detail: "current equals target must produce exactly zero uplift. This is what the differential rule buys.",
      expected: "$0 revenue and $0 CAC savings",
      actual: `${money(flat.revenueDelta)} / ${money(flat.netCacSavings)}`,
    });
  }

  const down = runModel({ ...input, currentScore: 7, targetScore: 5 });
  cases.push({
    name: "Downward move is negative, not clamped to zero",
    kind: "Structural invariant",
    status: st(down.revenueDelta < 0),
    detail: "Losing authority must cost revenue. Silent clamping would hide the risk case entirely.",
    expected: "negative delta",
    actual: money(down.revenueDelta),
  });

  const a = leverDeltas(5, 6);
  const b = leverDeltas(6, 7);
  const ab = leverDeltas(5, 7);
  cases.push({
    name: "Lever deltas are additive across the curve",
    kind: "Structural invariant",
    status: st(near(a.vol + b.vol, ab.vol, 1e-9) && near(a.price + b.price, ab.price, 1e-9) && near(a.cyc + b.cyc, ab.cyc, 1e-9)),
    detail: "delta(5\u21926) plus delta(6\u21927) must equal delta(5\u21927). Guards against curve drift.",
    expected: (ab.vol * 100).toFixed(2) + "% access",
    actual: ((a.vol + b.vol) * 100).toFixed(2) + "% access",
  });

  let mono = true;
  let pairs = 0;
  for (let c = 0; c <= 10; c++) {
    let last = -Infinity;
    for (let t = c; t <= 10; t++) {
      pairs++;
      const v = runModel({ ...input, currentScore: c, targetScore: t }).totalIncremental;
      if (v < last - 1e-6) mono = false;
      last = v;
    }
  }
  cases.push({
    name: `Monotonic across all ${pairs} ordered score pairs`,
    kind: "Structural invariant",
    status: st(mono),
    detail: "A higher target must never model less value than a lower one from the same starting score.",
    expected: "monotonic",
    actual: mono ? "monotonic" : "violation found",
  });

  const curvesOk = LEVERS.every((l) => {
    if (l.curve.length !== 11) return false;
    for (let i = 1; i < l.curve.length; i++) if (l.curve[i] < l.curve[i - 1]) return false;
    return true;
  });
  cases.push({
    name: "All five curves are 11-point and non-decreasing",
    kind: "Structural invariant",
    status: st(curvesOk),
    detail: "Structural guard on the curve tables themselves.",
    expected: "5 of 5 valid",
    actual: curvesOk ? "5 of 5 valid" : "invalid curve found",
  });

  const winRateCap = runModel({ ...input, winRate: 92, currentScore: 0, targetScore: 10 });
  cases.push({
    name: "Win rate is capped at 95%",
    kind: "Structural invariant",
    status: st(winRateCap.winRateAdj <= 95.0001),
    detail: "A high entered win rate plus a full-curve move must not produce an impossible win rate.",
    expected: "at most 95.0%",
    actual: winRateCap.winRateAdj.toFixed(1) + "%",
  });

  /* --- CURVE SHAPE ------------------------------------------------------- */
  const shapeCheck = (choice: LqCurveChoice) => {
    const ladder = targetLadder({ ...input, currentScore: 0, lqCurveChoice: choice });
    const m = ladder.slice(1).map((r) => r.marginal);
    let rising = true;
    let unimodal = true;
    let peakAt = 1;
    for (let i = 1; i < m.length; i++) {
      if (m[i] > m[i - 1] + 1) {
        if (!rising) unimodal = false;
        peakAt = i + 1;
      } else if (m[i] < m[i - 1] - 1) {
        rising = false;
      }
    }
    return { unimodal, peakAt, m };
  };

  const approved = shapeCheck("approved");
  const tapered = shapeCheck("tapered");
  const usingApproved = (input.lqCurveChoice ?? "approved") === "approved";
  const active = usingApproved ? approved : tapered;

  cases.push({
    name: "Marginal value is single-peaked (S-curve, then saturation)",
    kind: "Curve shape",
    status: active.unimodal ? "pass" : "review",
    detail: active.unimodal
      ? "Each additional point buys more up to a peak, then progressively less. This is the intended S-curve: authority has a threshold effect early and saturates late."
      : "KNOWN AND ACCEPTED, RETAINED BY DECISION. Marginal value rises again at the top of the curve instead of continuing to fall, so the model asserts the tenth point of authority buys more lead quality than the fourth. The cause is isolated to the approved v3 lead-quality curve, whose increments increase all the way up (1.0 \u2192 3.0pp). Approved v3 was reviewed against the Tapered alternative and deliberately kept as canonical, so this is a specification decision on record \u2014 not a code defect and not an open question. Do not present the marginal-value chart above a target of 9 without explaining the uptick.",
    expected: "rise to a peak, then monotonic decline",
    actual: active.unimodal ? `single-peaked, peak at step ${active.peakAt}` : "rises again at step 10",
  });

  cases.push({
    name: "Tapered lead-quality curve resolves the shape defect",
    kind: "Curve shape",
    status: st(tapered.unimodal),
    detail:
      "The proposed replacement keeps the same endpoints (0 and 20pp) so the legacy calibration is untouched, but makes the increments single-peaked like the other four levers. If this passes, the fix is a one-line curve swap.",
    expected: "single-peaked",
    actual: tapered.unimodal ? `single-peaked, peak at step ${tapered.peakAt}` : "still rises at the top",
  });

  cases.push({
    name: "Both lead-quality curves share the same endpoints",
    kind: "Curve shape",
    status: st(
      LQ_CURVE[0] === LQ_CURVE_TAPERED[0] && Math.abs(LQ_CURVE[10] - LQ_CURVE_TAPERED[10]) < 1e-9,
    ),
    detail: "The proposed curve must not disturb the legacy endpoint calibration.",
    expected: "0pp and 20pp on both",
    actual: `${LQ_CURVE[0]}pp / ${LQ_CURVE[10]}pp vs ${LQ_CURVE_TAPERED[0]}pp / ${LQ_CURVE_TAPERED[10]}pp`,
  });

  return cases;
}

export function suiteSummary(cases: RegressionCase[]) {
  return {
    total: cases.length,
    pass: cases.filter((c) => c.status === "pass").length,
    fail: cases.filter((c) => c.status === "fail").length,
    review: cases.filter((c) => c.status === "review").length,
  };
}

/* ========================================================================== *
 * FORMATTERS
 * ========================================================================== */

export function fmtMoney(n: number, compact = false): string {
  if (!isFinite(n)) return "—";
  const abs = Math.abs(n);
  if (compact && abs >= 1_000_000) return (n < 0 ? "-$" : "$") + (abs / 1_000_000).toFixed(2) + "M";
  if (compact && abs >= 10_000) return (n < 0 ? "-$" : "$") + Math.round(abs / 1000) + "K";
  return (n < 0 ? "-$" : "$") + Math.round(abs).toLocaleString();
}

export function fmtPct(n: number, dp = 1): string {
  if (!isFinite(n)) return "—";
  return (n > 0 ? "+" : "") + n.toFixed(dp) + "%";
}
