import type { LedgerEntry, Partner, Paise, Settings, Unit } from "./types";

export interface Holding {
  partnerId: string;
  name: string;
  committed: Paise;
  paid: Paise;
  /** Ownership as a fraction 0..1 of total paid capital. */
  share: number;
}

export function capTable(partners: Partner[], ledger: LedgerEntry[]): Holding[] {
  const paid = new Map<string, number>();
  for (const e of ledger) {
    if (e.type === "contribution" && e.partnerId) {
      paid.set(e.partnerId, (paid.get(e.partnerId) ?? 0) + e.amount);
    }
  }
  const total = [...paid.values()].reduce((a, b) => a + b, 0);
  return partners.map((p) => {
    const amt = paid.get(p.id) ?? 0;
    return { partnerId: p.id, name: p.name, committed: p.committed, paid: amt, share: total ? amt / total : 0 };
  });
}

/**
 * Splits an amount by paid capital exactly to the paisa.
 * Uses integer (BigInt) maths and gives leftover paise to the largest remainders,
 * so the payouts always add up to the amount.
 */
export function splitByCapital(amount: Paise, holdings: Pick<Holding, "partnerId" | "paid">[]) {
  const total = holdings.reduce((s, h) => s + h.paid, 0);
  if (amount <= 0 || total === 0) return holdings.map((h) => ({ partnerId: h.partnerId, amount: 0 }));
  const A = BigInt(amount);
  const T = BigInt(total);
  const rows = holdings.map((h, i) => {
    const num = A * BigInt(h.paid);
    return { i, partnerId: h.partnerId, amount: Number(num / T), rem: num % T };
  });
  let left = amount - rows.reduce((s, r) => s + r.amount, 0);
  const order = [...rows].sort((a, b) => (b.rem > a.rem ? 1 : b.rem < a.rem ? -1 : a.i - b.i));
  for (const r of order) {
    if (left <= 0) break;
    r.amount += 1;
    left -= 1;
  }
  return rows.map(({ partnerId, amount }) => ({ partnerId, amount }));
}

export interface DistributionCalc {
  gross: Paise;
  expenses: Paise;
  reserve: Paise;
  fee: Paise;
  distributable: Paise;
}

export function calcDistribution(gross: Paise, expenses: Paise, s: Pick<Settings, "reservePct" | "mgmtFeePct">): DistributionCalc {
  const reserve = Math.round((gross * s.reservePct) / 100);
  const fee = Math.round((gross * s.mgmtFeePct) / 100);
  const distributable = Math.max(0, gross - expenses - reserve - fee);
  return { gross, expenses, reserve, fee, distributable };
}

export function rentRoll(units: Unit[]) {
  const occupied = units.filter((u) => u.tenant);
  const potential = units.reduce((s, u) => s + u.rent, 0);
  const contracted = occupied.reduce((s, u) => s + u.rent, 0);
  const collected = occupied.filter((u) => u.paidThisMonth).reduce((s, u) => s + u.rent, 0);
  return {
    units: units.length,
    occupied: occupied.length,
    occupancy: units.length ? occupied.length / units.length : 0,
    potential,
    contracted,
    collected,
    due: contracted - collected,
  };
}

export function sumBy(ledger: LedgerEntry[], types: LedgerEntry["type"][]) {
  return ledger.filter((e) => types.includes(e.type)).reduce((s, e) => s + e.amount, 0);
}

/** Indian number formatting: Rs 1,76,00,000 or compact Rs 1.76 Cr / Rs 22 L. */
export function inr(paise: Paise, compact = false): string {
  const rupees = paise / 100;
  if (compact) {
    const abs = Math.abs(rupees);
    if (abs >= 1e7) return `₹${trim(rupees / 1e7)} Cr`;
    if (abs >= 1e5) return `₹${trim(rupees / 1e5)} L`;
    if (abs >= 1e3) return `₹${trim(rupees / 1e3)} K`;
  }
  return "₹" + Math.round(rupees).toLocaleString("en-IN");
}

function trim(n: number) {
  return n.toFixed(2).replace(/\.?0+$/, "");
}

export const rs = (rupees: number): Paise => Math.round(rupees * 100);

export function pct(fraction: number, digits = 1) {
  return `${(fraction * 100).toFixed(digits).replace(/\.0+$/, "")}%`;
}
