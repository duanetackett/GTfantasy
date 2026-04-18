import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fetchPurpleBracketPositions } from "@/lib/pegt-scraper";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const tournament = await prisma.tournament.findUnique({ where: { id } });
  if (!tournament?.pegttourSlug) return NextResponse.json({ error: "No slug" });

  const { pegttourSlug: slug, year } = tournament;

  const positionMap = await fetchPurpleBracketPositions(year, slug);

  const zeroTwo = [...positionMap.entries()].filter(([, v]) => v === 81).map(([k]) => k);
  const oneTwo = [...positionMap.entries()].filter(([, v]) => v === 65).map(([k]) => k);

  return NextResponse.json({
    totalResolved: positionMap.size,
    zeroTwoCount: zeroTwo.length,
    zeroTwo: zeroTwo.sort(),
    oneTwoCount: oneTwo.length,
    oneTwo: oneTwo.sort(),
  });
}
