import { capTable, rentRoll } from "./finance";
import type { DocCategory, Project } from "./types";

export interface Stage {
  n: number;
  name: string;
  owner: string;
  summary: string;
  gate: string;
  check: (p: Project) => string | null; // null = gate met, otherwise what is missing
}

const hasDoc = (p: Project, c: DocCategory, label: string) =>
  p.documents.some((d) => d.category === c) ? null : `Upload the ${label}`;

export const STAGES: Stage[] = [
  {
    n: 1, name: "Site sourcing", owner: "Operator",
    summary: "Shortlist plots, check rents nearby, work out cost and yield.",
    gate: "Feasibility report shared with partners",
    check: (p) => hasDoc(p, "feasibility", "feasibility report"),
  },
  {
    n: 2, name: "Partner onboarding", owner: "Operator, partners",
    summary: "Invite known people, collect KYC and signed commitment letters.",
    gate: "Commitments cover the full project cost and every partner's KYC is verified",
    check: (p) => {
      const committed = p.partners.reduce((s, x) => s + x.committed, 0);
      if (committed < p.targetCapital) return "Commitments are below the project cost";
      if (p.partners.some((x) => x.kyc !== "verified")) return "Some partners have KYC pending";
      return null;
    },
  },
  {
    n: 3, name: "Legal due diligence", owner: "Lawyer",
    summary: "30-year title chain, EC, RTC, DC conversion, layout approval, Khata, acquisition check.",
    gate: "Clean title report from the lawyer",
    check: (p) => hasDoc(p, "title", "title report"),
  },
  {
    n: 4, name: "LLP & agreement", owner: "CA, partners",
    summary: "Form the project LLP, sign the partnership agreement, open the two-signatory bank account.",
    gate: "Agreement signed by every partner",
    check: (p) => hasDoc(p, "agreement", "signed agreement"),
  },
  {
    n: 5, name: "Capital call", owner: "Partners",
    summary: "Each partner transfers their contribution to the LLP account.",
    gate: "All committed money received",
    check: (p) => {
      const rows = capTable(p.partners, p.ledger);
      const short = rows.filter((r) => r.paid < r.committed);
      return short.length ? `${short.length} partner(s) still to pay in full` : null;
    },
  },
  {
    n: 6, name: "Land purchase", owner: "Operator, lawyer",
    summary: "Pay stamp duty, register the sale deed in the LLP's name, transfer the Khata.",
    gate: "Registered sale deed and E-Khata in the LLP's name",
    check: (p) => hasDoc(p, "sale_deed", "registered sale deed"),
  },
  {
    n: 7, name: "Design & sanction", owner: "Architect",
    summary: "Building and structural plans, plan sanction, contractor chosen from 3 quotes by vote.",
    gate: "Plan sanctioned and contractor approved by vote",
    check: (p) => hasDoc(p, "plan_sanction", "plan sanction"),
  },
  {
    n: 8, name: "Construction", owner: "Contractor, engineer",
    summary: "Build stage by stage; money is released only after photos, engineer sign-off and bill.",
    gate: "Every milestone verified and paid",
    check: (p) => (p.milestones.length && p.milestones.every((m) => m.status === "paid") ? null : "Some milestones are not paid yet"),
  },
  {
    n: 9, name: "Completion", owner: "Operator",
    summary: "Occupancy certificate, power and water connections, snag list closed.",
    gate: "Occupancy / completion certificate received",
    check: (p) => hasDoc(p, "completion", "completion certificate"),
  },
  {
    n: 10, name: "Leasing", owner: "Operator",
    summary: "List units, verify tenants, sign leases, collect deposits.",
    gate: "At least 80% of units leased",
    check: (p) => (rentRoll(p.units).occupancy >= 0.8 ? null : "Occupancy is below 80%"),
  },
  {
    n: 11, name: "Operations", owner: "Operator, partners",
    summary: "Monthly rent and expenses, maintenance tickets, quarterly payouts, yearly audit.",
    gate: "Runs until partners vote to exit",
    check: (p) => (p.votes.some((v) => v.ref === "exit" && v.status === "passed") ? null : "Needs a passed special resolution to exit"),
  },
  {
    n: 12, name: "Exit", owner: "All partners",
    summary: "Sell shares to other partners first, or sell the building and make a final payout.",
    gate: "Final distribution done",
    check: () => "Final stage",
  },
];

export function stageOf(n: number) {
  return STAGES[Math.min(Math.max(n, 1), STAGES.length) - 1];
}

export function canAdvance(p: Project): { ok: true } | { ok: false; reason: string } {
  const missing = stageOf(p.stage).check(p);
  return missing ? { ok: false, reason: missing } : { ok: true };
}
