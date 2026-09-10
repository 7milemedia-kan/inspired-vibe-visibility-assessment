/**
 * The hand-off between the Authority Score result and the Impact model.
 *
 * Contact details are never put in the URL. They go to the server on submit
 * and nothing more. What travels to the calculator is the scan context plus a
 * capability token, held in a module-level variable — in memory only.
 *
 * Why not sessionStorage: the hosted preview runs the app in a sandboxed
 * iframe with an opaque origin, where sessionStorage throws. Since the score
 * result and the model are two routes of one SPA and the hand-off is a
 * client-side navigation, module state survives the trip anyway. A hard
 * reload of the model page loses the company name and the lead linkage and
 * falls back to the ?score= parameter, which is the correct degradation:
 * the number is public, the linkage is not.
 *
 * The URL still carries ?score= on its own. That makes the calculator
 * shareable and directly linkable, which is the whole point of leaving it
 * open: the form is an offer, not a toll gate.
 */

let current: Handoff | null = null;

export interface Handoff {
  /** Row id in the scans table that produced this score. */
  scanId: number | null;
  score: number;
  band: string;
  company: string;
  domain: string;
  /** Present only once contact details have been submitted. */
  leadId: number | null;
  leadToken: string | null;
}

export function saveHandoff(h: Handoff): void {
  current = h;
}

export function readHandoff(): Handoff | null {
  return current && typeof current.score === "number" ? current : null;
}

export function clearHandoff(): void {
  current = null;
}

/**
 * Reads a query parameter. The app runs on a hash router, so parameters can
 * sit after the hash (#/impact?score=7) or before it (?score=7#/impact)
 * depending on how the link was built. Both are accepted.
 */
export function readParam(name: string): string | null {
  const hash = window.location.hash;
  const q = hash.indexOf("?");
  if (q !== -1) {
    const fromHash = new URLSearchParams(hash.slice(q + 1)).get(name);
    if (fromHash !== null) return fromHash;
  }
  return new URLSearchParams(window.location.search).get(name);
}

export function readScoreParam(): number | null {
  const raw = readParam("score");
  const n = raw === null ? NaN : parseInt(raw, 10);
  return Number.isFinite(n) ? Math.min(10, Math.max(0, n)) : null;
}
