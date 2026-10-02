import { ProjectContext } from "./types";
import { getStore } from "./storeProvider";

// Thin wrapper preserving the original function-call API so every existing
// call site (lib/orchestrator.ts, the API routes, lib/seed.ts) keeps working
// completely unchanged. The actual backend is pluggable — see
// lib/storeProvider.ts (defaults to lib/fsStore.ts; the static demo swaps in
// lib/localStore.ts instead). Crucially, THIS file has no top-level `fs`
// import anymore, so it's safe to pull into a browser bundle.

export function saveProject(project: ProjectContext): void {
  getStore().saveProject(project);
}

export function loadProject(id: string): ProjectContext | null {
  return getStore().loadProject(id);
}

export function listProjects(): ProjectContext[] {
  return getStore().listProjects();
}
