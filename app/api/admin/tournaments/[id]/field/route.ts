import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  type GolferRow = { name: string; hdcp: string; pegtPlayerId?: number | null };
  const { groups } = await req.json() as { groups: GolferRow[][] };

  if (!groups || groups.length !== 8) {
    return NextResponse.json({ error: "Must provide exactly 8 groups." }, { status: 400 });
  }

  const tournament = await prisma.tournament.findUnique({ where: { id } });
  if (!tournament) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Block bulk save if any picks have already been submitted
  if (tournament.status === "PICKS_OPEN") {
    const picksCount = await prisma.pick.count({
      where: { entry: { tournamentId: id } },
    });
    if (picksCount > 0) {
      return NextResponse.json(
        { error: "Picks have already been submitted. Use the per-golfer edit (✏️) to update individual names without deleting picks." },
        { status: 409 }
      );
    }
  }

  // Delete existing groups (cascades to golfers and picks)
  await prisma.group.deleteMany({ where: { tournamentId: id } });

  // Recreate all groups and golfers
  for (let g = 0; g < 8; g++) {
    const golfers = groups[g].filter((r) => r.name.trim() !== "");
    if (golfers.length === 0) continue;

    await prisma.group.create({
      data: {
        tournamentId: id,
        groupNumber: g + 1,
        golfers: {
          create: golfers.map((r) => ({
            name: r.name.trim().toUpperCase(),
            hdcp: r.hdcp !== "" ? parseFloat(r.hdcp) : null,
            pegtPlayerId: r.pegtPlayerId ?? null,
          })),
        },
      },
    });
  }

  return NextResponse.json({ success: true });
}

// PATCH — update a single golfer in-place (preserves all picks)
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const { golferId, name, hdcp, pegtPlayerId } = await req.json() as {
    golferId: string;
    name: string;
    hdcp: string;
    pegtPlayerId?: number | null;
  };

  if (!golferId || !name?.trim()) {
    return NextResponse.json({ error: "golferId and name are required." }, { status: 400 });
  }

  // Verify the golfer belongs to this tournament
  const golfer = await prisma.golfer.findFirst({
    where: { id: golferId, group: { tournamentId: id } },
  });
  if (!golfer) return NextResponse.json({ error: "Golfer not found." }, { status: 404 });

  const updated = await prisma.golfer.update({
    where: { id: golferId },
    data: {
      name: name.trim().toUpperCase(),
      hdcp: hdcp !== "" ? parseFloat(hdcp) : null,
      pegtPlayerId: pegtPlayerId ?? null,
    },
  });

  return NextResponse.json({ success: true, golfer: updated });
}
