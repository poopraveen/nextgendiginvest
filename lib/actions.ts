/**
 * Pure state transitions for a project. Each returns a new Project and appends to the
 * hash-chained ledger whenever money moves or a decision is made, so history can't be quietly rewritten.
 */
import { appendEntry } from "./ledger";
import { calcDistribution, capTable, splitByCapital } from "./finance";
import { maintenanceNeedsVote, tally } from "./governance";
import { canAdvance, stageOf } from "./workflow";
import type { Ballot, DocCategory, LedgerDraft, Paise, Project, Vote } from "./types";

export class RuleError extends Error {}

const now = () => new Date().toISOString();

function log(p: Project, d: Omit<LedgerDraft, "ts"> & { ts?: string }): Project {
  return { ...p, ledger: appendEntry(p.ledger, { ts: d.ts ?? now(), ...d }) };
}

export function recordContribution(p: Project, partnerId: string, amount: Paise, actor: string): Project {
  const partner = p.partners.find((x) => x.id === partnerId);
  if (!partner) throw new RuleError("Unknown partner");
  if (amount <= 0) throw new RuleError("Enter an amount above zero");
  return log(p, { type: "contribution", direction: "in", amount, memo: `Capital contribution — ${partner.name}`, partnerId, actor });
}

export function collectRent(p: Project, unitId: string, actor: string): Project {
  const u = p.units.find((x) => x.id === unitId);
  if (!u?.tenant) throw new RuleError("This unit has no tenant");
  if (u.paidThisMonth) throw new RuleError("Rent for this unit is already recorded this month");
  const next = log(p, { type: "rent", direction: "in", amount: u.rent, memo: `Rent — ${u.label} (${u.tenant})`, ref: u.id, actor });
  return { ...next, units: next.units.map((x) => (x.id === unitId ? { ...x, paidThisMonth: true } : x)) };
}

export function recordExpense(p: Project, amount: Paise, memo: string, actor: string): Project {
  if (amount <= 0) throw new RuleError("Enter an amount above zero");
  if (!memo.trim()) throw new RuleError("Describe what the expense was for");
  return log(p, { type: "expense", direction: "out", amount, memo: memo.trim(), actor });
}

/* ---------- Maintenance ---------- */

export function raiseTicket(p: Project, title: string, estimate: Paise, raisedBy: string, unitId?: string): Project {
  if (!title.trim()) throw new RuleError("Describe the problem");
  const id = `T-${100 + p.tickets.length + 1}`;
  let next: Project = {
    ...p,
    tickets: [...p.tickets, { id, title: title.trim(), unitId, estimate, status: "open", raisedBy, createdAt: now(), beforePhotos: 1, afterPhotos: 0, billAttached: false }],
  };
  if (maintenanceNeedsVote(estimate, p.settings)) {
    next = openVote(next, {
      title: `${title.trim()} — estimate ₹${(estimate / 100).toLocaleString("en-IN")}`,
      detail: `Above the operator limit of ₹${(p.settings.autoApproveLimit / 100).toLocaleString("en-IN")}, so partners decide.`,
      kind: "ordinary",
      ref: id,
    }, raisedBy);
    const voteId = next.votes[next.votes.length - 1].id;
    next = { ...next, tickets: next.tickets.map((t) => (t.id === id ? { ...t, status: "awaiting_vote", voteId } : t)) };
  }
  return next;
}

export function approveTicket(p: Project, ticketId: string, actor: string): Project {
  const t = p.tickets.find((x) => x.id === ticketId);
  if (!t) throw new RuleError("Ticket not found");
  if (t.status === "awaiting_vote") throw new RuleError("This repair is waiting for the partner vote");
  if (t.status !== "open") throw new RuleError("Only open tickets can be approved");
  if (maintenanceNeedsVote(t.estimate, p.settings)) throw new RuleError("This estimate is above the operator limit and needs a partner vote");
  const next = log(p, { type: "decision", direction: "none", amount: t.estimate, memo: `Maintenance approved by operator: ${t.title}`, ref: t.id, actor });
  return { ...next, tickets: next.tickets.map((x) => (x.id === ticketId ? { ...x, status: "approved", approvedBy: actor } : x)) };
}

export function completeTicket(p: Project, ticketId: string, finalCost: Paise, actor: string): Project {
  const t = p.tickets.find((x) => x.id === ticketId);
  if (!t) throw new RuleError("Ticket not found");
  if (t.status !== "approved") throw new RuleError("Approve the work before closing it");
  if (finalCost <= 0) throw new RuleError("Enter the final bill amount");
  if (finalCost > Math.round(t.estimate * 1.1)) {
    throw new RuleError("Final bill is more than 10% over the approved estimate — raise a new approval");
  }
  const next = log(p, { type: "maintenance", direction: "out", amount: finalCost, memo: `Maintenance paid: ${t.title} (bill and after-photos attached)`, ref: t.id, actor });
  return { ...next, tickets: next.tickets.map((x) => (x.id === ticketId ? { ...x, status: "done", finalCost, afterPhotos: Math.max(1, x.afterPhotos), billAttached: true } : x)) };
}

/* ---------- Voting ---------- */

export function openVote(p: Project, v: Pick<Vote, "title" | "detail" | "kind"> & { ref?: string }, actor: string): Project {
  const id = `V-${p.votes.length + 1}`;
  const created = new Date();
  const closes = new Date(created.getTime() + 7 * 24 * 3600 * 1000);
  const next = log(p, { type: "decision", direction: "none", amount: 0, memo: `Vote opened (${v.kind}): ${v.title}`, ref: id, actor });
  return { ...next, votes: [...next.votes, { id, ...v, ballots: {}, status: "open", createdAt: created.toISOString(), closesAt: closes.toISOString() }] };
}

export function castBallot(p: Project, voteId: string, partnerId: string, ballot: Ballot): Project {
  const v = p.votes.find((x) => x.id === voteId);
  if (!v) throw new RuleError("Vote not found");
  if (v.status !== "open") throw new RuleError("This vote is closed");
  if (!p.partners.some((x) => x.id === partnerId)) throw new RuleError("Only partners can vote");
  const updated: Vote = { ...v, ballots: { ...v.ballots, [partnerId]: ballot } };
  let next: Project = { ...p, votes: p.votes.map((x) => (x.id === voteId ? updated : x)) };
  const t = tally(updated, capTable(p.partners, p.ledger), p.settings);
  if (t.decided) next = closeVote(next, voteId, "Outcome reached");
  return next;
}

export function closeVote(p: Project, voteId: string, reason = "Voting period ended"): Project {
  const v = p.votes.find((x) => x.id === voteId);
  if (!v || v.status !== "open") return p;
  const t = tally(v, capTable(p.partners, p.ledger), p.settings);
  const status = t.passed ? "passed" : "failed";
  let next = log(p, {
    type: "decision", direction: "none", amount: 0, ref: v.id, actor: "System",
    memo: `Vote ${status}: ${v.title} — yes ${(t.yes * 100).toFixed(1)}% of ownership (${reason})`,
  });
  next = { ...next, votes: next.votes.map((x) => (x.id === voteId ? { ...x, status } : x)) };
  if (v.ref) {
    next = {
      ...next,
      tickets: next.tickets.map((tk) =>
        tk.id === v.ref && tk.status === "awaiting_vote" ? { ...tk, status: status === "passed" ? "approved" : "rejected", approvedBy: status === "passed" ? "Partner vote" : undefined } : tk,
      ),
    };
  }
  return next;
}

/* ---------- Construction ---------- */

export function submitEvidence(p: Project, milestoneId: string, actor: string, amount: Paise): Project {
  const m = p.milestones.find((x) => x.id === milestoneId);
  if (!m) throw new RuleError("Milestone not found");
  if (m.status !== "in_progress" && m.status !== "pending") throw new RuleError("Evidence is already in");
  if (amount <= 0) throw new RuleError("Enter the contractor's bill amount");
  const next = log(p, { type: "decision", direction: "none", amount, memo: `Evidence submitted for ${m.name}: photos, engineer certificate, bill`, ref: m.id, actor });
  return { ...next, milestones: next.milestones.map((x) => (x.id === milestoneId ? { ...x, status: "evidence_submitted", actual: amount, evidence: { photos: Math.max(4, x.evidence.photos), engineerCert: true, bill: true } } : x)) };
}

export function verifyMilestone(p: Project, milestoneId: string, actor: string): Project {
  const m = p.milestones.find((x) => x.id === milestoneId);
  if (!m) throw new RuleError("Milestone not found");
  if (m.status !== "evidence_submitted") throw new RuleError("Evidence must be submitted first");
  const next = log(p, { type: "decision", direction: "none", amount: m.actual, memo: `Milestone verified: ${m.name}`, ref: m.id, actor });
  return { ...next, milestones: next.milestones.map((x) => (x.id === milestoneId ? { ...x, status: "verified", verifiedBy: actor } : x)) };
}

export function payMilestone(p: Project, milestoneId: string, actor: string): Project {
  const m = p.milestones.find((x) => x.id === milestoneId);
  if (!m) throw new RuleError("Milestone not found");
  if (m.status !== "verified") throw new RuleError("Payment is released only after the milestone is verified");
  if (!m.evidence.bill || !m.evidence.engineerCert || m.evidence.photos < 1) throw new RuleError("Photos, engineer certificate and bill are required");
  const next = log(p, { type: "construction", direction: "out", amount: m.actual, memo: `Milestone paid: ${m.name}`, ref: m.id, actor });
  return { ...next, milestones: next.milestones.map((x) => (x.id === milestoneId ? { ...x, status: "paid" } : x)) };
}

/* ---------- Distribution ---------- */

/** Distributes rent received since the last distribution. */
export function runDistribution(p: Project, period: string, actor: string): Project {
  const lastSeq = (() => {
    const last = [...p.ledger].reverse().find((e) => e.type === "distribution" || e.type === "reserve");
    return last ? last.seq : 0;
  })();
  const since = p.ledger.filter((e) => e.seq > lastSeq);
  const gross = since.filter((e) => e.type === "rent").reduce((s, e) => s + e.amount, 0);
  const expenses = since.filter((e) => e.type === "expense" || e.type === "maintenance").reduce((s, e) => s + e.amount, 0);
  if (gross <= 0) throw new RuleError("No rent received since the last distribution");
  const calc = calcDistribution(gross, expenses, p.settings);
  const payouts = splitByCapital(calc.distributable, capTable(p.partners, p.ledger));
  const id = `D-${p.distributions.length + 1}-${Date.now().toString(36)}`;
  let next = log(p, { type: "reserve", direction: "none", amount: calc.reserve, memo: `${period} maintenance reserve (${p.settings.reservePct}% of rent)`, ref: id, actor });
  next = log(next, { type: "operator_fee", direction: "out", amount: calc.fee, memo: `${period} property management fee (${p.settings.mgmtFeePct}% of rent)`, ref: id, actor });
  for (const po of payouts) {
    if (po.amount > 0) {
      const name = p.partners.find((x) => x.id === po.partnerId)!.name;
      next = log(next, { type: "distribution", direction: "out", amount: po.amount, partnerId: po.partnerId, memo: `${period} payout — ${name}`, ref: id, actor });
    }
  }
  return { ...next, distributions: [...next.distributions, { id, period, ...calc, payouts, createdAt: now() }] };
}

/* ---------- Documents & workflow ---------- */

export function addDocument(p: Project, d: { name: string; category: DocCategory; sha256: string; size: number }, actor: string): Project {
  if (p.documents.some((x) => x.sha256 === d.sha256)) throw new RuleError("This exact file is already in the vault");
  const id = `doc-${p.documents.length + 1}-${d.sha256.slice(0, 6)}`;
  const next = log(p, { type: "decision", direction: "none", amount: 0, memo: `Document added: ${d.name} (SHA-256 ${d.sha256.slice(0, 12)}…)`, ref: id, actor });
  return { ...next, documents: [...next.documents, { id, ...d, uploadedBy: actor, uploadedAt: now() }] };
}

export function advanceStage(p: Project, actor: string): Project {
  const gate = canAdvance(p);
  if (!gate.ok) throw new RuleError(gate.reason);
  if (p.stage >= 12) throw new RuleError("Project is at its final stage");
  const done = stageOf(p.stage);
  const next = log(p, { type: "decision", direction: "none", amount: 0, memo: `Stage ${done.n} "${done.name}" closed — gate met: ${done.gate}`, actor });
  return { ...next, stage: p.stage + 1, stageLog: [...p.stageLog, { stage: p.stage, by: actor, at: now() }] };
}

/** Demo only: edits an old ledger entry WITHOUT re-hashing, the way a dishonest edit to a database would. */
export function tamperForDemo(p: Project): Project {
  const idx = p.ledger.findIndex((e) => e.type === "construction");
  if (idx < 0) return p;
  const ledger = p.ledger.map((e, i) => (i === idx ? { ...e, amount: e.amount + 5_00_000_00 } : e));
  return { ...p, ledger };
}
