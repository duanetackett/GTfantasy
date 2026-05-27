import { auth as clerkAuth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function auth() {
  const { userId } = await clerkAuth();
  if (!userId) return null;

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    select: { id: true, role: true, name: true, email: true },
  });

  if (!user) return null;
  return { user: { id: user.id, role: user.role as string, name: user.name, email: user.email } };
}
