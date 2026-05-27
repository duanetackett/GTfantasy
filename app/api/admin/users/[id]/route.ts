import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { clerkClient } from "@clerk/nextjs/server";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();

  if (body.role !== undefined) {
    if (!["USER", "ADMIN"].includes(body.role)) {
      return NextResponse.json({ error: "Invalid role." }, { status: 400 });
    }

    const user = await prisma.user.update({ where: { id }, data: { role: body.role } });

    if (user.clerkId) {
      const client = await clerkClient();
      await client.users.updateUserMetadata(user.clerkId, {
        publicMetadata: { role: body.role },
      });
    }

    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  if (id === session.user.id) {
    return NextResponse.json({ error: "You cannot delete your own account." }, { status: 400 });
  }

  const user = await prisma.user.delete({ where: { id } });

  if (user.clerkId) {
    const client = await clerkClient();
    await client.users.deleteUser(user.clerkId);
  }

  return NextResponse.json({ ok: true });
}
