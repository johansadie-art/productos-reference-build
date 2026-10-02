import "@/lib/serverStoreBootstrap";
import { NextRequest, NextResponse } from "next/server";
import { submitIdeateAnswer } from "@/lib/orchestrator";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const answer = typeof body.answer === "string" ? body.answer.trim() : "";
  if (!answer) {
    return NextResponse.json({ error: "answer is required" }, { status: 400 });
  }
  try {
    const project = await submitIdeateAnswer(id, answer);
    return NextResponse.json(project);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 404 });
  }
}
