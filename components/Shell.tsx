"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useStore } from "./store";
import { cx } from "./ui";
import { stageOf } from "@/lib/workflow";

function Mark() {
  // Survey plot outline with a corner marker: land, measured and recorded.
  return (
    <svg viewBox="0 0 32 32" className="h-8 w-8" aria-hidden>
      <rect x="3" y="3" width="26" height="26" rx="3" fill="var(--survey)" />
      <path d="M9 22 V12 L16 8 L23 12 V22 Z" fill="none" stroke="var(--panel)" strokeWidth="2" strokeLinejoin="round" />
      <path d="M13 22 V16 H19 V22" fill="none" stroke="var(--panel)" strokeWidth="2" />
      <circle cx="25" cy="25" r="4.5" fill="var(--stamp)" stroke="var(--panel)" strokeWidth="1.5" />
    </svg>
  );
}

export function Shell({ children }: { children: ReactNode }) {
  const { projects, viewer, setViewer, notice, clearNotice, resetDemo } = useStore();
  const path = usePathname();

  const partners = new Map<string, string>();
  projects.forEach((p) => p.partners.forEach((x) => !x.isOperator && partners.set(x.id, x.name)));

  const nav = [
    { href: "/", label: "Portfolio" },
    ...projects.map((p) => ({ href: `/projects/${p.id}`, label: p.name, sub: `Stage ${p.stage} · ${stageOf(p.stage).name}` })),
    { href: "/verify", label: "Check a document" },
    { href: "/how-it-works", label: "How it works" },
  ];

  const viewerValue = viewer.role === "partner" ? `partner:${viewer.partnerId}` : viewer.role;

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[264px_1fr]">
      <aside className="border-b border-line bg-panel lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col lg:border-r lg:border-b-0">
        <div className="flex items-center gap-3 px-5 py-4">
          <Mark />
          <div>
            <div className="font-bold leading-tight" style={{ fontStretch: "88%" }}>NextGen DigInvest</div>
            <div className="text-xs text-granite">Co-owned rental buildings</div>
          </div>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-1 lg:flex-col lg:overflow-y-auto lg:pb-0">
          {nav.map((n) => {
            const active = n.href === "/" ? path === "/" : path.startsWith(n.href);
            return (
              <Link
                key={n.href}
                href={n.href}
                className={cx(
                  "shrink-0 rounded-md px-3 py-2 text-sm lg:shrink",
                  active ? "bg-survey-soft font-semibold text-survey" : "text-ink hover:bg-paper",
                )}
              >
                <span className="block whitespace-nowrap lg:whitespace-normal">{n.label}</span>
                {"sub" in n && n.sub && <span className="hidden text-xs font-normal text-granite lg:block">{n.sub}</span>}
              </Link>
            );
          })}
        </nav>
        <div className="space-y-2 border-t border-line px-5 py-4">
          <label htmlFor="viewer" className="text-xs text-granite">Viewing as</label>
          <select
            id="viewer"
            value={viewerValue}
            onChange={(e) => {
              const v = e.target.value;
              if (v === "operator") setViewer({ role: "operator", partnerId: "p1" });
              else if (v === "auditor") setViewer({ role: "auditor", partnerId: "" });
              else setViewer({ role: "partner", partnerId: v.split(":")[1] });
            }}
            className="w-full rounded-md border border-line bg-panel px-2.5 py-1.5 text-sm"
          >
            <option value="operator">Operator — Praveen Kumar</option>
            {[...partners].map(([id, name]) => (
              <option key={id} value={`partner:${id}`}>Partner — {name}</option>
            ))}
            <option value="auditor">CA auditor (read only)</option>
          </select>
          <button onClick={resetDemo} className="text-xs text-granite underline underline-offset-2 hover:text-ink">Reset demo data</button>
        </div>
      </aside>
      <main className="min-w-0 px-4 py-6 sm:px-8 lg:py-8">{children}</main>
      {notice && (
        <div role="status" className="fixed inset-x-4 bottom-4 z-50 flex justify-center sm:inset-x-auto sm:right-6">
          <button
            onClick={clearNotice}
            className={cx(
              "max-w-md rounded-lg border px-4 py-3 text-left text-sm font-medium shadow-lg",
              notice.kind === "ok" ? "border-survey/30 bg-survey-soft text-survey" : "border-red/30 bg-red-soft text-red",
            )}
          >
            {notice.text}
          </button>
        </div>
      )}
    </div>
  );
}
