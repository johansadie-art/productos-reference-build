import { ProjectContext } from "./types";
import type { Store } from "./storeProvider";

// Browser localStorage backend — used ONLY by the static GitHub Pages demo
// (components/StaticDemoApp.tsx), which has no server to talk to at all.
// Same Store shape as lib/fsStore.ts, so lib/orchestrator.ts, lib/seed.ts,
// etc. are unaware of which one is actually running underneath them.
//
// Data is per-browser, local-only, and not synced anywhere — this is a
// demo, not a real multi-user deployment of this app (see docs/AGENTS.md).

const KEY_PREFIX = "pdlc-demo:project:";

function keyFor(id: string) {
  return `${KEY_PREFIX}${id}`;
}

export const localStore: Store = {
  saveProject(project) {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(keyFor(project.id), JSON.stringify(project));
  },

  loadProject(id): ProjectContext | null {
    if (typeof window === "undefined") return null;
    const raw = window.localStorage.getItem(keyFor(id));
    return raw ? (JSON.parse(raw) as ProjectContext) : null;
  },

  listProjects(): ProjectContext[] {
    if (typeof window === "undefined") return [];
    const out: ProjectContext[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (!k || !k.startsWith(KEY_PREFIX)) continue;
      const raw = window.localStorage.getItem(k);
      if (raw) out.push(JSON.parse(raw) as ProjectContext);
    }
    return out.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  },
};
