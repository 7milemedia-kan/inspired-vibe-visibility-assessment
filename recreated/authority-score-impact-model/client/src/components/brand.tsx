import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { TIERS, tierFor, type TierName } from "@shared/impact-model";

/* ========================================================================== *
 * LOGO — ascending bars crossed by a rising vector.
 * Monochrome, uses currentColor, legible at 24px.
 * ========================================================================== */
export function Logo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      aria-label="Authority Impact Model"
      className={className}
      data-testid="img-logo"
    >
      <rect x="2" y="21" width="5" height="9" rx="1" fill="currentColor" opacity="0.35" />
      <rect x="10" y="15" width="5" height="15" rx="1" fill="currentColor" opacity="0.6" />
      <rect x="18" y="9" width="5" height="21" rx="1" fill="currentColor" opacity="0.85" />
      <rect x="26" y="3" width="5" height="27" rx="1" fill="currentColor" />
      <path
        d="M1 19.5 L9.5 13 L17.5 7.5 L28 1.5"
        stroke="currentColor"
        strokeWidth="2.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* ========================================================================== *
 * TYPE — Balboa display headings and Montserrat body copy, matching inspiredvibe.com.
 * ========================================================================== */
export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground", className)}>
      {children}
    </div>
  );
}

export function SectionHeading({
  children,
  eyebrow,
  note,
  className,
}: {
  children: ReactNode;
  eyebrow?: ReactNode;
  note?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-5", className)}>
      {eyebrow ? <Eyebrow className="mb-1.5">{eyebrow}</Eyebrow> : null}
      <h2 className="text-lg font-extrabold uppercase tracking-tight text-foreground">{children}</h2>
      {note ? <p className="mt-1.5 max-w-3xl text-[13px] leading-relaxed text-muted-foreground">{note}</p> : null}
    </div>
  );
}

export function Panel({
  children,
  className,
  flush = false,
}: {
  children: ReactNode;
  className?: string;
  flush?: boolean;
}) {
  return (
    <section
      className={cn(
        "rounded-lg border border-card-border bg-card",
        flush ? "" : "p-5 sm:p-6",
        className,
      )}
    >
      {children}
    </section>
  );
}

/* ========================================================================== *
 * TIER BADGE
 * ========================================================================== */
const TIER_STYLE: Record<TierName, string> = {
  Invisible: "bg-muted text-muted-foreground border-border",
  Minimal: "bg-brand-warm/25 text-foreground border-brand-warm/50",
  Emerging: "bg-brand-teal/10 text-brand-navy border-brand-teal/25",
  Established: "bg-brand-teal/15 text-brand-navy border-brand-teal/40",
  Dominant: "bg-brand-navy text-white border-brand-navy",
};

export function TierBadge({ score, className }: { score: number; className?: string }) {
  const tier = tierFor(score);
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-sm border px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em]",
        TIER_STYLE[tier],
        className,
      )}
      data-testid={`badge-tier-${score}`}
    >
      {tier}
    </span>
  );
}

/* ========================================================================== *
 * SCORE STEPPER — 11 whole points. A segmented control, not a slider: the
 * curves are indexed by integer and the UI should not imply otherwise.
 * ========================================================================== */
export function ScoreStepper({
  label,
  value,
  onChange,
  accent,
  min = 0,
  testId,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  accent: "teal" | "red";
  min?: number;
  testId: string;
}) {
  const activeCls =
    accent === "red"
      ? "bg-brand-red text-white border-brand-red"
      : "bg-brand-teal text-brand-navy border-brand-teal";
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <Eyebrow className="text-white/55">{label}</Eyebrow>
        <div className="flex items-center gap-2">
          <span
            className="text-xl font-extrabold tabular-nums leading-none text-white"
            data-testid={`text-${testId}-value`}
          >
            {value}
          </span>
          <TierBadge score={value} />
        </div>
      </div>
      <div className="grid grid-cols-11 gap-1" role="group" aria-label={label}>
        {Array.from({ length: 11 }, (_, i) => i).map((i) => {
          const disabled = i < min;
          const active = i === value;
          return (
            <button
              key={i}
              type="button"
              disabled={disabled}
              aria-pressed={active}
              aria-label={`${label} ${i}`}
              onClick={() => onChange(i)}
              data-testid={`button-${testId}-${i}`}
              className={cn(
                "h-8 rounded-sm border text-[12px] font-bold tabular-nums transition-colors",
                active
                  ? activeCls
                  : disabled
                    ? "cursor-not-allowed border-white/10 bg-white/[0.03] text-white/20"
                    : "border-white/20 bg-white/[0.06] text-white/70 hover:border-white/40 hover:bg-white/[0.12]",
              )}
            >
              {i}
            </button>
          );
        })}
      </div>
      <div className="mt-1.5 flex justify-between text-[9px] font-semibold uppercase tracking-[0.08em] text-white/35">
        {TIERS.map((t) => (
          <span key={t.name}>{t.name}</span>
        ))}
      </div>
    </div>
  );
}

/* ========================================================================== *
 * NUMERIC INPUT
 * ========================================================================== */
export function NumberField({
  label,
  value,
  onChange,
  prefix,
  suffix,
  step = 1,
  min = 0,
  max,
  testId,
  hint,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  prefix?: string;
  suffix?: string;
  step?: number;
  min?: number;
  max?: number;
  testId: string;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
        {label}
      </span>
      <span className="relative flex items-center">
        {prefix ? (
          <span className="pointer-events-none absolute left-2.5 text-[13px] font-semibold text-muted-foreground">
            {prefix}
          </span>
        ) : null}
        <input
          type="number"
          value={Number.isFinite(value) ? value : ""}
          step={step}
          min={min}
          max={max}
          onChange={(e) => {
            const n = parseFloat(e.target.value);
            onChange(Number.isFinite(n) ? n : 0);
          }}
          data-testid={`input-${testId}`}
          className={cn(
            "h-9 w-full rounded-sm border border-input bg-background text-[14px] font-semibold tabular-nums text-foreground",
            "outline-none transition-colors focus:border-brand-teal focus:ring-2 focus:ring-brand-teal/20",
            prefix ? "pl-6" : "pl-2.5",
            suffix ? "pr-9" : "pr-2.5",
          )}
        />
        {suffix ? (
          <span className="pointer-events-none absolute right-2.5 text-[12px] font-semibold text-muted-foreground">
            {suffix}
          </span>
        ) : null}
      </span>
      {hint ? <span className="mt-1 block text-[11px] leading-snug text-muted-foreground">{hint}</span> : null}
    </label>
  );
}

/* ========================================================================== *
 * STAT CARD
 * ========================================================================== */
export function StatCard({
  label,
  value,
  delta,
  tone = "neutral",
  footnote,
  testId,
  large = false,
}: {
  label: string;
  value: string;
  delta?: string;
  tone?: "neutral" | "positive" | "negative" | "action";
  footnote?: string;
  testId: string;
  large?: boolean;
}) {
  const valueTone =
    tone === "action"
      ? "text-brand-red"
      : tone === "positive"
        ? "text-brand-teal"
        : tone === "negative"
          ? "text-brand-red"
          : "text-foreground";
  return (
    <div className="rounded-lg border border-card-border bg-card p-4" data-testid={`card-${testId}`}>
      <div className="text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground">{label}</div>
      <div
        className={cn(
          "mt-1.5 font-extrabold tabular-nums leading-none tracking-tight",
          large ? "text-2xl sm:text-3xl" : "text-xl sm:text-2xl",
          valueTone,
        )}
        data-testid={`text-${testId}`}
      >
        {value}
      </div>
      {delta ? (
        <div
          className={cn(
            "mt-1.5 text-[12px] font-bold tabular-nums",
            tone === "negative" ? "text-brand-red" : "text-brand-teal",
          )}
        >
          {delta}
        </div>
      ) : null}
      {footnote ? <div className="mt-1.5 text-[11px] leading-snug text-muted-foreground">{footnote}</div> : null}
    </div>
  );
}

/* ========================================================================== *
 * STATUS PILL
 * ========================================================================== */
export function StatusPill({
  status,
  children,
  className,
}: {
  status: "pass" | "fail" | "review";
  children: ReactNode;
  className?: string;
}) {
  const map = {
    pass: "bg-brand-teal/12 text-brand-navy border-brand-teal/35",
    fail: "bg-brand-red/12 text-brand-red border-brand-red/35",
    review: "bg-brand-warm/25 text-foreground border-brand-warm/60",
  };
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-sm border px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em]",
        map[status],
        className,
      )}
    >
      {children}
    </span>
  );
}

/* ========================================================================== *
 * TABLE PRIMITIVES
 * ========================================================================== */
export function DataTable({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("-mx-5 overflow-x-auto sm:-mx-6", className)}>
      <div className="inline-block min-w-full px-5 sm:px-6">
        <table className="w-full border-collapse text-[13px]">{children}</table>
      </div>
    </div>
  );
}

export function Th({
  children,
  align = "left",
  className,
}: {
  children?: ReactNode;
  align?: "left" | "right" | "center";
  className?: string;
}) {
  return (
    <th
      className={cn(
        "whitespace-nowrap border-b border-border px-3 pb-2 pt-0 text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground first:pl-0 last:pr-0",
        align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left",
        className,
      )}
    >
      {children}
    </th>
  );
}

export function Td({
  children,
  align = "left",
  className,
  testId,
}: {
  children?: ReactNode;
  align?: "left" | "right" | "center";
  className?: string;
  testId?: string;
}) {
  return (
    <td
      data-testid={testId}
      className={cn(
        "whitespace-nowrap border-b border-border/60 px-3 py-2.5 first:pl-0 last:pr-0",
        align === "right" ? "text-right tabular-nums" : align === "center" ? "text-center tabular-nums" : "text-left",
        className,
      )}
    >
      {children}
    </td>
  );
}
