import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: tournamentId } = await params;
  const { picks, userId, entryNumber, userName } = await req.json();

  const tournament = await prisma.tournament.findUnique({ where: { id: tournamentId } });
  if (!tournament || tournament.status !== "PICKS_OPEN") {
    return NextResponse.json({ error: "Tournament is not open for picks." }, { status: 400 });
  }

  // Count existing entries for this user to generate name
  const existing = await prisma.entry.count({ where: { userId, tournamentId } });
  const num = existing + 1;
  const entryName = num === 1 ? userName : `${userName} #${num}`;

  const entry = await prisma.entry.create({
    data: {
      userId,
      tournamentId,
      entryName,
      picks: picks.length > 0 ? {
        create: picks.map(({ groupId, golferId }: { groupId: string; golferId: string }) => ({
          groupId,
          golferId,
        })),
      } : undefined,
    },
  });

  return NextResponse.json(entry, { status: 201 });
}
