import { appendEntry, sha256Hex } from "./ledger";
import { calcDistribution, capTable, rs, splitByCapital } from "./finance";
import { SAMPLE_DOCS } from "./sampleDocs";
import type { DocCategory, DocRecord, LedgerDraft, LedgerEntry, Milestone, Partner, Project, Settings } from "./types";

export const OPERATOR_NAME = "Praveen Kumar";

const defaultSettings: Settings = {
  reservePct: 10,
  mgmtFeePct: 8,
  autoApproveLimit: rs(25_000),
  ordinaryThreshold: 50,
  specialThreshold: 75,
  dualSignAbove: rs(1_00_000),
  lockInYears: 3,
};

function ledgerBuilder() {
  let ledger: LedgerEntry[] = [];
  return {
    add(d: Omit<LedgerDraft, "actor"> & { actor?: string }) {
      ledger = appendEntry(ledger, { actor: OPERATOR_NAME, ...d });
    },
    get: () => ledger,
  };
}

function doc(id: string, name: string, category: DocCategory, at: string, content?: string): DocRecord {
  const text = content ?? `${name} :: demo placeholder :: ${id}`;
  return { id, name, category, sha256: sha256Hex(text), size: text.length, uploadedBy: OPERATOR_NAME, uploadedAt: at };
}

function partner(id: string, name: string, city: string, committedRupees: number, extra: Partial<Partner> = {}): Partner {
  return { id, name, city, kyc: "verified", committed: rs(committedRupees), ...extra };
}

/* ---------------- Project 1: operating building ---------------- */

function hoskote(): Project {
  const partners: Partner[] = [
    partner("p1", OPERATOR_NAME, "Singapore", 22_00_000, { isOperator: true }),
    partner("p2", "Arun Prakash", "Bengaluru", 22_00_000),
    partner("p3", "Meena Raghavan", "Chennai", 22_00_000),
    partner("p4", "Siddharth Rao", "Bengaluru", 22_00_000),
    partner("p5", "Kavya Nair", "Dubai", 22_00_000),
    partner("p6", "Farhan Ali", "Hyderabad", 22_00_000),
    partner("p7", "Deepa Iyer", "Bengaluru", 22_00_000),
    partner("p8", "Vignesh S", "Chennai", 22_00_000),
  ];
  const settings = { ...defaultSettings };
  const L = ledgerBuilder();

  partners.forEach((p, i) =>
    L.add({ ts: `2025-03-${String(3 + i).padStart(2, "0")}T10:00:00+05:30`, type: "contribution", direction: "in", amount: p.committed, memo: `Capital contribution — ${p.name}`, partnerId: p.id, actor: p.name }),
  );
  L.add({ ts: "2025-03-20T11:00:00+05:30", type: "operator_fee", direction: "out", amount: rs(2_64_000), memo: "Setup fee 1.5% of project cost (agreement cl. 4.2)" });
  L.add({ ts: "2025-04-02T12:00:00+05:30", type: "land", direction: "out", amount: rs(60_00_000), memo: "Land purchase, Sy. No. 112/3, Hoskote — paid to seller by RTGS" });
  L.add({ ts: "2025-04-02T12:30:00+05:30", type: "land", direction: "out", amount: rs(4_50_000), memo: "Stamp duty, cess and registration fee" });
  L.add({ ts: "2025-05-15T10:00:00+05:30", type: "approval_fee", direction: "out", amount: rs(3_00_000), memo: "Lawyer title report, plan sanction and approval fees" });

  const ms: Milestone[] = [
    ["Foundation", 12_00_000, 11_80_000],
    ["Plinth & ground slab", 10_00_000, 10_20_000],
    ["First & second floor slabs", 22_00_000, 21_60_000],
    ["Third floor slab & terrace", 14_00_000, 14_30_000],
    ["Brickwork, plumbing, electrical", 16_00_000, 15_50_000],
    ["Finishing, paint, fixtures", 14_00_000, 14_60_000],
  ].map(([name, b, a], i) => ({
    id: `h-m${i + 1}`, name: name as string, budget: rs(b as number), actual: rs(a as number), status: "paid",
    evidence: { photos: 6 + i, engineerCert: true, bill: true }, verifiedBy: "Er. Ramesh Gowda",
  }));
  ms.forEach((m, i) => {
    const month = 6 + i * 2; // Jun 2025 .. Apr 2026
    const ts = month <= 12 ? `2025-${String(month).padStart(2, "0")}-25T15:00:00+05:30` : `2026-${String(month - 12).padStart(2, "0")}-25T15:00:00+05:30`;
    L.add({ ts, type: "construction", direction: "out", amount: m.actual, memo: `Milestone paid: ${m.name} (photos, engineer certificate, bill on file)`, ref: m.id });
    L.add({ ts, type: "operator_fee", direction: "out", amount: Math.round(m.actual * 0.06), memo: `Construction management fee 6% — ${m.name}`, ref: m.id });
  });
  L.add({ ts: "2026-05-10T10:00:00+05:30", type: "expense", direction: "out", amount: rs(8_00_000), memo: "Furnishing for 8 co-living rooms" });

  const units = [
    ...[1, 2, 3, 4].map((n) => ({ id: `s${n}`, label: `Shop ${n}`, kind: "shop" as const, rent: rs(18_000) })),
    ...[101, 102, 103, 104, 201, 202, 203, 204].map((n) => ({ id: `r${n}`, label: `Room ${n}`, kind: "room" as const, rent: rs(9_500) })),
  ];
  const tenants: Record<string, string> = {
    s1: "Sri Lakshmi Medicals", s2: "Hoskote Fresh Mart", s3: "QuickFix Mobiles", s4: "Annapoorna Tiffins",
    r101: "Rahul M", r102: "Sneha K", r103: "Imran B", r104: "Ajay T", r201: "Priya D", r202: "Karthik V", r203: "Nisha P",
  };
  const paidOct = new Set(["s1", "s2", "s4", "r101", "r102", "r103", "r201", "r202"]);

  // Rent Jul–Sep 2026, then a Q3 distribution.
  const occupied = units.filter((u) => tenants[u.id]);
  const monthlyRent = occupied.reduce((s, u) => s + u.rent, 0);
  for (const m of ["07", "08", "09"]) {
    L.add({ ts: `2026-${m}-05T18:00:00+05:30`, type: "rent", direction: "in", amount: monthlyRent, memo: `Rent collected for ${m === "07" ? "July" : m === "08" ? "August" : "September"} 2026 (${occupied.length} units)` });
    L.add({ ts: `2026-${m}-12T18:00:00+05:30`, type: "expense", direction: "out", amount: rs(6_200), memo: "Common area power, water, cleaning" });
  }
  L.add({ ts: "2026-08-19T12:00:00+05:30", type: "maintenance", direction: "out", amount: rs(8_500), memo: "Water pump motor rewinding (ticket T-101)", ref: "T-101" });

  const gross = monthlyRent * 3;
  const expenses = rs(6_200) * 3 + rs(8_500);
  const calc = calcDistribution(gross, expenses, settings);
  const holdings = capTable(partners, L.get());
  const payouts = splitByCapital(calc.distributable, holdings);
  L.add({ ts: "2026-10-05T10:00:00+05:30", type: "reserve", direction: "none", amount: calc.reserve, memo: "Q3 2026 maintenance reserve set aside (10% of rent)" });
  L.add({ ts: "2026-10-05T10:05:00+05:30", type: "operator_fee", direction: "out", amount: calc.fee, memo: "Q3 2026 property management fee (8% of rent)" });
  payouts.forEach((p) =>
    L.add({ ts: "2026-10-05T10:10:00+05:30", type: "distribution", direction: "out", amount: p.amount, partnerId: p.partnerId, memo: `Q3 2026 payout — ${partners.find((x) => x.id === p.partnerId)!.name}`, ref: "D-2026Q3" }),
  );
  for (const id of paidOct) {
    const u = units.find((x) => x.id === id)!;
    L.add({ ts: "2026-10-06T17:00:00+05:30", type: "rent", direction: "in", amount: u.rent, memo: `October 2026 rent — ${u.label} (${tenants[id]})`, ref: id });
  }

  return {
    id: "hoskote-commons",
    name: "Hoskote Commons",
    location: "Hoskote, East Bengaluru",
    buildingType: "G+3 · 4 shops + 8 co-living rooms",
    plot: "30x40 (1,200 sq ft), Hoskote PA approved layout",
    stage: 11,
    stageLog: [
      ["2025-01-10", 1], ["2025-02-15", 2], ["2025-02-28", 3], ["2025-03-01", 4], ["2025-03-15", 5], ["2025-04-05", 6],
      ["2025-05-20", 7], ["2026-04-28", 8], ["2026-05-30", 9], ["2026-06-30", 10],
    ].map(([d, s]) => ({ stage: s as number, by: OPERATOR_NAME, at: `${d}T10:00:00+05:30` })),
    targetCapital: rs(1_76_00_000),
    partners,
    ledger: L.get(),
    milestones: ms,
    units: units.map((u) => ({ ...u, tenant: tenants[u.id], leaseEnd: tenants[u.id] ? (u.kind === "shop" ? "2029-06-30" : "2027-05-31") : undefined, paidThisMonth: paidOct.has(u.id) })),
    tickets: [
      { id: "T-101", title: "Water pump motor not starting", estimate: rs(9_000), finalCost: rs(8_500), status: "done", raisedBy: "Rahul M (Room 101)", createdAt: "2026-08-16T09:00:00+05:30", approvedBy: OPERATOR_NAME, beforePhotos: 2, afterPhotos: 2, billAttached: true },
      { id: "T-102", title: "Terrace waterproofing before monsoon", estimate: rs(1_20_000), status: "awaiting_vote", raisedBy: OPERATOR_NAME, createdAt: "2026-10-12T11:00:00+05:30", voteId: "V-3", beforePhotos: 5, afterPhotos: 0, billAttached: false },
      { id: "T-103", title: "Shop 3 rolling shutter jammed", unitId: "s3", estimate: rs(6_000), status: "open", raisedBy: "QuickFix Mobiles (Shop 3)", createdAt: "2026-10-16T16:30:00+05:30", beforePhotos: 1, afterPhotos: 0, billAttached: false },
    ],
    votes: [
      { id: "V-1", title: "Appoint Sai Constructions as contractor", detail: "Lowest of 3 quotes at ₹2,200/sq ft, fixed price, 18-month schedule.", kind: "ordinary", status: "passed", createdAt: "2025-05-05T10:00:00+05:30", closesAt: "2025-05-12T10:00:00+05:30", ballots: { p1: "yes", p2: "yes", p3: "yes", p4: "no", p5: "yes", p6: "yes", p7: "abstain", p8: "yes" } },
      { id: "V-2", title: "Approve 2026–27 operating budget", detail: "₹2.4 L per year for utilities, insurance, property tax and routine upkeep.", kind: "ordinary", status: "passed", createdAt: "2026-06-20T10:00:00+05:30", closesAt: "2026-06-27T10:00:00+05:30", ballots: { p1: "yes", p2: "yes", p3: "yes", p4: "yes", p5: "yes", p6: "yes", p7: "yes", p8: "yes" } },
      { id: "V-3", title: "Terrace waterproofing — ₹1,20,000", detail: "Above the ₹25,000 operator limit, so partners decide. Two quotes attached; recommended: Dr. Fixit applied system with 7-year warranty.", kind: "ordinary", status: "open", createdAt: "2026-10-12T11:00:00+05:30", closesAt: "2026-10-19T11:00:00+05:30", ref: "T-102", ballots: { p1: "yes", p2: "yes", p3: "yes", p5: "no" } },
    ],
    documents: [
      doc("d1", "hoskote-feasibility.txt", "feasibility", "2025-01-10T10:00:00+05:30", SAMPLE_DOCS["hoskote-feasibility.txt"]),
      doc("d2", "hoskote-title-report.txt", "title", "2025-02-27T10:00:00+05:30", SAMPLE_DOCS["hoskote-title-report.txt"]),
      doc("d3", "LLP agreement — signed by 8 partners.pdf", "agreement", "2025-03-01T10:00:00+05:30"),
      doc("d4", "Sale deed — registered, Hoskote SRO.pdf", "sale_deed", "2025-04-05T10:00:00+05:30"),
      doc("d5", "E-Khata — LLP name.pdf", "sale_deed", "2025-04-30T10:00:00+05:30"),
      doc("d6", "Sanctioned building plan.pdf", "plan_sanction", "2025-05-20T10:00:00+05:30"),
      doc("d7", "Engineer certificates — all milestones.pdf", "construction", "2026-04-28T10:00:00+05:30"),
      doc("d8", "Completion certificate.pdf", "completion", "2026-05-30T10:00:00+05:30"),
      doc("d9", "Lease agreements — 11 tenants.pdf", "lease", "2026-06-30T10:00:00+05:30"),
      doc("d10", "Q3 2026 distribution statement.pdf", "statement", "2026-10-05T10:00:00+05:30"),
    ],
    distributions: [
      { id: "D-2026Q3", period: "Jul–Sep 2026", ...calc, payouts, createdAt: "2026-10-05T10:10:00+05:30" },
    ],
    settings,
  };
}

/* ---------------- Project 2: under construction ---------------- */

function devanahalli(): Project {
  const partners: Partner[] = [
    partner("p1", OPERATOR_NAME, "Singapore", 30_00_000, { isOperator: true }),
    partner("q2", "Rohit Menon", "Bengaluru", 25_00_000),
    partner("q3", "Lakshmi Narayan", "Mysuru", 25_00_000),
    partner("q4", "Anand Kumar", "Bengaluru", 25_00_000),
    partner("q5", "Shalini Gupta", "Pune", 20_00_000),
    partner("q6", "Joseph Mathew", "Kochi", 25_00_000),
  ];
  const L = ledgerBuilder();
  partners.forEach((p, i) =>
    L.add({ ts: `2025-11-${String(4 + i).padStart(2, "0")}T10:00:00+05:30`, type: "contribution", direction: "in", amount: p.committed, memo: `Capital contribution — ${p.name}`, partnerId: p.id, actor: p.name }),
  );
  L.add({ ts: "2025-11-20T10:00:00+05:30", type: "operator_fee", direction: "out", amount: rs(2_25_000), memo: "Setup fee 1.5% of project cost" });
  L.add({ ts: "2025-12-10T12:00:00+05:30", type: "land", direction: "out", amount: rs(72_00_000), memo: "Land purchase, 4,000 sq ft BIAAPA-approved industrial plot, Devanahalli" });
  L.add({ ts: "2025-12-10T12:30:00+05:30", type: "land", direction: "out", amount: rs(5_40_000), memo: "Stamp duty, cess and registration fee" });
  L.add({ ts: "2026-02-01T10:00:00+05:30", type: "approval_fee", direction: "out", amount: rs(2_50_000), memo: "Title report, BIAAPA plan sanction, fire NOC" });

  const ms: Milestone[] = [
    { id: "d-m1", name: "Site clearing & foundation", budget: rs(14_00_000), actual: rs(13_70_000), status: "paid", evidence: { photos: 8, engineerCert: true, bill: true }, verifiedBy: "Er. Kavitha Shenoy" },
    { id: "d-m2", name: "Plinth beam & floor bed", budget: rs(9_00_000), actual: rs(9_25_000), status: "paid", evidence: { photos: 6, engineerCert: true, bill: true }, verifiedBy: "Er. Kavitha Shenoy" },
    { id: "d-m3", name: "Steel columns & trusses", budget: rs(16_00_000), actual: rs(15_80_000), status: "verified", evidence: { photos: 9, engineerCert: true, bill: true }, verifiedBy: "Er. Kavitha Shenoy" },
    { id: "d-m4", name: "Roof sheeting & side cladding", budget: rs(11_00_000), actual: 0, status: "in_progress", evidence: { photos: 2, engineerCert: false, bill: false } },
    { id: "d-m5", name: "Flooring & dock levellers", budget: rs(7_00_000), actual: 0, status: "pending", evidence: { photos: 0, engineerCert: false, bill: false } },
    { id: "d-m6", name: "Electrical, fire safety, office block", budget: rs(5_00_000), actual: 0, status: "pending", evidence: { photos: 0, engineerCert: false, bill: false } },
  ];
  L.add({ ts: "2026-04-18T15:00:00+05:30", type: "construction", direction: "out", amount: ms[0].actual, memo: "Milestone paid: Site clearing & foundation", ref: "d-m1" });
  L.add({ ts: "2026-06-22T15:00:00+05:30", type: "construction", direction: "out", amount: ms[1].actual, memo: "Milestone paid: Plinth beam & floor bed", ref: "d-m2" });

  return {
    id: "devanahalli-shed",
    name: "Devanahalli Logistics Shed",
    location: "Devanahalli, North Bengaluru",
    buildingType: "6,000 sq ft warehouse + small office",
    plot: "4,000 sq ft industrial plot, BIAAPA approved",
    stage: 8,
    stageLog: [
      ["2025-09-01", 1], ["2025-10-20", 2], ["2025-10-30", 3], ["2025-11-01", 4], ["2025-11-12", 5], ["2025-12-15", 6], ["2026-03-01", 7],
    ].map(([d, s]) => ({ stage: s as number, by: OPERATOR_NAME, at: `${d}T10:00:00+05:30` })),
    targetCapital: rs(1_50_00_000),
    partners,
    ledger: L.get(),
    milestones: ms,
    units: [{ id: "w1", label: "Warehouse bay", kind: "shed", rent: rs(1_20_000), paidThisMonth: false }],
    tickets: [],
    votes: [
      { id: "V-1", title: "Appoint Kaveri Steel Structures", detail: "Pre-engineered building, ₹62 L fixed price, 10 months.", kind: "ordinary", status: "passed", createdAt: "2026-02-10T10:00:00+05:30", closesAt: "2026-02-17T10:00:00+05:30", ballots: { p1: "yes", q2: "yes", q3: "yes", q4: "yes", q5: "no", q6: "yes" } },
      { id: "V-2", title: "Pre-lease to a 3PL operator at ₹1.2 L/month", detail: "9-year lease, 5% yearly escalation, 6 months deposit. Special resolution as it commits the whole building.", kind: "special", status: "open", createdAt: "2026-10-14T10:00:00+05:30", closesAt: "2026-10-21T10:00:00+05:30", ballots: { p1: "yes", q2: "yes", q4: "yes" } },
    ],
    documents: [
      doc("e1", "Feasibility — Devanahalli shed.pdf", "feasibility", "2025-09-01T10:00:00+05:30"),
      doc("e2", "Title report — Sy. No. 45.pdf", "title", "2025-10-30T10:00:00+05:30"),
      doc("e3", "LLP agreement — 6 partners.pdf", "agreement", "2025-11-01T10:00:00+05:30"),
      doc("e4", "Sale deed — Devanahalli SRO.pdf", "sale_deed", "2025-12-15T10:00:00+05:30"),
      doc("e5", "BIAAPA plan sanction.pdf", "plan_sanction", "2026-03-01T10:00:00+05:30"),
      doc("e6", "Columns & trusses — engineer certificate.pdf", "construction", "2026-10-09T10:00:00+05:30"),
    ],
    distributions: [],
    settings: { ...defaultSettings },
  };
}

/* ---------------- Project 3: raising partners ---------------- */

function kanakapura(): Project {
  return {
    id: "kanakapura-coliving",
    name: "Kanakapura Road Co-living",
    location: "Kanakapura Road, South Bengaluru",
    buildingType: "G+3 · 24 co-living beds",
    plot: "30x50 (1,500 sq ft), BMRDA / Kanakapura PA layout",
    stage: 2,
    stageLog: [{ stage: 1, by: OPERATOR_NAME, at: "2026-09-10T10:00:00+05:30" }],
    targetCapital: rs(1_60_00_000),
    partners: [
      partner("p1", OPERATOR_NAME, "Singapore", 30_00_000, { isOperator: true }),
      partner("k2", "Bhavana Reddy", "Bengaluru", 25_00_000),
      partner("k3", "Suresh Babu", "Chennai", 20_00_000),
      partner("k4", "Nandini Hegde", "Bengaluru", 25_00_000, { kyc: "pending" }),
    ],
    ledger: [],
    milestones: [],
    units: [],
    tickets: [],
    votes: [],
    documents: [doc("k1", "Feasibility — Kanakapura co-living.pdf", "feasibility", "2026-09-10T10:00:00+05:30")],
    distributions: [],
    settings: { ...defaultSettings },
  };
}

export function seedProjects(): Project[] {
  return [hoskote(), devanahalli(), kanakapura()];
}
