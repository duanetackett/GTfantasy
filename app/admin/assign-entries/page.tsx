export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import AssignEntriesManager from "./AssignEntriesManager";

export default async function AssignEntriesPage() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") redirect("/dashboard");

  const [rawEntries, users] = await Promise.all([
    prisma.entry.findMany({
      where: {
        userId: null,
        tournament: { status: "COMPLETED" },
      },
      select: {
        id: true,
        entryName: true,
        tournament: { select: { id: true, name: true, year: true } },
      },
    }),
    prisma.user.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, email: true },
    }),
  ]);

  const entries = rawEntries.sort((a, b) =>
    a.entryName.localeCompare(b.entryName, undefined, { sensitivity: "base" })
  );

  return (
    <div>
      <div className="mb-4">
        <Link href="/admin" className="text-sm text-gray-400 hover:text-white transition">
          ← Admin Functions
        </Link>
      </div>
      <h1 className="text-2xl font-bold text-white mb-1">Assign Entries to Users</h1>
      <p className="text-sm text-gray-300 mb-6">
        {entries.length} unassigned entr{entries.length !== 1 ? "ies" : "y"} from completed tournaments
      </p>
      <AssignEntriesManager initialEntries={entries} users={users} />
    </div>
  );
}
