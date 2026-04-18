import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ entryId: string }> }) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { entryId } = await params;
  const { paid } = await req.json();

  await prisma.entry.update({
    where: { id: entryId },
    data: { paidAt: paid ? new Date() : null },
  });

  return NextResponse.json({ ok: true });
}
