import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import UserManager from "./UserManager";

export default async function UsersPage() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") redirect("/dashboard");

  const users = await prisma.user.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      lastLoginAt: true,
      _count: { select: { entries: true } },
    },
  });

  return (
    <div>
      <div className="mb-4">
        <Link href="/admin" className="text-sm text-gray-400 hover:text-white transition">
          ← Admin Functions
        </Link>
      </div>
      <h1 className="text-2xl font-bold text-white mb-1">Users</h1>
      <p className="text-sm text-gray-300 mb-6">{users.length} registered user{users.length !== 1 ? "s" : ""}</p>
      <UserManager initialUsers={users} />
    </div>
  );
}
