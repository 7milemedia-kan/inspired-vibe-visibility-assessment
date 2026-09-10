import { useState } from "react";
import { ArrowRight, Check, Loader2, Lock } from "lucide-react";
import { API_BASE } from "@/lib/queryClient";
import { cn } from "@/lib/utils";

/* ==========================================================================
 * CONTACT CAPTURE
 *
 * Sits inside the Authority Score result and hands off to the Impact model.
 *
 * The model route stays reachable for anyone holding the link — it is a
 * shareable asset, not a vault. But this form is the only way through from a
 * score, and there is no visible bypass. Offering one taught every visitor
 * that the ask was optional, and almost all of them took the exit.
 *
 * So the form has to earn the details rather than extract them. It sells the
 * written follow-up: the model on screen is directional, the summary we send
 * back is specific to their scan. That is an honest trade, and an honest
 * trade is the only kind that survives a buyer reading it twice.
 * ========================================================================== */

export interface CaptureContext {
  scanId: number | null;
  score: number;
  band: string;
  company: string;
  domain: string;
}

export interface CaptureResult {
  leadId: number;
  leadToken: string;
}

interface Props {
  ctx: CaptureContext;
  onDone: (r: CaptureResult) => void;
}

type Errors = Partial<Record<"fullName" | "email" | "company" | "phone" | "form", string>>;

export function Capture({ ctx, onDone }: Props) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  // The contact belongs to the visitor; the scanned company is their competitor.
  const [company, setCompany] = useState("");
  const [phone, setPhone] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setErrors({});
    try {
      const res = await fetch(`${API_BASE}/api/lead`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          fullName,
          email,
          company,
          phone,
          scanId: ctx.scanId,
          score: ctx.score,
          band: ctx.band,
          domain: ctx.domain,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErrors({ ...(data.fields ?? {}), form: data.fields ? undefined : data.error });
        return;
      }
      onDone({ leadId: data.id, leadToken: data.token });
    } catch {
      setErrors({ form: "Network trouble. Try that again." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="mt-4 overflow-hidden rounded-xl border border-brand-red/30 bg-card"
      data-testid="section-capture"
    >
      <div className="border-b border-brand-red/20 bg-brand-red/[0.04] px-6 py-5 sm:px-8">
        <div className="font-mono text-[0.65rem] uppercase tracking-[0.18em] text-brand-red">
          Next: what it's worth
        </div>
        <h3
          className="mt-2 font-bold leading-[1.15] tracking-tight"
          style={{ fontSize: "clamp(1.375rem, 3.6vw, 1.75rem)" }}
          data-testid="text-capture-headline"
        >
          This competitor scored a {ctx.score}. What could a stronger authority score mean for them?
        </h3>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
          Enter your contact details to explore a revenue scenario for this competitor.
          Use estimates of their annual deal volume and average deal size;
          the model does not discover or verify their revenue.
        </p>
      </div>

      <form onSubmit={submit} className="px-6 py-6 sm:px-8" noValidate>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field
            label="Full name"
            value={fullName}
            onChange={setFullName}
            error={errors.fullName}
            autoComplete="name"
            testId="input-name"
          />
          <Field
            label="Work email"
            value={email}
            onChange={setEmail}
            error={errors.email}
            type="email"
            autoComplete="email"
            testId="input-email"
          />
          <Field
            label="Your company"
            value={company}
            onChange={setCompany}
            error={errors.company}
            autoComplete="organization"
            testId="input-company"
          />
          <Field
            label="Phone"
            value={phone}
            onChange={setPhone}
            error={errors.phone}
            type="tel"
            autoComplete="tel"
            optional
            testId="input-phone"
          />
        </div>

        {errors.form && (
          <div
            className="mt-4 rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm font-medium text-destructive"
            data-testid="text-capture-error"
          >
            {errors.form}
          </div>
        )}

        <div className="mt-6">
          <button
            type="submit"
            disabled={busy}
            data-testid="button-capture-submit"
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-brand-red px-6 text-[0.8125rem] font-bold uppercase tracking-wide text-white transition-opacity hover:opacity-90 disabled:opacity-60 sm:w-auto sm:text-sm sm:tracking-wider"
          >
            {busy ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2.5} />
                Saving…
              </>
            ) : (
              <>
                {/* Short label on narrow screens: the full one wraps to two
                    lines at 375px and the CTA loses its punch. */}
                <span className="sm:hidden">Show me the number</span>
                <span className="hidden sm:inline">Show me the revenue model</span>
                <ArrowRight className="h-4 w-4 shrink-0" strokeWidth={2.5} />
              </>
            )}
          </button>
        </div>

        <p className="mt-5 flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
          <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={2} />
          <span>
            Your details are used to follow up about this competitor assessment. Not sold, not shared,
            not added to a newsletter list.
          </span>
        </p>
      </form>
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function Field({
  label,
  value,
  onChange,
  error,
  type = "text",
  autoComplete,
  optional,
  testId,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  type?: string;
  autoComplete?: string;
  optional?: boolean;
  testId: string;
}) {
  const id = `field-${testId}`;
  return (
    <div>
      <label
        htmlFor={id}
        className="flex items-baseline justify-between gap-2 font-mono text-[0.65rem] uppercase tracking-[0.18em] text-muted-foreground"
      >
        <span>{label}</span>
        {optional && <span className="tracking-[0.1em] text-muted-foreground/70">Optional</span>}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        data-testid={testId}
        className={cn(
          "mt-1.5 h-11 w-full rounded-lg border bg-background px-3.5 text-[0.9375rem] font-medium text-foreground outline-none transition-colors placeholder:text-muted-foreground/60",
          error
            ? "border-destructive focus:border-destructive"
            : "border-input focus:border-brand-teal",
        )}
      />
      {error && (
        <p
          id={`${id}-error`}
          className="mt-1.5 text-xs font-medium text-destructive"
          data-testid={`${testId}-error`}
        >
          {error}
        </p>
      )}
    </div>
  );
}

/** Shown in place of the form once details are in, before the redirect. */
export function CaptureDone() {
  return (
    <div
      className="mt-4 flex items-start gap-3 rounded-xl border border-primary/40 bg-primary/5 px-6 py-5 sm:px-8"
      data-testid="section-capture-done"
    >
      <Check className="mt-0.5 h-5 w-5 shrink-0 text-primary" strokeWidth={2.5} />
      <div>
        <div className="text-sm font-bold">Got it. Opening the competitor revenue scenario.</div>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          Explore the scenario using estimates for the competitor’s business.
        </p>
      </div>
    </div>
  );
}
