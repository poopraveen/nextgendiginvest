/** All money values are integers in paise (1 rupee = 100 paise) to avoid floating point errors. */
export type Paise = number;

export type Role = "operator" | "partner" | "auditor";

export interface Partner {
  id: string;
  name: string;
  city: string;
  kyc: "verified" | "pending";
  committed: Paise;
  isOperator?: boolean;
}

export type LedgerType =
  | "contribution"
  | "land"
  | "approval_fee"
  | "construction"
  | "operator_fee"
  | "rent"
  | "expense"
  | "maintenance"
  | "reserve"
  | "distribution"
  | "decision";

export interface LedgerDraft {
  ts: string; // ISO timestamp
  type: LedgerType;
  direction: "in" | "out" | "none";
  amount: Paise;
  memo: string;
  actor: string; // name of person who recorded it
  partnerId?: string;
  ref?: string; // id of related milestone / ticket / vote / document
}

export interface LedgerEntry extends LedgerDraft {
  seq: number;
  prevHash: string;
  hash: string;
}

export type MilestoneStatus = "pending" | "in_progress" | "evidence_submitted" | "verified" | "paid";

export interface Milestone {
  id: string;
  name: string;
  budget: Paise;
  actual: Paise;
  status: MilestoneStatus;
  evidence: { photos: number; engineerCert: boolean; bill: boolean };
  verifiedBy?: string;
}

export interface Unit {
  id: string;
  label: string;
  kind: "shop" | "room" | "office" | "shed";
  rent: Paise;
  tenant?: string;
  leaseEnd?: string;
  paidThisMonth: boolean;
}

export type TicketStatus = "open" | "awaiting_vote" | "approved" | "done" | "rejected";

export interface MaintenanceTicket {
  id: string;
  title: string;
  unitId?: string;
  estimate: Paise;
  finalCost?: Paise;
  status: TicketStatus;
  raisedBy: string;
  createdAt: string;
  approvedBy?: string;
  voteId?: string;
  beforePhotos: number;
  afterPhotos: number;
  billAttached: boolean;
}

export type Ballot = "yes" | "no" | "abstain";

export interface Vote {
  id: string;
  title: string;
  detail: string;
  kind: "ordinary" | "special";
  ballots: Record<string, Ballot>;
  status: "open" | "passed" | "failed";
  createdAt: string;
  closesAt: string;
  ref?: string;
}

export interface DocRecord {
  id: string;
  name: string;
  category: DocCategory;
  sha256: string;
  size: number;
  uploadedBy: string;
  uploadedAt: string;
}

export type DocCategory =
  | "feasibility"
  | "kyc"
  | "title"
  | "agreement"
  | "sale_deed"
  | "plan_sanction"
  | "construction"
  | "completion"
  | "lease"
  | "statement"
  | "other";

export interface Settings {
  reservePct: number; // % of gross rent kept for maintenance
  mgmtFeePct: number; // operator property management fee, % of rent collected
  autoApproveLimit: Paise; // maintenance up to this is approved by operator
  ordinaryThreshold: number; // % ownership needed (strictly more than)
  specialThreshold: number; // % ownership needed (at least)
  dualSignAbove: Paise;
  lockInYears: number;
}

export interface Distribution {
  id: string;
  period: string;
  gross: Paise;
  expenses: Paise;
  reserve: Paise;
  fee: Paise;
  distributable: Paise;
  payouts: { partnerId: string; amount: Paise }[];
  createdAt: string;
}

export interface Project {
  id: string;
  name: string;
  location: string;
  buildingType: string;
  plot: string;
  stage: number; // 1..12, see lib/workflow.ts
  stageLog: { stage: number; by: string; at: string }[];
  targetCapital: Paise;
  partners: Partner[];
  ledger: LedgerEntry[];
  milestones: Milestone[];
  units: Unit[];
  tickets: MaintenanceTicket[];
  votes: Vote[];
  documents: DocRecord[];
  distributions: Distribution[];
  settings: Settings;
}
