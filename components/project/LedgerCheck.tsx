"use client";

import { useState } from "react";
import { verifyLedger, type VerifyResult } from "@/lib/ledger";
import type { Project } from "@/lib/types";
import { Button, Hash, Seal } from "../ui";

export function LedgerCheck({ p }: { p: Project }) {
  const [result, setResult] = useState<(VerifyResult & { at: number; of: Project["ledger"] }) | null>(null);
  // A result only counts for the exact ledger it checked, so a stale "verified" is never shown.
  const current = result && result.of === p.ledger ? result : null;

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
      {current ? (
        <Seal key={current.at} ok={current.ok} entries={current.ok ? current.checked : p.ledger.length} animate />
      ) : (
        <div className="grid h-24 w-24 shrink-0 place-items-center rounded-full border-2 border-dashed border-line text-center text-xs text-granite">Not checked yet</div>
      )}
      <div className="space-y-2">
        {current ? (
          current.ok ? (
            <p className="text-sm">
              Re-computed all <strong>{current.checked}</strong> fingerprints in your browser. Every entry is exactly as first recorded. Latest fingerprint <Hash value={current.head} />.
            </p>
          ) : (
            <p className="text-sm text-red">
              <strong>Entry #{current.brokenAt} does not match its fingerprint.</strong> {current.reason}. Every entry after it is untrusted until the operator explains the change.
            </p>
          )
        ) : (
          <p className="text-sm text-granite">
            Each entry carries a SHA-256 fingerprint of itself plus the entry before it. Change any old amount and the chain breaks. Check it yourself — nothing is sent to a server.
          </p>
        )}
        <Button tone="stamp" onClick={() => setResult({ ...verifyLedger(p.ledger), at: Date.now(), of: p.ledger })} disabled={!p.ledger.length}>
          Verify ledger
        </Button>
      </div>
    </div>
  );
}
