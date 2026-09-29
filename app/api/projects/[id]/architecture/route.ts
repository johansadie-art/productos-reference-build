import { NextRequest, NextResponse } from "next/server";
import { runArchitectureDeepDive } from "@/lib/orchestrator";

// Triggers the OPTIONAL Architect Agent deep-dive (see docs/AGENTS.md) —
// unlike Research/PRD/Design, this does not auto-run in the pipeline.
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const project = await runArchitectureDeepDive(id);
    return NextResponse.json(project);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 400 });
  }
}
