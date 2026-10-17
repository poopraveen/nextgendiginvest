"use client";

import Link from "next/link";
import { useState } from "react";
import { useStore } from "../store";
import { Badge, Button, Empty, Field, Input, Panel, Select } from "../ui";
import { fmtDate, parseRupees, usePermissions } from "./shared";
import { approveTicket, completeTicket, raiseTicket, RuleError } from "@/lib/actions";
import { inr } from "@/lib/finance";
import type { Project, TicketStatus } from "@/lib/types";

const STATUS: Record<TicketStatus, { label: string; tone: "plain" | "amber" | "stamp" | "survey" | "red" }> = {
  open: { label: "Waiting for approval", tone: "amber" },
  awaiting_vote: { label: "Partners voting", tone: "stamp" },
  approved: { label: "Approved — work in progress", tone: "amber" },
  done: { label: "Fixed and paid", tone: "survey" },
  rejected: { label: "Not approved", tone: "red" },
};

export function UpkeepTab({ p }: { p: Project }) {
  const { run } = useStore();
  const can = usePermissions(p);
  const [title, setTitle] = useState("");
  const [estimate, setEstimate] = useState("");
  const [unitId, setUnitId] = useState("");
  const [finals, setFinals] = useState<Record<string, string>>({});

  const raise = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseRupees(estimate);
    const ok = run(p.id, (x) => {
      if (Number.isNaN(amt) || amt <= 0) throw new RuleError("Enter an estimate in rupees, like 6000");
      return raiseTicket(x, title, amt, can.actor, unitId || undefined);
    }, amt > p.settings.autoApproveLimit ? "Ticket raised — over the limit, so a partner vote has opened" : "Ticket raised");
    if (ok) { setTitle(""); setEstimate(""); setUnitId(""); }
  };

  const tickets = [...p.tickets].reverse();

  return (
    <div className="space-y-6">
      <Panel title="Approval rules">
        <ul className="grid gap-3 text-sm sm:grid-cols-3">
          <li><strong>Up to {inr(p.settings.autoApproveLimit)}</strong><br /><span className="text-granite">Operator approves and fixes.</span></li>
          <li><strong>Above {inr(p.settings.autoApproveLimit)}</strong><br /><span className="text-granite">Partners vote, more than {p.settings.ordinaryThreshold}% of ownership needed.</span></li>
          <li><strong>Every job</strong><br /><span className="text-granite">Before and after photos and the bill, or it cannot be closed.</span></li>
        </ul>
      </Panel>

      {can.raise && (
        <Panel title="Report a problem">
          <form onSubmit={raise} className="grid gap-4 md:grid-cols-[1fr_180px_180px_auto] md:items-end">
            <Field label="What needs fixing">
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Leaking tap in Room 203" required />
            </Field>
            <Field label="Estimate (₹)">
              <Input inputMode="decimal" value={estimate} onChange={(e) => setEstimate(e.target.value)} placeholder="4,500" required />
            </Field>
            <Field label="Unit">
              <Select value={unitId} onChange={(e) => setUnitId(e.target.value)}>
                <option value="">Common area</option>
                {p.units.map((u) => <option key={u.id} value={u.id}>{u.label}</option>)}
              </Select>
            </Field>
            <Button type="submit">Raise ticket</Button>
          </form>
        </Panel>
      )}

      <Panel title={`Tickets · ${p.tickets.length}`}>
        {!tickets.length && <Empty>No repairs yet. Tickets raised by tenants, partners or the operator will appear here.</Empty>}
        <ul className="divide-y divide-line">
          {tickets.map((t) => {
            const s = STATUS[t.status];
            const unit = p.units.find((u) => u.id === t.unitId);
            return (
              <li key={t.id} className="py-4 first:pt-0 last:pb-0">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold">{t.title}</div>
                    <div className="text-sm text-granite">
                      {t.id} · {unit?.label ?? "Common area"} · raised by {t.raisedBy} on {fmtDate(t.createdAt)}
                    </div>
                  </div>
                  <Badge tone={s.tone}>{s.label}</Badge>
                </div>
                <div className="tabular mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm">
                  <span>Estimate {inr(t.estimate)}</span>
                  {t.finalCost !== undefined && <span>Final bill {inr(t.finalCost)}</span>}
                  <span className="text-granite">{t.beforePhotos} before · {t.afterPhotos} after photos · {t.billAttached ? "bill attached" : "no bill yet"}</span>
                  {t.approvedBy && <span className="text-granite">Approved by {t.approvedBy}</span>}
                </div>
                <div className="mt-3 flex flex-wrap items-end gap-3">
                  {t.status === "awaiting_vote" && t.voteId && (
                    <Link href={`?tab=votes#${t.voteId}`} className="text-sm font-semibold text-stamp underline underline-offset-2">Go to the vote</Link>
                  )}
                  {can.operate && t.status === "open" && (
                    <Button tone="quiet" onClick={() => run(p.id, (x) => approveTicket(x, t.id, can.actor), "Repair approved")}>Approve repair</Button>
                  )}
                  {can.operate && t.status === "approved" && (
                    <form
                      className="flex flex-wrap items-end gap-3"
                      onSubmit={(e) => {
                        e.preventDefault();
                        const amt = parseRupees(finals[t.id] ?? "");
                        run(p.id, (x) => {
                          if (Number.isNaN(amt)) throw new RuleError("Enter the final bill amount");
                          return completeTicket(x, t.id, amt, can.actor);
                        }, "Repair closed and paid");
                      }}
                    >
                      <label className="block text-sm">
                        <span className="mb-1 block text-granite">Final bill (₹)</span>
                        <Input className="w-36" value={finals[t.id] ?? ""} onChange={(e) => setFinals({ ...finals, [t.id]: e.target.value })} placeholder={String(t.estimate / 100)} />
                      </label>
                      <Button type="submit">Upload bill and close</Button>
                    </form>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </Panel>
    </div>
  );
}
