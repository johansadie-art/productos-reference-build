import { ProjectContext } from "./types";

/**
 * The persistence backend lib/orchestrator.ts reads/writes through. This
 * indirection exists so the SAME pipeline logic (lib/orchestrator.ts,
 * lib/seed.ts, the API routes) can run against two different backends
 * without any of those files knowing which one is active:
 *
 *   - fsStore.ts  — real filesystem JSON files, used by the full local app
 *     (via API routes, server-side only). This remains the default.
 *   - localStore.ts — browser localStorage, used ONLY by the static
 *     GitHub Pages demo (components/StaticDemoApp.tsx), which has no
 *     server at all (see docs/AGENTS.md, "static demo" follow-up).
 */
export interface Store {
  saveProject(project: ProjectContext): void;
  loadProject(id: string): ProjectContext | null;
  listProjects(): ProjectContext[];
}

let impl: Store | null = null;

/**
 * Explicitly swap the active backend. Call this once, before any pipeline
 * function (lib/orchestrator.ts) runs:
 *   - the full local app wires up lib/fsStore.ts, via
 *     lib/serverStoreBootstrap.ts, imported only by the (server-only)
 *     app/api/* route files
 *   - the static demo wires up lib/localStore.ts, via
 *     components/StaticDemoApp.tsx
 *
 * IMPORTANT: this file must NEVER import lib/fsStore.ts (even
 * conditionally/lazily) — Turbopack statically resolves `require()`/
 * `import()` targets regardless of runtime guards, and this file IS
 * reachable from the browser bundle (StaticDemoApp imports it for
 * setStore), which would drag Node's `fs` into the client build and fail
 * it. That's exactly why the "which backend by default" wiring lives in
 * separate files instead of in a fallback branch here.
 */
export function setStore(s: Store) {
  impl = s;
}

export function getStore(): Store {
  if (!impl) {
    throw new Error(
      "No store configured — call setStore() first. The local app does this via lib/serverStoreBootstrap.ts " +
        "(imported by the app/api/* route files); the static demo does this in components/StaticDemoApp.tsx."
    );
  }
  return impl;
}
