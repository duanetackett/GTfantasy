import { auth as clerkAuth, clerkClient } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function auth() {
  const { userId } = await clerkAuth();
  if (!userId) return null;

  let user = await prisma.user.findUnique({
    where: { clerkId: userId },
    select: { id: true, role: true, name: true, email: true },
  });

  if (!user) {
    const client = await clerkClient();
    const clerkUser = await client.users.getUser(userId);
    const email = clerkUser.emailAddresses.find(
      (e) => e.id === clerkUser.primaryEmailAddressId
    )?.emailAddress;

    if (email) {
      user = await prisma.user.upsert({
        where: { email },
        update: { clerkId: userId },
        create: {
          clerkId: userId,
          name: [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") || "Unknown",
          email,
        },
        select: { id: true, role: true, name: true, email: true },
      });
    }
  }

  if (!user) return null;
  return { user: { id: user.id, role: user.role as string, name: user.name, email: user.email } };
}
