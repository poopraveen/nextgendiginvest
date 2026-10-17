"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useStore } from "../store";
import { Badge, Field, Hash, Panel, Select } from "../ui";
import { fmtDate, usePermissions } from "./shared";
import { addDocument } from "@/lib/actions";
import { hashFile } from "@/lib/fileHash";
import type { DocCategory, Project } from "@/lib/types";

export const DOC_LABEL: Record<DocCategory, string> = {
  feasibility: "Feasibility",
  kyc: "KYC",
  title: "Title report",
  agreement: "Agreement",
  sale_deed: "Sale deed / Khata",
  plan_sanction: "Plan sanction",
  construction: "Construction",
  completion: "Completion",
  lease: "Lease",
  statement: "Statement",
  other: "Other",
};

export function DocsTab({ p }: { p: Project }) {
  const { run } = useStore();
  const can = usePermissions(p);
  const [category, setCategory] = useState<DocCategory>("other");
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    const sha256 = await hashFile(file);
    setBusy(false);
    run(p.id, (x) => addDocument(x, { name: file.name, category, sha256, size: file.size }, can.actor), `${file.name} added with its fingerprint`);
    if (fileRef.current) fileRef.current.value = "";
  };

  const docs = [...p.documents].sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));

  return (
    <div className="space-y-6">
      {can.operate && (
        <Panel title="Add a document">
          <div className="grid gap-4 md:grid-cols-[220px_1fr] md:items-end">
            <Field label="Kind of document">
              <Select value={category} onChange={(e) => setCategory(e.target.value as DocCategory)}>
                {Object.entries(DOC_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </Select>
            </Field>
            <Field label="File" hint="Your device works out the SHA-256 fingerprint. In this demo only the fingerprint is kept, not the file.">
              <input ref={fileRef} type="file" onChange={(e) => onFile(e.target.files?.[0])} disabled={busy} className="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-survey file:px-3 file:py-2 file:font-semibold file:text-panel" />
            </Field>
          </div>
        </Panel>
      )}

      <Panel
        title={`Document vault · ${p.documents.length}`}
        action={<Link href="/verify" className="text-sm font-semibold text-stamp underline underline-offset-2">Check a copy you were sent</Link>}
      >
        <div className="-mx-5 overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-granite">
                <th className="px-5 py-2 font-medium">Document</th>
                <th className="py-2 font-medium">Kind</th>
                <th className="py-2 font-medium">Added</th>
                <th className="px-5 py-2 font-medium">Fingerprint (SHA-256)</th>
              </tr>
            </thead>
            <tbody>
              {docs.map((d) => (
                <tr key={d.id} className="border-b border-line/70">
                  <td className="px-5 py-2.5">
                    {d.name.endsWith(".txt") ? (
                      <a href={`/samples/${d.name}`} download className="font-medium underline underline-offset-2">{d.name}</a>
                    ) : (
                      <span className="font-medium">{d.name}</span>
                    )}
                  </td>
                  <td className="py-2.5"><Badge>{DOC_LABEL[d.category]}</Badge></td>
                  <td className="py-2.5 whitespace-nowrap">{fmtDate(d.uploadedAt)}<div className="text-xs text-granite">{d.uploadedBy}</div></td>
                  <td className="px-5 py-2.5"><Hash value={d.sha256} n={12} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-xs text-granite">Files ending in .txt are sample copies you can download and check on the “Check a document” page.</p>
      </Panel>
    </div>
  );
}
