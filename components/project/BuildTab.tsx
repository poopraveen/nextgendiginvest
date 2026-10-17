"use client";

import { useState } from "react";
import { useStore } from "../store";
import { Badge, Button, Empty, Figure, Input, Meter, Panel } from "../ui";
import { parseRupees, usePermissions } from "./shared";
import { payMilestone, RuleError, submitEvidence, verifyMilestone } from "@/lib/actions";
import { inr, pct } from "@/lib/finance";
import type { Milestone, Project } from "@/lib/types";

const STATUS: Record<Milestone["status"], { label: string; tone: "plain" | "amber" | "stamp" | "survey" }> = {
  pending: { label: "Not started", tone: "plain" },
  in_progress: { label: "In progress", tone: "amber" },
  evidence_submitted: { label: "Evidence in — needs engineer sign-off", tone: "amber" },
  verified: { label: "Verified — ready to pay", tone: "stamp" },
  paid: { label: "Paid", tone: "survey" },
};

export function BuildTab({ p }: { p: Project }) {
  const { run } = useStore();
  const can = usePermissions(p);
  const [bill, setBill] = useState<Record<string, string>>({});

  if (!p.milestones.length) return <Empty>Construction milestones are set when the contractor is approved (stage 7).</Empty>;

  const budget = p.milestones.reduce((s, m) => s + m.budget, 0);
  const spent = p.milestones.filter((m) => m.status === "paid").reduce((s, m) => s + m.actual, 0);
  const paidBudget = p.milestones.filter((m) => m.status === "paid").reduce((s, m) => s + m.budget, 0);
  const variance = spent - paidBudget;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-6 rounded-lg border border-line bg-panel p-5 md:grid-cols-4">
        <Figure label="Construction budget" value={inr(budget, true)} />
        <Figure label="Paid so far" value={inr(spent, true)} sub={pct(spent / budget, 0) + " of budget"} />
        <Figure label="Over / under on paid stages" value={(variance > 0 ? "+" : variance < 0 ? "−" : "") + inr(Math.abs(variance), true)} sub={variance > 0 ? "Over budget" : "Within budget"} />
        <Figure label="Stages paid" value={`${p.milestones.filter((m) => m.status === "paid").length} / ${p.milestones.length}`} />
      </div>

      <Panel title="Milestones">
        <p className="mb-5 max-w-2xl text-sm text-granite">
          Money is released one stage at a time. The contractor uploads site photos and the bill, the site engineer signs off, and only then can the operator pay. Each step is written to the ledger.
        </p>
        <ol className="space-y-4">
          {p.milestones.map((m, i) => {
            const s = STATUS[m.status];
            const ratio = m.actual && m.budget ? m.actual / m.budget : 0;
            return (
              <li key={m.id} className="rounded-md border border-line p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold">{i + 1}. {m.name}</div>
                    <div className="tabular text-sm text-granite">
                      Budget {inr(m.budget)}
                      {m.actual > 0 && <> · Bill {inr(m.actual)} ({ratio > 1 ? "+" : ""}{pct(ratio - 1, 1)})</>}
                    </div>
                  </div>
                  <Badge tone={s.tone}>{s.label}</Badge>
                </div>
                {m.actual > 0 && <div className="mt-3"><Meter value={Math.min(ratio, 1)} tone={ratio > 1.05 ? "red" : ratio > 1 ? "amber" : "survey"} /></div>}
                <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm">
                  <li className={m.evidence.photos ? "" : "text-granite"}>{m.evidence.photos ? "✓" : "○"} {m.evidence.photos} site photos</li>
                  <li className={m.evidence.engineerCert ? "" : "text-granite"}>{m.evidence.engineerCert ? "✓" : "○"} Engineer certificate</li>
                  <li className={m.evidence.bill ? "" : "text-granite"}>{m.evidence.bill ? "✓" : "○"} Contractor bill</li>
                  {m.verifiedBy && <li className="text-granite">Signed off by {m.verifiedBy}</li>}
                </ul>
                {can.operate && (m.status === "in_progress" || m.status === "pending") && (
                  <form
                    className="mt-4 flex flex-wrap items-end gap-3"
                    onSubmit={(e) => {
                      e.preventDefault();
                      const amt = parseRupees(bill[m.id] ?? "");
                      run(p.id, (x) => {
                        if (Number.isNaN(amt)) throw new RuleError("Enter the bill amount, like 10,80,000 or 10.8L");
                        return submitEvidence(x, m.id, can.actor, amt);
                      }, "Evidence submitted — waiting for engineer sign-off");
                    }}
                  >
                    <label className="block text-sm">
                      <span className="mb-1 block text-granite">Contractor bill (₹)</span>
                      <Input className="w-44" placeholder="10.8L" value={bill[m.id] ?? ""} onChange={(e) => setBill({ ...bill, [m.id]: e.target.value })} />
                    </label>
                    <Button tone="quiet" type="submit">Submit photos, certificate and bill</Button>
                  </form>
                )}
                {can.operate && m.status === "evidence_submitted" && (
                  <Button className="mt-4" tone="stamp" onClick={() => run(p.id, (x) => verifyMilestone(x, m.id, "Site engineer"), "Milestone verified")}>
                    Record engineer sign-off
                  </Button>
                )}
                {can.operate && m.status === "verified" && (
                  <Button className="mt-4" onClick={() => run(p.id, (x) => payMilestone(x, m.id, can.actor), `Paid ${inr(m.actual)} to contractor`)}>
                    Release {inr(m.actual)} to contractor
                  </Button>
                )}
              </li>
            );
          })}
        </ol>
      </Panel>
    </div>
  );
}
