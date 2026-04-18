import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { name, startDate, pegttourSlug } = await req.json();
  if (!name || !startDate) {
    return NextResponse.json({ error: "Name and start date are required." }, { status: 400 });
  }

  const date = new Date(startDate);
  const tournament = await prisma.tournament.create({
    data: {
      name,
      startDate: date,
      year: date.getFullYear(),
      pegttourSlug: pegttourSlug ?? null,
    },
  });

  return NextResponse.json(tournament, { status: 201 });
}
