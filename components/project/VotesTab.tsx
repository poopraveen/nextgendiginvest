"use client";

import { useState } from "react";
import { useStore } from "../store";
import { Badge, Button, Empty, Field, Input, Panel, Select, cx } from "../ui";
import { fmtDate, usePermissions } from "./shared";
import { castBallot, closeVote, openVote } from "@/lib/actions";
import { capTable, pct } from "@/lib/finance";
import { tally } from "@/lib/governance";
import type { Ballot, Project, Vote } from "@/lib/types";

export function VotesTab({ p }: { p: Project }) {
  const { run } = useStore();
  const can = usePermissions(p);
  const holdings = capTable(p.partners, p.ledger);
  const [title, setTitle] = useState("");
  const [detail, setDetail] = useState("");
  const [kind, setKind] = useState<Vote["kind"]>("ordinary");

  const open = p.votes.filter((v) => v.status === "open");
  const closed = p.votes.filter((v) => v.status !== "open").reverse();
  const noCapital = holdings.every((h) => h.paid === 0);

  return (
    <div className="space-y-6">
      <Panel title="How votes count">
        <p className="max-w-3xl text-sm text-granite">
          Each partner&apos;s vote weighs as much as the capital they paid in. Results are measured against <em>all</em> ownership, not just those who voted, so nothing passes on low turnout. Ordinary decisions need more than {p.settings.ordinaryThreshold}%. Selling the building, taking a loan, adding a partner or changing the operator need at least {p.settings.specialThreshold}%.
        </p>
      </Panel>

      {open.length === 0 && closed.length === 0 && <Empty>No votes yet.</Empty>}
      {open.map((v) => <VoteCard key={v.id} p={p} v={v} />)}

      {can.operate && (
        <Panel title="Ask partners to decide">
          {noCapital ? (
            <p className="text-sm text-granite">Voting opens once partners have paid in capital, since votes are weighted by it.</p>
          ) : (
            <form
              className="grid gap-4 md:grid-cols-2"
              onSubmit={(e) => {
                e.preventDefault();
                const ok = run(p.id, (x) => openVote(x, { title, detail, kind, ref: /sell|exit/i.test(title) && kind === "special" ? "exit" : undefined }, can.actor), "Vote opened for 7 days");
                if (ok) { setTitle(""); setDetail(""); }
              }}
            >
              <Field label="Question">
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Raise shop rents by 5% from April" required />
              </Field>
              <Field label="Type" hint={kind === "special" ? `Needs at least ${p.settings.specialThreshold}% of ownership` : `Needs more than ${p.settings.ordinaryThreshold}% of ownership`}>
                <Select value={kind} onChange={(e) => setKind(e.target.value as Vote["kind"])}>
                  <option value="ordinary">Ordinary decision</option>
                  <option value="special">Special decision (sale, loan, new partner, change operator)</option>
                </Select>
              </Field>
              <div className="md:col-span-2">
                <Field label="Details partners need">
                  <Input value={detail} onChange={(e) => setDetail(e.target.value)} placeholder="Market rent nearby is ₹19,500; current tenants agreed in principle." />
                </Field>
              </div>
              <div><Button type="submit">Open vote</Button></div>
            </form>
          )}
        </Panel>
      )}

      {closed.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-lg font-bold">Decided</h2>
          {closed.map((v) => <VoteCard key={v.id} p={p} v={v} />)}
        </section>
      )}
    </div>
  );
}

function VoteCard({ p, v }: { p: Project; v: Vote }) {
  const { run } = useStore();
  const can = usePermissions(p);
  const holdings = capTable(p.partners, p.ledger);
  const t = tally(v, holdings, p.settings);
  const mine = v.ballots[can.partnerId];
  const cast = (b: Ballot) => run(p.id, (x) => castBallot(x, v.id, can.partnerId, b), `Your vote “${b}” is recorded`);

  return (
    <article id={v.id} className="scroll-mt-6 rounded-lg border border-line bg-panel p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-2xl">
          <h3 className="text-lg font-bold">{v.title}</h3>
          <p className="mt-1 text-sm text-granite">{v.detail}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge tone={v.kind === "special" ? "amber" : "plain"}>{v.kind === "special" ? "Special" : "Ordinary"}</Badge>
          <Badge tone={v.status === "passed" ? "survey" : v.status === "failed" ? "red" : "stamp"}>
            {v.status === "open" ? `Open until ${fmtDate(v.closesAt)}` : v.status === "passed" ? "Passed" : "Not passed"}
          </Badge>
        </div>
      </div>

      {/* Ownership bar with the pass line marked */}
      <div className="relative mt-5">
        <div className="flex h-3 w-full overflow-hidden rounded-full bg-line/60">
          <span className="bg-survey" style={{ width: `${t.yes * 100}%` }} />
          <span className="bg-red/80" style={{ width: `${t.no * 100}%` }} />
          <span className="bg-granite/40" style={{ width: `${t.abstain * 100}%` }} />
        </div>
        <span className="absolute -top-1 h-5 w-0.5 bg-ink" style={{ left: `${t.needed * 100}%` }} aria-hidden />
      </div>
      <div className="tabular mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm">
        <span className="font-semibold text-survey">Yes {pct(t.yes)}</span>
        <span className="text-red">No {pct(t.no)}</span>
        <span className="text-granite">Abstain {pct(t.abstain)}</span>
        <span className="text-granite">Not voted {pct(t.notVoted)}</span>
        <span className="text-granite">Pass line {v.kind === "special" ? "≥" : ">"} {pct(t.needed, 0)}</span>
      </div>

      <details className="mt-3 text-sm">
        <summary className="cursor-pointer text-granite">Who voted how</summary>
        <ul className="mt-2 grid gap-x-8 gap-y-1 sm:grid-cols-2">
          {holdings.map((h) => (
            <li key={h.partnerId} className="flex justify-between">
              <span>{h.name} <span className="text-granite">({pct(h.share)})</span></span>
              <span className={cx(v.ballots[h.partnerId] === "yes" && "text-survey", v.ballots[h.partnerId] === "no" && "text-red", !v.ballots[h.partnerId] && "text-granite")}>
                {v.ballots[h.partnerId] ?? "—"}
              </span>
            </li>
          ))}
        </ul>
      </details>

      {v.status === "open" && (
        <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-line pt-4">
          {can.vote ? (
            <>
              <span className="text-sm">{mine ? <>You voted <strong>{mine}</strong>. You can change it while the vote is open.</> : "Your vote:"}</span>
              <Button tone={mine === "yes" ? "primary" : "quiet"} onClick={() => cast("yes")}>Yes</Button>
              <Button tone={mine === "no" ? "danger" : "quiet"} onClick={() => cast("no")}>No</Button>
              <Button tone="quiet" onClick={() => cast("abstain")} className={mine === "abstain" ? "border-ink" : ""}>Abstain</Button>
            </>
          ) : (
            <span className="text-sm text-granite">Only partners in this project can vote.</span>
          )}
          {can.operate && (
            <Button tone="quiet" className="ml-auto" onClick={() => run(p.id, (x) => closeVote(x, v.id, "Closed by operator at end of voting period"), "Vote closed")}>
              Close vote now
            </Button>
          )}
        </div>
      )}
    </article>
  );
}
