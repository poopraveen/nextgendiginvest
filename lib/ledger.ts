import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex, utf8ToBytes } from "@noble/hashes/utils.js";
import type { LedgerDraft, LedgerEntry } from "./types";

export const GENESIS_HASH = "0".repeat(64);

export function sha256Hex(input: string | Uint8Array): string {
  const bytes = typeof input === "string" ? utf8ToBytes(input) : input;
  return bytesToHex(sha256(bytes));
}

/** JSON with sorted keys and no undefined values, so the same entry always hashes the same. */
export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj)
    .filter((k) => obj[k] !== undefined)
    .sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${canonicalJson(obj[k])}`).join(",")}}`;
}

/** The part of an entry that is protected by the hash. */
function body(e: LedgerDraft & { seq: number }) {
  return {
    seq: e.seq,
    ts: e.ts,
    type: e.type,
    direction: e.direction,
    amount: e.amount,
    memo: e.memo,
    actor: e.actor,
    partnerId: e.partnerId,
    ref: e.ref,
  };
}

export function hashEntry(prevHash: string, e: LedgerDraft & { seq: number }): string {
  return sha256Hex(prevHash + canonicalJson(body(e)));
}

export function appendEntry(ledger: LedgerEntry[], draft: LedgerDraft): LedgerEntry[] {
  if (!Number.isInteger(draft.amount) || draft.amount < 0) {
    throw new Error("Amount must be a non-negative whole number of paise");
  }
  const last = ledger[ledger.length - 1];
  const seq = last ? last.seq + 1 : 1;
  const prevHash = last ? last.hash : GENESIS_HASH;
  const hash = hashEntry(prevHash, { ...draft, seq });
  return [...ledger, { ...draft, seq, prevHash, hash }];
}

export type VerifyResult =
  | { ok: true; checked: number; head: string }
  | { ok: false; checked: number; brokenAt: number; reason: string };

/** Re-computes every hash from the first entry. Any edit, insert or delete of a past entry is detected. */
export function verifyLedger(ledger: LedgerEntry[]): VerifyResult {
  let prev = GENESIS_HASH;
  for (let i = 0; i < ledger.length; i++) {
    const e = ledger[i];
    if (e.seq !== i + 1) {
      return { ok: false, checked: i, brokenAt: i + 1, reason: "Entry missing or out of order" };
    }
    if (e.prevHash !== prev) {
      return { ok: false, checked: i, brokenAt: e.seq, reason: "Link to previous entry does not match" };
    }
    if (hashEntry(prev, e) !== e.hash) {
      return { ok: false, checked: i, brokenAt: e.seq, reason: "Entry contents were changed after recording" };
    }
    prev = e.hash;
  }
  return { ok: true, checked: ledger.length, head: prev };
}

export function balance(ledger: LedgerEntry[]): number {
  return ledger.reduce((sum, e) => sum + (e.direction === "in" ? e.amount : e.direction === "out" ? -e.amount : 0), 0);
}
