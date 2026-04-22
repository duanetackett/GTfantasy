import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; entryId: string }> }
) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { entryId } = await params;
  const { userId } = await req.json();

  await prisma.entry.update({
    where: { id: entryId },
    data: { userId: userId ?? null },
  });

  return NextResponse.json({ success: true });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; entryId: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { entryId } = await params;

  const entry = await prisma.entry.findUnique({ where: { id: entryId } });
  const isAdmin = session.user.role === "ADMIN";
  if (!entry || (!isAdmin && entry.userId !== session.user.id)) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  await prisma.entry.delete({ where: { id: entryId } });

  return NextResponse.json({ success: true });
}
