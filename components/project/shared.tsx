"use client";

import { useStore } from "../store";
import type { Project } from "@/lib/types";
import { OPERATOR_NAME } from "@/lib/seed";

export function fmtDate(iso: string, withTime = false) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}) });
}

/** Parses a rupee amount typed by a person ("1,20,000" or "1.2L") into paise. Returns NaN if invalid. */
export function parseRupees(input: string): number {
  const t = input.trim().toLowerCase().replace(/[₹,\s]/g, "").replace(/^rs\.?/, "");
  const m = t.match(/^(\d+(?:\.\d+)?)(l|lakh|lakhs|cr|crore|k)?$/);
  if (!m) return NaN;
  const mult = m[2]?.startsWith("l") ? 1e5 : m[2]?.startsWith("c") ? 1e7 : m[2] === "k" ? 1e3 : 1;
  return Math.round(Number(m[1]) * mult * 100);
}

export function usePermissions(p: Project) {
  const { viewer, viewerName } = useStore();
  const isPartnerHere = p.partners.some((x) => x.id === viewer.partnerId);
  return {
    actor: viewer.role === "operator" ? OPERATOR_NAME : viewerName,
    operate: viewer.role === "operator",
    vote: viewer.role !== "auditor" && isPartnerHere,
    raise: viewer.role !== "auditor",
    partnerId: viewer.partnerId,
    role: viewer.role,
  };
}

export const TYPE_LABEL: Record<string, string> = {
  contribution: "Contribution",
  land: "Land",
  approval_fee: "Approvals",
  construction: "Construction",
  operator_fee: "Operator fee",
  rent: "Rent",
  expense: "Expense",
  maintenance: "Maintenance",
  reserve: "Reserve",
  distribution: "Payout",
  decision: "Decision",
};
