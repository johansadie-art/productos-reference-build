import { NextRequest, NextResponse } from "next/server";
import { startPipeline } from "@/lib/orchestrator";
import { listProjects } from "@/lib/store";
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
  const project = startPipeline(idea, projectType, startStage);
  return NextResponse.json(project);
}

export async function GET() {
  return NextResponse.json(listProjects());
}
