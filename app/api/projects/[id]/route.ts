import { NextRequest, NextResponse } from "next/server";
import { loadProject } from "@/lib/store";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const project = loadProject(id);
  if (!project) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  return NextResponse.json(project);
}
