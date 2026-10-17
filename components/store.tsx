"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { seedProjects, OPERATOR_NAME } from "@/lib/seed";
import { RuleError } from "@/lib/actions";
import type { Project, Role } from "@/lib/types";

const KEY = "nextgendiginvest:v1";

export interface Viewer {
  role: Role;
  partnerId: string; // used when role is partner (or the operator's own partner id)
}

interface Store {
  projects: Project[];
  ready: boolean;
  viewer: Viewer;
  viewerName: string;
  setViewer: (v: Viewer) => void;
  /** Runs a pure action on one project; shows rule errors as a notice instead of crashing. */
  run: (projectId: string, fn: (p: Project) => Project, success?: string) => boolean;
  notice: { kind: "ok" | "error"; text: string } | null;
  clearNotice: () => void;
  resetDemo: () => void;
}

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [projects, setProjects] = useState<Project[]>(() => seedProjects());
  const [viewer, setViewerState] = useState<Viewer>({ role: "operator", partnerId: "p1" });
  const [ready, setReady] = useState(false);
  const [notice, setNotice] = useState<Store["notice"]>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const saved = JSON.parse(raw) as { projects: Project[]; viewer: Viewer };
        if (Array.isArray(saved.projects)) setProjects(saved.projects);
        if (saved.viewer) setViewerState(saved.viewer);
      }
    } catch {
      /* storage unavailable: run on demo data in memory */
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(KEY, JSON.stringify({ projects, viewer }));
    } catch {
      /* ignore */
    }
  }, [projects, viewer, ready]);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 4200);
    return () => clearTimeout(t);
  }, [notice]);

  const latest = useRef(projects);
  latest.current = projects;

  const run = useCallback<Store["run"]>((projectId, fn, success) => {
    const target = latest.current.find((p) => p.id === projectId);
    if (!target) return false;
    try {
      const next = fn(target);
      const updated = latest.current.map((p) => (p.id === projectId ? next : p));
      latest.current = updated;
      setProjects(updated);
      if (success) setNotice({ kind: "ok", text: success });
      return true;
    } catch (e) {
      setNotice({ kind: "error", text: e instanceof RuleError ? e.message : `Something went wrong: ${(e as Error).message}` });
      return false;
    }
  }, []);

  const value = useMemo<Store>(() => {
    const allPartners = projects.flatMap((p) => p.partners);
    const partnerName = allPartners.find((x) => x.id === viewer.partnerId)?.name ?? "Partner";
    return {
      projects,
      ready,
      viewer,
      viewerName: viewer.role === "operator" ? OPERATOR_NAME : viewer.role === "auditor" ? "CA auditor" : partnerName,
      setViewer: setViewerState,
      run,
      notice,
      clearNotice: () => setNotice(null),
      resetDemo: () => {
        setProjects(seedProjects());
        setNotice({ kind: "ok", text: "Demo data reset" });
      },
    };
  }, [projects, ready, viewer, run, notice]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const s = useContext(Ctx);
  if (!s) throw new Error("useStore must be used inside StoreProvider");
  return s;
}

export function useProject(id: string) {
  const { projects } = useStore();
  return projects.find((p) => p.id === id);
}
