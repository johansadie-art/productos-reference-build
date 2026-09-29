import { NextRequest, NextResponse } from "next/server";
import { startPipeline } from "@/lib/orchestrator";
import { listProjects } from "@/lib/store";
import { ensureDemoSeed } from "@/lib/seed";
import { ProjectType } from "@/lib/types";

const VALID_TYPES: ProjectType[] = ["website", "web_app", "mobile_app"];

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const idea = typeof body.idea === "string" ? body.idea.trim() : "";
  if (!idea) {
    return NextResponse.json({ error: "idea is required" }, { status: 400 });
  }
  const projectType: ProjectType = VALID_TYPES.includes(body.projectType) ? body.projectType : "web_app";
  const startStage = typeof body.startStage === "string" ? body.startStage : undefined;
  const category = typeof body.category === "string" && body.category.trim() ? body.category.trim() : undefined;
  const subcategory =
    typeof body.subcategory === "string" && body.subcategory.trim() ? body.subcategory.trim() : undefined;
  const project = startPipeline(idea, projectType, startStage, category, subcategory);
  return NextResponse.json(project);
}

// The home screen is a portfolio dashboard (see docs/PRD.md), not a single
// idea box — auto-seed a fake-banking-app example portfolio the first time
// there are no projects yet, so the dashboard is never empty on first run.
export async function GET() {
  await ensureDemoSeed();
  return NextResponse.json(listProjects());
}
