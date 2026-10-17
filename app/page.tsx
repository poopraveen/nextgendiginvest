"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useStore } from "@/components/store";
import { Badge, Figure, Meter, Panel } from "@/components/ui";
import { StageTrack } from "@/components/StageTrack";
import { capTable, inr, pct, rentRoll, sumBy } from "@/lib/finance";
import { verifyLedger } from "@/lib/ledger";
import { stageOf } from "@/lib/workflow";

export default function Portfolio() {
  const { projects, viewer, viewerName } = useStore();

  const rows = useMemo(
    () =>
      projects.map((p) => {
        const cap = capTable(p.partners, p.ledger);
        const paid = cap.reduce((s, r) => s + r.paid, 0);
        const committed = p.partners.reduce((s, x) => s + x.committed, 0);
        const roll = rentRoll(p.units);
        const built = p.milestones.length ? p.milestones.filter((m) => m.status === "paid").length / p.milestones.length : 0;
        const mine = cap.find((r) => r.partnerId === viewer.partnerId);
        const myPayouts = p.ledger.filter((e) => e.type === "distribution" && e.partnerId === viewer.partnerId).reduce((s, e) => s + e.amount, 0);
        return { p, paid, committed, roll, built, mine, myPayouts, check: verifyLedger(p.ledger), paidOut: sumBy(p.ledger, ["distribution"]) };
      }),
    [projects, viewer.partnerId],
  );

  const totalPaid = rows.reduce((s, r) => s + r.paid, 0);
  const monthlyRent = rows.reduce((s, r) => s + (r.p.stage >= 10 ? r.roll.contracted : 0), 0);
  const paidOut = rows.reduce((s, r) => s + r.paidOut, 0);
  const allOk = rows.every((r) => r.check.ok);

  const attention = projects.flatMap((p) => [
    ...p.votes
      .filter((v) => v.status === "open" && viewer.role !== "auditor" && !v.ballots[viewer.partnerId] && p.partners.some((x) => x.id === viewer.partnerId))
      .map((v) => ({ key: `${p.id}-${v.id}`, href: `/projects/${p.id}?tab=votes`, text: v.title, where: p.name, kind: "Vote open" })),
    ...(viewer.role === "operator"
      ? [
          ...p.tickets.filter((t) => t.status === "open" || t.status === "approved").map((t) => ({ key: `${p.id}-${t.id}`, href: `/projects/${p.id}?tab=upkeep`, text: t.title, where: p.name, kind: t.status === "open" ? "Repair to approve" : "Repair to close" })),
          ...p.milestones.filter((m) => m.status === "evidence_submitted" || m.status === "verified").map((m) => ({ key: `${p.id}-${m.id}`, href: `/projects/${p.id}?tab=build`, text: m.name, where: p.name, kind: m.status === "verified" ? "Release payment" : "Verify milestone" })),
        ]
      : []),
  ]);

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold sm:text-4xl">Portfolio</h1>
          <p className="mt-1 max-w-xl text-granite">
            {viewer.role === "operator"
              ? "Everything you manage for your partners, in one place they can also see."
              : viewer.role === "auditor"
                ? "Read-only view of every project's books, votes and documents."
                : `Welcome, ${viewerName}. Here is every building you co-own and what it is earning.`}
          </p>
        </div>
        <Badge tone={allOk ? "stamp" : "red"}>{allOk ? "All ledgers verified" : "A ledger failed verification"}</Badge>
      </header>

      <div className="grid grid-cols-2 gap-6 rounded-lg border border-line bg-panel p-5 md:grid-cols-4">
        <Figure label="Capital in projects" value={inr(totalPaid, true)} sub={`${projects.length} buildings`} />
        <Figure label="Monthly rent contracted" value={inr(monthlyRent, true)} sub="Operating buildings" />
        <Figure label="Paid out to partners" value={inr(paidOut, true)} sub="All time" />
        <Figure label="Waiting on you" value={attention.length} sub={attention.length ? "See below" : "Nothing pending"} />
      </div>

      {attention.length > 0 && (
        <Panel title="Waiting on you">
          <ul className="divide-y divide-line">
            {attention.map((a) => (
              <li key={a.key}>
                <Link href={a.href} className="flex flex-wrap items-center justify-between gap-2 py-2.5 hover:text-survey">
                  <span className="font-medium">{a.text}</span>
                  <span className="flex items-center gap-2 text-sm text-granite">
                    {a.where} <Badge tone={a.kind === "Vote open" ? "stamp" : "amber"}>{a.kind}</Badge>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      <section className="space-y-4">
        <h2 className="text-xl font-bold">Buildings</h2>
        {rows.map(({ p, paid, committed, roll, built, mine, myPayouts, check }) => {
          const st = stageOf(p.stage);
          return (
            <Link key={p.id} href={`/projects/${p.id}`} className="group block rounded-lg border border-line bg-panel p-5 transition-colors hover:border-survey">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-xl font-bold group-hover:text-survey">{p.name}</h3>
                  <p className="text-sm text-granite">{p.location} · {p.buildingType}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge tone="survey">Stage {p.stage}: {st.name}</Badge>
                  {p.ledger.length > 0 && <Badge tone={check.ok ? "stamp" : "red"}>{check.ok ? `Ledger verified · ${check.checked}` : `Ledger broken at #${check.brokenAt}`}</Badge>}
                </div>
              </div>
              <div className="mt-4"><StageTrack stage={p.stage} compact /></div>
              <div className="mt-5 grid gap-5 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <div className="flex justify-between text-sm"><span className="text-granite">Capital received</span><span className="tabular font-semibold">{inr(paid, true)} / {inr(p.targetCapital, true)}</span></div>
                  <Meter value={paid / p.targetCapital} />
                  {p.stage <= 2 && <div className="text-xs text-granite">Committed {inr(committed, true)} ({pct(committed / p.targetCapital, 0)})</div>}
                </div>
                {p.milestones.length > 0 && p.stage <= 9 ? (
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-sm"><span className="text-granite">Construction paid</span><span className="tabular font-semibold">{pct(built, 0)}</span></div>
                    <Meter value={built} tone="amber" />
                  </div>
                ) : p.stage >= 10 ? (
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-sm"><span className="text-granite">Occupancy</span><span className="tabular font-semibold">{roll.occupied}/{roll.units} · {inr(roll.contracted, true)}/mo</span></div>
                    <Meter value={roll.occupancy} />
                  </div>
                ) : <div />}
                {mine && mine.paid > 0 ? (
                  <div className="text-sm">
                    <div className="text-granite">{viewer.role === "operator" ? "Your own stake" : "Your stake"}</div>
                    <div className="tabular font-semibold">{pct(mine.share, 2)} · {inr(mine.paid, true)} in · {inr(myPayouts, true)} received</div>
                  </div>
                ) : <div />}
              </div>
            </Link>
          );
        })}
      </section>
    </div>
  );
}
