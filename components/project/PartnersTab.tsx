"use client";

import { Badge, Meter, Panel, cx } from "../ui";
import { usePermissions } from "./shared";
import { capTable, inr, pct } from "@/lib/finance";
import type { Project } from "@/lib/types";

export function PartnersTab({ p }: { p: Project }) {
  const can = usePermissions(p);
  const rows = capTable(p.partners, p.ledger);
  const payouts = new Map<string, number>();
  p.ledger.filter((e) => e.type === "distribution" && e.partnerId).forEach((e) => payouts.set(e.partnerId!, (payouts.get(e.partnerId!) ?? 0) + e.amount));
  const committed = p.partners.reduce((s, x) => s + x.committed, 0);
  const paid = rows.reduce((s, r) => s + r.paid, 0);
  const s = p.settings;

  return (
    <div className="space-y-6">
      <Panel title="Who owns what">
        <div className="mb-5 space-y-1.5">
          <div className="flex flex-wrap justify-between gap-2 text-sm">
            <span className="text-granite">Committed {inr(committed, true)} · paid {inr(paid, true)} · project cost {inr(p.targetCapital, true)}</span>
            <span className="font-semibold">{pct(committed / p.targetCapital, 0)} committed</span>
          </div>
          <Meter value={committed / p.targetCapital} />
        </div>
        <div className="-mx-5 overflow-x-auto">
          <table className="tabular w-full min-w-[680px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-granite">
                <th className="px-5 py-2 font-medium">Partner</th>
                <th className="py-2 font-medium">KYC</th>
                <th className="py-2 text-right font-medium">Committed</th>
                <th className="py-2 text-right font-medium">Paid in</th>
                <th className="py-2 text-right font-medium">Ownership</th>
                <th className="px-5 py-2 text-right font-medium">Payouts received</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const partner = p.partners.find((x) => x.id === r.partnerId)!;
                return (
                  <tr key={r.partnerId} className={cx("border-b border-line/70", r.partnerId === can.partnerId && can.role !== "auditor" && "bg-survey-soft/60")}>
                    <td className="px-5 py-2.5">
                      <span className="font-medium">{r.name}</span>
                      {partner.isOperator && <span className="ml-2 text-xs text-granite">operator</span>}
                      <div className="text-xs text-granite">{partner.city}</div>
                    </td>
                    <td className="py-2.5"><Badge tone={partner.kyc === "verified" ? "survey" : "amber"}>{partner.kyc === "verified" ? "Verified" : "Pending"}</Badge></td>
                    <td className="py-2.5 text-right">{inr(r.committed)}</td>
                    <td className="py-2.5 text-right">{inr(r.paid)}</td>
                    <td className="py-2.5 text-right font-semibold">{r.paid ? pct(r.share, 2) : "—"}</td>
                    <td className="px-5 py-2.5 text-right">{inr(payouts.get(r.partnerId) ?? 0)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel title="Key terms of the partnership agreement">
        <dl className="grid gap-x-10 gap-y-4 text-sm sm:grid-cols-2">
          <Term k="Structure" v={`${p.name} LLP — one company per building, land registered in its name`} />
          <Term k="Returns" v="Not guaranteed. Profit and loss shared by capital paid in." />
          <Term k="Operator fees" v={`Setup 1.5% of project cost · construction 6% per verified milestone · ${s.mgmtFeePct}% of rent collected`} />
          <Term k="Repair reserve" v={`${s.reservePct}% of rent, capped at 6 months of rent`} />
          <Term k="Repairs" v={`Operator approves up to ${inr(s.autoApproveLimit)}; above that, partners vote`} />
          <Term k="Bank payments" v={`Two signatures above ${inr(s.dualSignAbove)}`} />
          <Term k="Ordinary decisions" v={`More than ${s.ordinaryThreshold}% of ownership`} />
          <Term k="Special decisions" v={`At least ${s.specialThreshold}% — sale, loans, new partner, change operator`} />
          <Term k="Lock-in" v={`${s.lockInYears} years from completion, then other partners get first right to buy`} />
          <Term k="Disputes" v="Arbitration, seat Bengaluru" />
        </dl>
        <p className="mt-5 text-sm">
          Full template:{" "}
          <a className="font-semibold text-survey underline underline-offset-2" href="https://github.com/poopraveen/nextgendiginvest/blob/main/docs/AGREEMENT_TEMPLATE.md" target="_blank" rel="noreferrer">
            AGREEMENT_TEMPLATE.md
          </a>{" "}
          <span className="text-granite">— to be finalised by a lawyer before use.</span>
        </p>
      </Panel>
    </div>
  );
}

function Term({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <dt className="text-granite">{k}</dt>
      <dd className="font-medium">{v}</dd>
    </div>
  );
}
