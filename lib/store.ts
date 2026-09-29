import fs from "fs";
import path from "path";
import { ProjectContext } from "./types";

// File-backed store so state survives Next.js dev-server hot reloads / module
// re-instantiation. This is a reference build (single-user, local) — see
// docs/PRD.md A2: Postgres/Supabase is a Next-phase upgrade, not needed now.
const DATA_DIR = path.join(process.cwd(), ".data", "projects");

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function filePath(id: string) {
  return path.join(DATA_DIR, `${id}.json`);
}

export function saveProject(project: ProjectContext) {
  ensureDir();
  fs.writeFileSync(filePath(project.id), JSON.stringify(project, null, 2), "utf-8");
}

export function loadProject(id: string): ProjectContext | null {
  ensureDir();
  const p = filePath(id);
  if (!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, "utf-8")) as ProjectContext;
}

export function listProjects(): ProjectContext[] {
  ensureDir();
  return fs
    .readdirSync(DATA_DIR)
    .filter((f) => f.endsWith(".json"))
    .map((f) => JSON.parse(fs.readFileSync(path.join(DATA_DIR, f), "utf-8")) as ProjectContext)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}
