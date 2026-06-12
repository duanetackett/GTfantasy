import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { entryIds, userId } = body;

  if (!Array.isArray(entryIds) || entryIds.length === 0) {
    return NextResponse.json({ error: "No entries selected." }, { status: 400 });
  }
  if (!userId) {
    return NextResponse.json({ error: "No user selected." }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, name: true } });
  if (!user) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  const result = await prisma.entry.updateMany({
    where: { id: { in: entryIds }, userId: null },
    data: { userId },
  });

  return NextResponse.json({ ok: true, count: result.count, userName: user.name });
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { entryIds } = body;

  if (!Array.isArray(entryIds) || entryIds.length === 0) {
    return NextResponse.json({ error: "No entries selected." }, { status: 400 });
  }

  const result = await prisma.entry.updateMany({
    where: { id: { in: entryIds }, userId: { not: null } },
    data: { userId: null },
  });

  return NextResponse.json({ ok: true, count: result.count });
}
