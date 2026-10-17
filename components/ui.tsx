"use client";

import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";

export function cx(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(" ");
}

type Tone = "primary" | "quiet" | "danger" | "stamp";

export function Button({ tone = "primary", className, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { tone?: Tone }) {
  return (
    <button
      {...rest}
      className={cx(
        "inline-flex items-center justify-center gap-2 rounded-md px-3.5 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-45",
        tone === "primary" && "bg-survey text-panel hover:brightness-110",
        tone === "quiet" && "border border-line bg-panel text-ink hover:border-granite",
        tone === "danger" && "border border-red/40 bg-red-soft text-red hover:border-red",
        tone === "stamp" && "bg-stamp text-panel hover:brightness-110",
        className,
      )}
    />
  );
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cx("w-full rounded-md border border-line bg-panel px-3 py-2 text-sm text-ink placeholder:text-granite/70", props.className)} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={cx("w-full rounded-md border border-line bg-panel px-3 py-2 text-sm text-ink", props.className)} />;
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-ink">{label}</span>
      {children}
      {hint && <span className="block text-xs text-granite">{hint}</span>}
    </label>
  );
}

type BadgeTone = "survey" | "stamp" | "amber" | "red" | "plain";

export function Badge({ tone = "plain", children }: { tone?: BadgeTone; children: ReactNode }) {
  return (
    <span
      className={cx(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap",
        tone === "survey" && "bg-survey-soft text-survey",
        tone === "stamp" && "bg-stamp-soft text-stamp",
        tone === "amber" && "bg-amber-soft text-amber",
        tone === "red" && "bg-red-soft text-red",
        tone === "plain" && "border border-line text-granite",
      )}
    >
      {children}
    </span>
  );
}

export function Panel({ title, action, children, className }: { title?: ReactNode; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cx("rounded-lg border border-line bg-panel", className)}>
      {(title || action) && (
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3.5">
          {title && <h2 className="text-base font-bold">{title}</h2>}
          {action}
        </header>
      )}
      <div className="p-5">{children}</div>
    </section>
  );
}

export function Figure({ value, label, sub }: { value: ReactNode; label: string; sub?: ReactNode }) {
  return (
    <div className="min-w-0">
      <div className="text-sm text-granite">{label}</div>
      <div className="tabular mt-0.5 text-2xl font-bold" style={{ fontStretch: "88%" }}>{value}</div>
      {sub && <div className="mt-0.5 text-xs text-granite">{sub}</div>}
    </div>
  );
}

export function Hash({ value, n = 10 }: { value: string; n?: number }) {
  return (
    <code className="font-mono text-[12px] text-granite" title={value}>
      {value.slice(0, n)}…{value.slice(-4)}
    </code>
  );
}

export function Meter({ value, tone = "survey" }: { value: number; tone?: "survey" | "amber" | "red" }) {
  const w = Math.max(0, Math.min(1, value)) * 100;
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-line/70" role="meter" aria-valuenow={Math.round(w)} aria-valuemin={0} aria-valuemax={100}>
      <div className={cx("h-full rounded-full", tone === "survey" && "bg-survey", tone === "amber" && "bg-amber", tone === "red" && "bg-red")} style={{ width: `${w}%` }} />
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="rounded-md border border-dashed border-line px-4 py-6 text-center text-sm text-granite">{children}</p>;
}

/** Rubber-stamp seal shown when the ledger verifies. */
export function Seal({ ok, entries, animate }: { ok: boolean; entries: number; animate?: boolean }) {
  const color = ok ? "var(--stamp)" : "var(--red)";
  const top = ok ? "LEDGER VERIFIED" : "LEDGER BROKEN";
  return (
    <svg viewBox="0 0 120 120" className={cx("h-24 w-24 shrink-0", animate && "stamp-land")} style={{ transform: "rotate(-11deg)" }} aria-hidden>
      <defs>
        <path id={`arc-${ok}`} d="M 60 60 m -42 0 a 42 42 0 1 1 84 0 a 42 42 0 1 1 -84 0" />
      </defs>
      <circle cx="60" cy="60" r="56" fill="none" stroke={color} strokeWidth="3" />
      <circle cx="60" cy="60" r="34" fill="none" stroke={color} strokeWidth="1.5" />
      <text fill={color} fontSize="10" fontWeight="700" fontFamily="var(--font-sans)">
        <textPath href={`#arc-${ok}`} textLength={252} lengthAdjust="spacing">{top} • SHA-256 •</textPath>
      </text>
      <text x="60" y="58" textAnchor="middle" fill={color} fontSize="20" fontWeight="800" fontFamily="var(--font-sans)">{ok ? "✓" : "✗"}</text>
      <text x="60" y="76" textAnchor="middle" fill={color} fontSize="10" fontWeight="700" fontFamily="var(--font-sans)">{entries} entries</text>
    </svg>
  );
}
