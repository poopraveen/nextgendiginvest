"use client";

import { useStore } from "../store";
import { Badge, Button, Figure, Panel } from "../ui";
import { LedgerCheck } from "./LedgerCheck";
import { fmtDate, TYPE_LABEL, usePermissions } from "./shared";
import { advanceStage } from "@/lib/actions";
import { balance } from "@/lib/ledger";
import { capTable, inr, rentRoll } from "@/lib/finance";
import { canAdvance, STAGES } from "@/lib/workflow";
import type { Project } from "@/lib/types";
import { cx } from "../ui";

export function Overview({ p }: { p: Project }) {
  const { run } = useStore();
  const can = usePermissions(p);
  const gate = canAdvance(p);
  const paid = capTable(p.partners, p.ledger).reduce((s, r) => s + r.paid, 0);
  const roll = rentRoll(p.units);
  const reserve = p.ledger.filter((e) => e.type === "reserve").reduce((s, e) => s + e.amount, 0);

  return (
    <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
      <div className="space-y-6">
        <Panel title="Where this project is">
          <ol className="space-y-0">
            {STAGES.map((s) => {
              const done = s.n < p.stage;
              const current = s.n === p.stage;
              const when = p.stageLog.find((l) => l.stage === s.n);
              return (
                <li key={s.n} className="grid grid-cols-[28px_1fr] gap-3">
                  <div className="flex flex-col items-center">
                    <span
                      className={cx(
                        "grid h-7 w-7 place-items-center rounded-full text-xs font-bold tabular",
                        done && "bg-survey text-panel",
                        current && "border-2 border-survey bg-survey-soft text-survey",
                        !done && !current && "border border-line text-granite",
                      )}
                    >
                      {s.n}
                    </span>
                    {s.n < STAGES.length && <span className={cx("w-px flex-1", done ? "bg-survey" : "bg-line")} />}
                  </div>
                  <div className={cx("pb-4", !done && !current && "text-granite")}>
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <span className={cx("font-semibold", current && "text-survey")}>{s.name}</span>
                      {when && <span className="text-xs text-granite">Closed {fmtDate(when.at)}</span>}
                    </div>
                    {current && (
                      <div className="mt-1.5 space-y-2 rounded-md bg-paper p-3 text-sm">
                        <p>{s.summary}</p>
                        <p>
                          <span className="text-granite">Gate to move on: </span>
                          {s.gate}
                        </p>
                        {gate.ok ? <Badge tone="survey">Gate met</Badge> : <Badge tone="amber">{gate.reason}</Badge>}
                        {can.operate && p.stage < 12 && (
                          <div>
                            <Button className="mt-1" disabled={!gate.ok} onClick={() => run(p.id, (x) => advanceStage(x, can.actor), `Stage ${s.n} closed`)}>
                              Close stage {s.n} and start {STAGES[s.n]?.name.toLowerCase()}
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        </Panel>
      </div>

      <div className="space-y-6">
        <Panel title="Project bank account">
          <div className="grid grid-cols-2 gap-5">
            <Figure label="Balance" value={inr(balance(p.ledger), true)} />
            <Figure label="Capital received" value={inr(paid, true)} sub={`of ${inr(p.targetCapital, true)}`} />
            {p.stage >= 10 && <Figure label="Monthly rent" value={inr(roll.contracted, true)} sub={`${roll.occupied} of ${roll.units} units let`} />}
            {p.stage >= 10 && <Figure label="Repair reserve" value={inr(reserve, true)} sub={`${p.settings.reservePct}% of rent`} />}
          </div>
          <p className="mt-4 text-xs text-granite">Payments over {inr(p.settings.dualSignAbove)} need the operator and an elected partner to sign.</p>
        </Panel>

        <Panel title="Trust check">
          <LedgerCheck p={p} />
        </Panel>

        <Panel title="Latest activity">
          <ul className="space-y-3">
            {[...p.ledger].reverse().slice(0, 6).map((e) => (
              <li key={e.seq} className="text-sm">
                <div className="flex justify-between gap-3">
                  <span className="min-w-0">{e.memo}</span>
                  {e.direction !== "none" && (
                    <span className={cx("tabular shrink-0 font-semibold", e.direction === "in" ? "text-survey" : "text-ink")}>
                      {e.direction === "in" ? "+" : "−"}{inr(e.amount, true)}
                    </span>
                  )}
                </div>
                <div className="text-xs text-granite">#{e.seq} · {TYPE_LABEL[e.type]} · {fmtDate(e.ts)} · {e.actor}</div>
              </li>
            ))}
            {!p.ledger.length && <li className="text-sm text-granite">No money has moved yet. The first entry will be a partner&apos;s contribution.</li>}
          </ul>
        </Panel>
      </div>
    </div>
  );
}
