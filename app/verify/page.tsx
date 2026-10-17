"use client";

import { useState } from "react";
import { useStore } from "@/components/store";
import { Badge, Hash, Panel, Seal, cx } from "@/components/ui";
import { fmtDate } from "@/components/project/shared";
import { hashFile } from "@/lib/fileHash";

export default function VerifyPage() {
  const { projects } = useStore();
  const [state, setState] = useState<{ name: string; hash: string } | null>(null);
  const [over, setOver] = useState(false);

  const check = async (file: File | undefined) => {
    if (!file) return;
    setState({ name: file.name, hash: await hashFile(file) });
  };

  const match = state
    ? projects.flatMap((p) => p.documents.filter((d) => d.sha256 === state.hash).map((d) => ({ p, d })))[0]
    : undefined;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <h1 className="text-3xl font-extrabold sm:text-4xl">Check a document</h1>
        <p className="mt-1 max-w-xl text-granite">
          Got a sale deed, agreement or statement by WhatsApp or email? Drop it here to see whether it is exactly the version recorded in the vault. The file stays on your device.
        </p>
      </header>

      <label
        onDragOver={(e) => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); check(e.dataTransfer.files?.[0]); }}
        className={cx(
          "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed bg-panel px-6 py-12 text-center",
          over ? "border-survey bg-survey-soft" : "border-line hover:border-granite",
        )}
      >
        <span className="text-lg font-semibold">Drop a file here or choose one</span>
        <span className="text-sm text-granite">Any type, any size</span>
        <input type="file" className="sr-only" onChange={(e) => check(e.target.files?.[0])} />
      </label>

      {state && (
        <Panel>
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <Seal key={state.hash} ok={!!match} entries={match ? 1 : 0} animate />
            <div className="min-w-0 space-y-2">
              {match ? (
                <>
                  <p className="text-lg font-bold">This is the recorded version.</p>
                  <p className="text-sm">
                    Matches <strong>{match.d.name}</strong> in <strong>{match.p.name}</strong>, added by {match.d.uploadedBy} on {fmtDate(match.d.uploadedAt)}.
                  </p>
                  <Badge tone="stamp">Fingerprints match</Badge>
                </>
              ) : (
                <>
                  <p className="text-lg font-bold text-red">No match in the vault.</p>
                  <p className="text-sm">Even a single changed character gives a different fingerprint. Ask the operator for the original, or compare with the copy in the project&apos;s Documents tab.</p>
                </>
              )}
              <p className="text-xs text-granite">{state.name} · SHA-256 <Hash value={state.hash} n={16} /></p>
            </div>
          </div>
        </Panel>
      )}

      <Panel title="Try it">
        <p className="text-sm text-granite">
          Download the sample <a className="font-semibold text-survey underline" href="/samples/hoskote-title-report.txt" download>Hoskote title report</a> and drop it above — it matches. Then edit one word in it and drop it again — it won&apos;t.
        </p>
      </Panel>
    </div>
  );
}
