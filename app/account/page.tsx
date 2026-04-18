import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import AccountForm from "./AccountForm";

export default async function AccountPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, email: true },
  });

  if (!user) redirect("/login");

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-1">My Account</h1>
      <p className="text-sm text-gray-300 mb-6">Update your name, email, or password.</p>
      <AccountForm user={user} />
    </div>
  );
}
