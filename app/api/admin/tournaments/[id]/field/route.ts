import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  type GolferRow = { name: string; hdcp: string };
  const { groups } = await req.json() as { groups: GolferRow[][] };

  if (!groups || groups.length !== 8) {
    return NextResponse.json({ error: "Must provide exactly 8 groups." }, { status: 400 });
  }

  const tournament = await prisma.tournament.findUnique({ where: { id } });
  if (!tournament) return NextResponse.json({ error: "Not found" }, { status: 404 });

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
            name: r.name.trim(),
            hdcp: r.hdcp !== "" ? parseFloat(r.hdcp) : null,
          })),
        },
      },
    });
  }

  return NextResponse.json({ success: true });
}
