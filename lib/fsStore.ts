import fs from "fs";
import path from "path";
import { ProjectContext } from "./types";
import type { Store } from "./storeProvider";

// File-backed store so state survives Next.js dev-server hot reloads / module
// re-instantiation. This is a reference build (single-user, local) — see
// docs/PRD.md A2: Postgres/Supabase is a Next-phase upgrade, not needed now.
//
// This is the DEFAULT backend (see lib/storeProvider.ts's getStore()) — the
// full local app and its API routes never import this file directly.
const DATA_DIR = path.join(process.cwd(), ".data", "projects");

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function filePath(id: string) {
  return path.join(DATA_DIR, `${id}.json`);
}

export const fsStore: Store = {
  saveProject(project) {
    ensureDir();
    fs.writeFileSync(filePath(project.id), JSON.stringify(project, null, 2), "utf-8");
  },

  loadProject(id): ProjectContext | null {
    ensureDir();
    const p = filePath(id);
    if (!fs.existsSync(p)) return null;
    return JSON.parse(fs.readFileSync(p, "utf-8")) as ProjectContext;
  },

  listProjects(): ProjectContext[] {
    ensureDir();
    return fs
      .readdirSync(DATA_DIR)
      .filter((f) => f.endsWith(".json"))
      .map((f) => JSON.parse(fs.readFileSync(path.join(DATA_DIR, f), "utf-8")) as ProjectContext)
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  },
};
