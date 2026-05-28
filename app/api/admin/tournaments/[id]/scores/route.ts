import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { calculateScores, saveScores, type GolferScore } from "@/lib/scoring";
import { prisma } from "@/lib/prisma";

// POST ?action=preview       → calculate from PEGT, return scores (no save)
// POST ?action=save          → calculate from PEGT and persist
// POST ?action=manual-save   → accept scores in body and persist directly
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action") ?? "preview";

  if (action === "manual-save") {
    try {
      const body = await req.json();
      const scores = body.scores as GolferScore[];
      await saveScores(id, scores);
      await prisma.tournament.update({
        where: { id },
        data: { scoresLastCalculatedAt: new Date() },
      });
      return NextResponse.json({ saved: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save scores.";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }

  try {
    const scores = await calculateScores(id);
    const dnpCount = scores.filter(s => s.isDNP).length;
    console.log(`[scores] ${scores.length} golfers, ${dnpCount} DNP`);

    if (action === "save") {
      await saveScores(id, scores);
      await prisma.tournament.update({
        where: { id },
        data: { scoresLastCalculatedAt: new Date() },
      });
      return NextResponse.json({ saved: true, scores });
    }

    return NextResponse.json({ scores });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Scoring failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
