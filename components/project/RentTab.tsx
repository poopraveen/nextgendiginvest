"use client";

import { useState } from "react";
import { useStore } from "../store";
import { Badge, Button, Empty, Figure, Input, Panel, cx } from "../ui";
import { fmtDate, usePermissions } from "./shared";
import { collectRent, runDistribution } from "@/lib/actions";
import { calcDistribution, capTable, inr, pct, rentRoll, splitByCapital } from "@/lib/finance";
import type { Project } from "@/lib/types";

export function RentTab({ p }: { p: Project }) {
  const { run } = useStore();
  const can = usePermissions(p);
  const [period, setPeriod] = useState("Oct–Dec 2026");

  if (!p.units.length) return <Empty>Units are added once the building plan is sanctioned.</Empty>;
  const roll = rentRoll(p.units);
  const holdings = capTable(p.partners, p.ledger);

  // Preview of the next payout: everything since the last reserve/distribution entry.
  const lastSeq = [...p.ledger].reverse().find((e) => e.type === "distribution" || e.type === "reserve")?.seq ?? 0;
  const since = p.ledger.filter((e) => e.seq > lastSeq);
  const gross = since.filter((e) => e.type === "rent").reduce((s, e) => s + e.amount, 0);
  const expenses = since.filter((e) => e.type === "expense" || e.type === "maintenance").reduce((s, e) => s + e.amount, 0);
  const preview = calcDistribution(gross, expenses, p.settings);
  const myPreview = splitByCapital(preview.distributable, holdings).find((x) => x.partnerId === can.partnerId);

  const yearly = roll.contracted * 12;
  const capital = holdings.reduce((s, h) => s + h.paid, 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-6 rounded-lg border border-line bg-panel p-5 md:grid-cols-4">
        <Figure label="Occupancy" value={pct(roll.occupancy, 0)} sub={`${roll.occupied} of ${roll.units} units`} />
        <Figure label="Rent this month" value={inr(roll.contracted, true)} sub={`${inr(roll.collected, true)} collected`} />
        <Figure label="Still due" value={inr(roll.due, true)} sub={roll.due ? "Follow up with tenants" : "All paid"} />
        <Figure label="Gross yield on capital" value={capital ? pct(yearly / capital, 1) : "—"} sub="Before expenses" />
      </div>

      <Panel title="Units and tenants">
        <div className="-mx-5 overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-granite">
                <th className="px-5 py-2 font-medium">Unit</th>
                <th className="py-2 font-medium">Tenant</th>
                <th className="py-2 text-right font-medium">Rent / month</th>
                <th className="py-2 pl-6 font-medium">Lease ends</th>
                <th className="px-5 py-2 font-medium">This month</th>
              </tr>
            </thead>
            <tbody>
              {p.units.map((u) => (
                <tr key={u.id} className="border-b border-line/70">
                  <td className="px-5 py-2.5 font-medium">{u.label}</td>
                  <td className={cx("py-2.5", !u.tenant && "text-granite")}>{u.tenant ?? "Vacant"}</td>
                  <td className="tabular py-2.5 text-right">{inr(u.rent)}</td>
                  <td className="py-2.5 pl-6">{u.leaseEnd ? fmtDate(u.leaseEnd) : "—"}</td>
                  <td className="px-5 py-2.5">
                    {!u.tenant ? (
                      <span className="text-granite">—</span>
                    ) : u.paidThisMonth ? (
                      <Badge tone="survey">Paid</Badge>
                    ) : can.operate ? (
                      <Button tone="quiet" className="py-1" onClick={() => run(p.id, (x) => collectRent(x, u.id, can.actor), `Rent recorded for ${u.label}`)}>
                        Record payment
                      </Button>
                    ) : (
                      <Badge tone="amber">Due</Badge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel title="Next payout to partners">
        <div className="grid gap-6 md:grid-cols-[1fr_1fr]">
          <dl className="tabular space-y-2 text-sm">
            <Row label="Rent received since last payout" value={inr(preview.gross)} />
            <Row label="Expenses and repairs" value={`− ${inr(preview.expenses)}`} />
            <Row label={`Repair reserve (${p.settings.reservePct}% of rent)`} value={`− ${inr(preview.reserve)}`} />
            <Row label={`Operator fee (${p.settings.mgmtFeePct}% of rent)`} value={`− ${inr(preview.fee)}`} />
            <div className="border-t border-line pt-2"><Row label="To be shared by ownership" value={inr(preview.distributable)} strong /></div>
            {myPreview && <Row label="Your share" value={inr(myPreview.amount)} />}
          </dl>
          <div className="space-y-3">
            <p className="text-sm text-granite">Each partner&apos;s share is worked out to the paisa from capital paid in. Payouts are written to the ledger one partner at a time, so anyone can check their own line.</p>
            {can.operate && (
              <form className="flex flex-wrap items-end gap-3" onSubmit={(e) => { e.preventDefault(); run(p.id, (x) => runDistribution(x, period, can.actor), `Payout for ${period} sent`); }}>
                <label className="block text-sm">
                  <span className="mb-1 block text-granite">Period</span>
                  <Input className="w-40" value={period} onChange={(e) => setPeriod(e.target.value)} />
                </label>
                <Button type="submit" disabled={preview.gross <= 0}>Pay out {inr(preview.distributable, true)}</Button>
              </form>
            )}
          </div>
        </div>
      </Panel>

      {p.distributions.length > 0 && (
        <Panel title="Past payouts">
          {[...p.distributions].reverse().map((d) => (
            <details key={d.id} className="group border-b border-line py-3 last:border-0">
              <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-2">
                <span className="font-semibold">{d.period}</span>
                <span className="tabular text-sm text-granite">Rent {inr(d.gross, true)} → shared {inr(d.distributable, true)} · {fmtDate(d.createdAt)}</span>
              </summary>
              <ul className="tabular mt-3 grid gap-x-8 gap-y-1 text-sm sm:grid-cols-2">
                {d.payouts.map((po) => (
                  <li key={po.partnerId} className={cx("flex justify-between", po.partnerId === can.partnerId && "font-semibold text-survey")}>
                    <span>{p.partners.find((x) => x.id === po.partnerId)?.name}</span>
                    <span>{inr(po.amount)}</span>
                  </li>
                ))}
              </ul>
            </details>
          ))}
        </Panel>
      )}
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={cx("flex justify-between gap-4", strong && "text-base font-bold")}>
      <dt className={strong ? "" : "text-granite"}>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
