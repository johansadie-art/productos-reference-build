import { NextRequest, NextResponse } from "next/server";
import { startPipeline } from "@/lib/orchestrator";
import { listProjects } from "@/lib/store";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const idea = typeof body.idea === "string" ? body.idea.trim() : "";
  if (!idea) {
    return NextResponse.json({ error: "idea is required" }, { status: 400 });
  }
  const project = startPipeline(idea);
  return NextResponse.json(project);
}

export async function GET() {
  return NextResponse.json(listProjects());
}
