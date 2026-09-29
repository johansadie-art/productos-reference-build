import { NextRequest, NextResponse } from "next/server";
import { submitPRDOutlineApproval } from "@/lib/orchestrator";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const project = await submitPRDOutlineApproval(id);
    return NextResponse.json(project);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 404 });
  }
}
