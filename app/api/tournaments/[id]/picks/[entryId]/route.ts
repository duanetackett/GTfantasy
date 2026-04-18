import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; entryId: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: tournamentId, entryId } = await params;
  const { picks } = await req.json() as { picks: { groupId: string; golferId: string }[] };

  const tournament = await prisma.tournament.findUnique({ where: { id: tournamentId } });
  if (!tournament || tournament.status !== "PICKS_OPEN") {
    return NextResponse.json({ error: "Tournament is not open for picks." }, { status: 400 });
  }

  const entry = await prisma.entry.findUnique({ where: { id: entryId } });
  if (!entry || entry.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  // Delete existing picks and replace
  await prisma.pick.deleteMany({ where: { entryId } });
  await prisma.pick.createMany({
    data: picks.map(({ groupId, golferId }) => ({ entryId, groupId, golferId })),
  });

  return NextResponse.json({ success: true });
}
