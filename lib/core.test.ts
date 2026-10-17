import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { appendEntry, balance, GENESIS_HASH, sha256Hex, verifyLedger } from "./ledger";
import { calcDistribution, capTable, inr, rentRoll, rs, splitByCapital } from "./finance";
import { tally } from "./governance";
import { seedProjects } from "./seed";
import * as A from "./actions";
import { canAdvance } from "./workflow";
import { SAMPLE_DOCS } from "./sampleDocs";
import type { LedgerEntry, Vote } from "./types";

const draft = (amount: number, memo = "x") => ({ ts: "2026-01-01T00:00:00Z", type: "rent" as const, direction: "in" as const, amount, memo, actor: "t" });

describe("hash-chained ledger", () => {
  it("links entries and verifies a clean chain", () => {
    let l: LedgerEntry[] = [];
    l = appendEntry(l, draft(100));
    l = appendEntry(l, draft(200));
    expect(l[0].prevHash).toBe(GENESIS_HASH);
    expect(l[1].prevHash).toBe(l[0].hash);
    expect(verifyLedger(l)).toMatchObject({ ok: true, checked: 2 });
  });

  it("detects an edited amount", () => {
    let l: LedgerEntry[] = [];
    for (let i = 1; i <= 5; i++) l = appendEntry(l, draft(i * 100));
    l[2] = { ...l[2], amount: 999_999 };
    expect(verifyLedger(l)).toMatchObject({ ok: false, brokenAt: 3 });
  });

  it("detects a deleted entry and a forged re-hash of one entry", () => {
    let l: LedgerEntry[] = [];
    for (let i = 1; i <= 4; i++) l = appendEntry(l, draft(i));
    expect(verifyLedger([l[0], l[2], l[3]]).ok).toBe(false);
    // Forger recomputes entry 2's own hash, but entry 3 still points at the old one.
    const forged = appendEntry(l.slice(0, 1), draft(777));
    expect(verifyLedger([...forged, l[2], l[3]])).toMatchObject({ ok: false, brokenAt: 3 });
  });

  it("rejects fractional or negative paise", () => {
    expect(() => appendEntry([], draft(10.5))).toThrow();
    expect(() => appendEntry([], draft(-1))).toThrow();
  });
});

describe("money", () => {
  it("splits to the paisa and never loses or invents money", () => {
    const holdings = [{ partnerId: "a", paid: 1 }, { partnerId: "b", paid: 1 }, { partnerId: "c", paid: 1 }];
    const out = splitByCapital(100, holdings);
    expect(out.reduce((s, x) => s + x.amount, 0)).toBe(100);
    expect(out.map((x) => x.amount).sort()).toEqual([33, 33, 34]);
  });

  it("handles crore-scale amounts without overflow", () => {
    const holdings = [{ partnerId: "a", paid: rs(1_23_45_678) }, { partnerId: "b", paid: rs(98_76_543) }];
    const amount = rs(4_56_78_901.37);
    const out = splitByCapital(amount, holdings);
    expect(out[0].amount + out[1].amount).toBe(amount);
  });

  it("computes reserve, fee and distributable", () => {
    const c = calcDistribution(rs(1_00_000), rs(10_000), { reservePct: 10, mgmtFeePct: 8 });
    expect(c).toEqual({ gross: rs(1_00_000), expenses: rs(10_000), reserve: rs(10_000), fee: rs(8_000), distributable: rs(72_000) });
    expect(calcDistribution(rs(1_000), rs(5_000), { reservePct: 10, mgmtFeePct: 8 }).distributable).toBe(0);
  });

  it("formats Indian rupees", () => {
    expect(inr(rs(17_600_000))).toBe("₹1,76,00,000");
    expect(inr(rs(17_600_000), true)).toBe("₹1.76 Cr");
    expect(inr(rs(2_200_000), true)).toBe("₹22 L");
  });
});

describe("voting", () => {
  const holdings = [
    { partnerId: "a", name: "A", committed: 0, paid: 50, share: 0.5 },
    { partnerId: "b", name: "B", committed: 0, paid: 25, share: 0.25 },
    { partnerId: "c", name: "C", committed: 0, paid: 25, share: 0.25 },
  ];
  const s = { ordinaryThreshold: 50, specialThreshold: 75 };
  const v = (kind: Vote["kind"], ballots: Vote["ballots"]): Vote => ({ id: "v", title: "", detail: "", kind, ballots, status: "open", createdAt: "", closesAt: "" });

  it("needs more than 50% of total ownership for ordinary", () => {
    expect(tally(v("ordinary", { a: "yes" }), holdings, s).passed).toBe(false);
    expect(tally(v("ordinary", { a: "yes", b: "yes" }), holdings, s).passed).toBe(true);
  });

  it("needs at least 75% for special", () => {
    expect(tally(v("special", { a: "yes", b: "yes" }), holdings, s)).toMatchObject({ passed: true, decided: true });
    expect(tally(v("special", { a: "yes", b: "no" }), holdings, s)).toMatchObject({ passed: false, decided: false });
    expect(tally(v("special", { b: "no", c: "no" }), holdings, s)).toMatchObject({ passed: false, decided: true });
  });
});

describe("seed data", () => {
  const projects = seedProjects();

  it("has valid ledgers that never go below zero", () => {
    for (const p of projects) {
      expect(verifyLedger(p.ledger).ok).toBe(true);
      let running = 0;
      for (const e of p.ledger) {
        running += e.direction === "in" ? e.amount : e.direction === "out" ? -e.amount : 0;
        expect(running).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it("gives the Hoskote partners equal 12.5% shares and a paisa-exact payout", () => {
    const h = projects[0];
    expect(capTable(h.partners, h.ledger).every((r) => Math.abs(r.share - 0.125) < 1e-12)).toBe(true);
    const d = h.distributions[0];
    expect(d.payouts.reduce((s, x) => s + x.amount, 0)).toBe(d.distributable);
    expect(rentRoll(h.units).occupied).toBe(11);
  });

  it("serves sample files whose fingerprints match the vault", () => {
    const h = projects[0];
    for (const [name, content] of Object.entries(SAMPLE_DOCS)) {
      const onDisk = readFileSync(path.join(__dirname, "..", "public", "samples", name), "utf8");
      expect(onDisk).toBe(content);
      expect(h.documents.find((d) => d.name === name)!.sha256).toBe(sha256Hex(onDisk));
    }
  });
});

describe("workflow actions", () => {
  it("routes big repairs to a vote and closes the ticket when the vote passes", () => {
    let p = seedProjects()[0];
    p = A.raiseTicket(p, "Replace lift motor", rs(80_000), "Praveen Kumar");
    const t = p.tickets[p.tickets.length - 1];
    expect(t.status).toBe("awaiting_vote");
    expect(() => A.approveTicket(p, t.id, "Praveen Kumar")).toThrow(/vote/);
    for (const id of ["p1", "p2", "p3", "p4", "p5"]) p = A.castBallot(p, t.voteId!, id, "yes");
    expect(p.votes.find((v) => v.id === t.voteId)!.status).toBe("passed");
    expect(p.tickets.find((x) => x.id === t.id)!.status).toBe("approved");
    p = A.completeTicket(p, t.id, rs(79_000), "Praveen Kumar");
    expect(p.tickets.find((x) => x.id === t.id)!.status).toBe("done");
    expect(verifyLedger(p.ledger).ok).toBe(true);
  });

  it("lets the operator approve small repairs and blocks big overruns", () => {
    let p = seedProjects()[0];
    p = A.approveTicket(p, "T-103", "Praveen Kumar");
    expect(() => A.completeTicket(p, "T-103", rs(9_000), "Praveen Kumar")).toThrow(/10%/);
    p = A.completeTicket(p, "T-103", rs(6_200), "Praveen Kumar");
    expect(p.tickets.find((x) => x.id === "T-103")!.status).toBe("done");
  });

  it("releases construction money only after evidence and verification", () => {
    let p = seedProjects()[1];
    expect(() => A.payMilestone(p, "d-m4", "Praveen Kumar")).toThrow();
    p = A.payMilestone(p, "d-m3", "Praveen Kumar");
    p = A.submitEvidence(p, "d-m4", "Praveen Kumar", rs(10_80_000));
    expect(() => A.payMilestone(p, "d-m4", "Praveen Kumar")).toThrow(/verified/);
    p = A.verifyMilestone(p, "d-m4", "Er. Kavitha Shenoy");
    const before = balance(p.ledger);
    p = A.payMilestone(p, "d-m4", "Praveen Kumar");
    expect(before - balance(p.ledger)).toBe(rs(10_80_000));
  });

  it("distributes only rent since the last payout", () => {
    let p = seedProjects()[0];
    p = A.runDistribution(p, "Oct 2026", "Praveen Kumar");
    const d = p.distributions[p.distributions.length - 1];
    const octRent = p.units.filter((u) => u.paidThisMonth).reduce((s, u) => s + u.rent, 0);
    expect(d.gross).toBe(octRent);
    expect(() => A.runDistribution(p, "again", "Praveen Kumar")).toThrow(/No rent/);
  });

  it("blocks stage changes until the gate is met", () => {
    let p = seedProjects()[2];
    expect(canAdvance(p).ok).toBe(false); // commitments short + KYC pending
    expect(() => A.advanceStage(p, "Praveen Kumar")).toThrow();
  });

  it("tamper demo is caught by verification", () => {
    const p = A.tamperForDemo(seedProjects()[0]);
    expect(verifyLedger(p.ledger).ok).toBe(false);
  });
});
