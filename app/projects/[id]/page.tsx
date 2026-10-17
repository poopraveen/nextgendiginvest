"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { useProject, useStore } from "@/components/store";
import { Badge, cx } from "@/components/ui";
import { StageTrack } from "@/components/StageTrack";
import { Overview } from "@/components/project/Overview";
import { LedgerTab } from "@/components/project/LedgerTab";
import { BuildTab } from "@/components/project/BuildTab";
import { RentTab } from "@/components/project/RentTab";
import { UpkeepTab } from "@/components/project/UpkeepTab";
import { VotesTab } from "@/components/project/VotesTab";
import { DocsTab } from "@/components/project/DocsTab";
import { PartnersTab } from "@/components/project/PartnersTab";
import { stageOf } from "@/lib/workflow";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "money", label: "Money" },
  { id: "build", label: "Construction" },
  { id: "rent", label: "Rent & payouts" },
  { id: "upkeep", label: "Maintenance" },
  { id: "votes", label: "Votes" },
  { id: "docs", label: "Documents" },
  { id: "partners", label: "Partners & agreement" },
] as const;

function ProjectView() {
  const { id } = useParams<{ id: string }>();
  const search = useSearchParams();
  const p = useProject(id);
  const { viewer } = useStore();

  if (!p) {
    return (
      <div className="mx-auto max-w-xl py-16 text-center">
        <h1 className="text-2xl font-bold">Project not found</h1>
        <p className="mt-2 text-granite">It may have been removed when the demo data was reset.</p>
        <Link href="/" className="mt-4 inline-block font-semibold text-survey underline">Back to portfolio</Link>
      </div>
    );
  }

  const tab = (TABS.find((t) => t.id === search.get("tab"))?.id ?? "overview") as (typeof TABS)[number]["id"];
  const openVotes = p.votes.filter((v) => v.status === "open").length;
  const openTickets = p.tickets.filter((t) => t.status === "open" || t.status === "awaiting_vote" || t.status === "approved").length;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-3xl font-extrabold sm:text-4xl">{p.name}</h1>
            <p className="mt-1 text-granite">{p.location} · {p.buildingType}</p>
            <p className="text-sm text-granite">{p.plot}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge tone="survey">Stage {p.stage} of 12: {stageOf(p.stage).name}</Badge>
            {viewer.role === "auditor" && <Badge>Read only</Badge>}
          </div>
        </div>
        <StageTrack stage={p.stage} />
      </header>

      <nav className="-mx-4 overflow-x-auto border-b border-line px-4 sm:mx-0 sm:px-0" aria-label="Project sections">
        <ul className="flex gap-1">
          {TABS.map((t) => {
            const count = t.id === "votes" ? openVotes : t.id === "upkeep" ? openTickets : 0;
            return (
              <li key={t.id}>
                <Link
                  href={`/projects/${p.id}?tab=${t.id}`}
                  scroll={false}
                  aria-current={tab === t.id ? "page" : undefined}
                  className={cx(
                    "-mb-px flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm whitespace-nowrap",
                    tab === t.id ? "border-survey font-semibold text-survey" : "border-transparent text-granite hover:text-ink",
                  )}
                >
                  {t.label}
                  {count > 0 && <span className="tabular rounded-full bg-stamp-soft px-1.5 text-xs font-bold text-stamp">{count}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {tab === "overview" && <Overview p={p} />}
      {tab === "money" && <LedgerTab p={p} />}
      {tab === "build" && <BuildTab p={p} />}
      {tab === "rent" && <RentTab p={p} />}
      {tab === "upkeep" && <UpkeepTab p={p} />}
      {tab === "votes" && <VotesTab p={p} />}
      {tab === "docs" && <DocsTab p={p} />}
      {tab === "partners" && <PartnersTab p={p} />}
    </div>
  );
}

export default function ProjectPage() {
  return (
    <Suspense>
      <ProjectView />
    </Suspense>
  );
}
