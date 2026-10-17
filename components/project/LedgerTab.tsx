"use client";

import { useState } from "react";
import { useStore } from "../store";
import { Badge, Button, Field, Hash, Input, Panel, Select, cx } from "../ui";
import { LedgerCheck } from "./LedgerCheck";
import { fmtDate, parseRupees, TYPE_LABEL, usePermissions } from "./shared";
import { recordContribution, recordExpense, RuleError, tamperForDemo } from "@/lib/actions";
import { inr } from "@/lib/finance";
import { verifyLedger } from "@/lib/ledger";
import type { Project } from "@/lib/types";

export function LedgerTab({ p }: { p: Project }) {
  const { run } = useStore();
  const can = usePermissions(p);
  const [filter, setFilter] = useState("all");
  const [kind, setKind] = useState<"expense" | "contribution">("expense");
  const [amount, setAmount] = useState("");
  const [memo, setMemo] = useState("");
  const [partnerId, setPartnerId] = useState(p.partners[0]?.id ?? "");
  const check = verifyLedger(p.ledger);
  const broken = check.ok ? null : check.brokenAt;

  const types = [...new Set(p.ledger.map((e) => e.type))];
  const rows = [...p.ledger].reverse().filter((e) => filter === "all" || e.type === filter);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const paise = parseRupees(amount);
    if (Number.isNaN(paise)) return run(p.id, () => { throw new RuleError("Enter the amount in rupees, like 25000 or 1.2L"); });
    const ok = run(
      p.id,
      (x) => (kind === "expense" ? recordExpense(x, paise, memo, can.actor) : recordContribution(x, partnerId, paise, can.actor)),
      kind === "expense" ? "Expense recorded" : "Contribution recorded",
    );
    if (ok) { setAmount(""); setMemo(""); }
  };

  return (
    <div className="space-y-6">
      <Panel title="Verify the books">
        <LedgerCheck p={p} />
        {can.operate && (
          <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-line pt-4 text-sm text-granite">
            <span>Want to see what tampering looks like?</span>
            <Button tone="danger" onClick={() => run(p.id, tamperForDemo, "An old construction payment was quietly increased by ₹5 L. Now press Verify ledger.")}>
              Secretly edit an old payment
            </Button>
            <span className="text-xs">Demo only. Use “Reset demo data” in the sidebar to undo.</span>
          </div>
        )}
      </Panel>

      {can.operate && (
        <Panel title="Record a transaction">
          <form onSubmit={submit} className="grid gap-4 md:grid-cols-[180px_1fr_1fr_auto] md:items-end">
            <Field label="Type">
              <Select value={kind} onChange={(e) => setKind(e.target.value as typeof kind)}>
                <option value="expense">Expense paid</option>
                <option value="contribution">Partner contribution</option>
              </Select>
            </Field>
            <Field label="Amount (₹)">
              <Input inputMode="decimal" placeholder="25,000 or 1.2L" value={amount} onChange={(e) => setAmount(e.target.value)} required />
            </Field>
            {kind === "expense" ? (
              <Field label="What was it for">
                <Input placeholder="Property tax 2026–27" value={memo} onChange={(e) => setMemo(e.target.value)} required />
              </Field>
            ) : (
              <Field label="From partner">
                <Select value={partnerId} onChange={(e) => setPartnerId(e.target.value)}>
                  {p.partners.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
                </Select>
              </Field>
            )}
            <Button type="submit">Add to ledger</Button>
          </form>
          <p className="mt-3 text-xs text-granite">Entries can only be added, never edited. To correct a mistake, add a reversing entry with a note.</p>
        </Panel>
      )}

      <Panel
        title={`Ledger · ${p.ledger.length} entries`}
        action={
          <Select value={filter} onChange={(e) => setFilter(e.target.value)} className="w-auto" aria-label="Filter by type">
            <option value="all">All types</option>
            {types.map((t) => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}
          </Select>
        }
      >
        <div className="-mx-5 overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-granite">
                <th className="px-5 py-2 font-medium">#</th>
                <th className="py-2 font-medium">Date</th>
                <th className="py-2 font-medium">Type</th>
                <th className="py-2 font-medium">Details</th>
                <th className="py-2 text-right font-medium">Amount</th>
                <th className="px-5 py-2 font-medium">Fingerprint</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((e) => {
                const bad = broken !== null && e.seq >= broken;
                return (
                  <tr key={e.seq} className={cx("border-b border-line/70 align-top", bad && "bg-red-soft")}>
                    <td className="tabular px-5 py-2.5 text-granite">{e.seq}</td>
                    <td className="py-2.5 whitespace-nowrap">{fmtDate(e.ts)}</td>
                    <td className="py-2.5"><Badge tone={e.direction === "in" ? "survey" : e.type === "decision" ? "stamp" : "plain"}>{TYPE_LABEL[e.type]}</Badge></td>
                    <td className="py-2.5 pr-4">
                      <div>{e.memo}</div>
                      <div className="text-xs text-granite">Recorded by {e.actor}</div>
                    </td>
                    <td className={cx("tabular py-2.5 text-right font-semibold whitespace-nowrap", e.direction === "in" && "text-survey", e.direction === "none" && "font-normal text-granite")}>
                      {e.direction === "none" ? (e.amount ? inr(e.amount) : "—") : `${e.direction === "in" ? "+" : "−"}${inr(e.amount)}`}
                    </td>
                    <td className="px-5 py-2.5">
                      <Hash value={e.hash} n={8} />
                      {bad && e.seq === broken && <div className="text-xs font-semibold text-red">Does not match</div>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
