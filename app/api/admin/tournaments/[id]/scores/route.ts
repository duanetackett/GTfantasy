import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { calculateScores, saveScores } from "@/lib/scoring";
import { prisma } from "@/lib/prisma";

// POST ?action=preview  → calculate only, return scores
// POST ?action=save     → calculate and persist
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action") ?? "preview";

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
